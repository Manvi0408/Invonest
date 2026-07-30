import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ProviderKey, Integration } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { PROVIDERS, ProviderDef, redirectUri, isConfigured } from './providers';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  realmId?: string;
  [k: string]: any;
}

/**
 * Generic OAuth 2.0 authorization-code flow shared by all six OAuth providers.
 * Provider-specific quirks (Basic vs body client auth, Meta's GET token
 * endpoint, QuickBooks' realmId) are handled inline. Tokens are always stored
 * encrypted; access tokens are refreshed automatically when they expire.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  // --- state: HMAC-signed so the public callback can't be spoofed ----------
  private signState(integrationId: string): string {
    const nonce = crypto.randomBytes(8).toString('hex');
    const body = `${integrationId}.${nonce}.${Date.now()}`;
    const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'invonest-dev-secret').update(body).digest('base64url');
    return Buffer.from(`${body}.${sig}`).toString('base64url');
  }

  verifyState(state: string): string {
    let decoded: string;
    try {
      decoded = Buffer.from(state, 'base64url').toString('utf8');
    } catch {
      throw new BadRequestException('Invalid OAuth state.');
    }
    const parts = decoded.split('.');
    if (parts.length !== 4) throw new BadRequestException('Invalid OAuth state.');
    const [integrationId, nonce, ts, sig] = parts;
    const expected = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'invonest-dev-secret')
      .update(`${integrationId}.${nonce}.${ts}`)
      .digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new BadRequestException('OAuth state signature mismatch.');
    }
    if (Date.now() - Number(ts) > 15 * 60 * 1000) throw new BadRequestException('OAuth state expired.');
    return integrationId;
  }

  buildAuthorizeUrl(integration: Integration): string {
    const def = PROVIDERS[integration.provider];
    if (!def.oauth) throw new BadRequestException(`${def.name} does not use OAuth.`);
    if (!isConfigured(def)) throw new BadRequestException(`${def.name} is not configured on this server.`);

    const clientId = process.env[def.env.clientId!]!;
    const url = new URL(def.oauth.authorizeUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri(def.key));
    url.searchParams.set('scope', def.oauth.scopes.join(' '));
    url.searchParams.set('state', this.signState(integration.id));
    for (const [k, v] of Object.entries(def.oauth.extraAuthParams || {})) url.searchParams.set(k, v);
    return url.toString();
  }

  // --- token exchange ------------------------------------------------------
  private basicAuth(def: ProviderDef): string {
    const id = process.env[def.env.clientId!]!;
    const secret = process.env[def.env.clientSecret!]!;
    return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
  }

  private usesBasicAuth(key: ProviderKey): boolean {
    return key === 'QUICKBOOKS' || key === 'XERO';
  }

  async exchangeCode(integration: Integration, code: string, extra: Record<string, string> = {}): Promise<void> {
    const def = PROVIDERS[integration.provider];
    if (!def.oauth) throw new BadRequestException(`${def.name} does not use OAuth.`);
    const token = await this.requestToken(def, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(def.key),
    });
    // QuickBooks returns the company id as `realmId` on the callback query, not
    // in the token body — the caller passes it through `extra`.
    await this.persistToken(integration.id, token, extra.realmId);
  }

  private async requestToken(def: ProviderDef, params: Record<string, string>): Promise<TokenResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
    const body: Record<string, string> = { ...params };

    if (this.usesBasicAuth(def.key)) {
      headers.Authorization = this.basicAuth(def);
    } else {
      body.client_id = process.env[def.env.clientId!]!;
      body.client_secret = process.env[def.env.clientSecret!]!;
    }

    // Meta exchanges tokens over GET with query params.
    if (def.key === 'WHATSAPP') {
      const url = new URL(def.oauth!.tokenUrl);
      for (const [k, v] of Object.entries(body)) if (k !== 'grant_type') url.searchParams.set(k, v);
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new BadRequestException(json?.error?.message || `Meta token exchange failed (${res.status}).`);
      return json;
    }

    const res = await fetch(def.oauth!.tokenUrl, { method: 'POST', headers, body: new URLSearchParams(body).toString() });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error_description || json?.error || json?.message || `Token exchange failed (${res.status}).`;
      throw new BadRequestException(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return json;
  }

  private async persistToken(integrationId: string, token: TokenResponse, realmId?: string): Promise<void> {
    const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
    // Non-secret discovery fields some providers return with the token and that
    // the sync layer needs (Salesforce instance_url, Zoho api_domain, etc.).
    const meta: Record<string, any> = {};
    for (const k of ['instance_url', 'api_domain', 'id_token', 'x_refresh_token_expires_in']) {
      if (token[k] !== undefined) meta[k] = token[k];
    }
    const data = {
      accessTokenEnc: this.crypto.encrypt(token.access_token),
      refreshTokenEnc: token.refresh_token ? this.crypto.encrypt(token.refresh_token) : null,
      tokenType: token.token_type ?? null,
      scope: token.scope ?? null,
      expiresAt,
      realmId: realmId ?? token.realmId ?? null,
      meta: Object.keys(meta).length ? meta : undefined,
    };
    await this.prisma.oAuthToken.upsert({
      where: { integrationId },
      create: { integrationId, ...data },
      update: data,
    });
  }

  /**
   * Returns a valid, decrypted access token — transparently refreshing it when
   * it has expired (or is within 60s of doing so). Throws if the integration
   * has no token or the refresh fails, so callers surface a reconnect prompt.
   */
  async getValidAccessToken(integrationId: string): Promise<string> {
    const rec = await this.prisma.oAuthToken.findUnique({ where: { integrationId } });
    if (!rec) throw new BadRequestException('This integration is not connected.');
    const fresh = !rec.expiresAt || rec.expiresAt.getTime() - Date.now() > 60_000;
    if (fresh) {
      const tok = this.crypto.tryDecrypt(rec.accessTokenEnc);
      if (tok) return tok;
    }
    return this.refresh(integrationId);
  }

  async refresh(integrationId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId }, include: { oauthToken: true } });
    if (!integration?.oauthToken?.refreshTokenEnc) throw new BadRequestException('No refresh token — reconnect required.');
    const def = PROVIDERS[integration.provider];
    const refreshToken = this.crypto.tryDecrypt(integration.oauthToken.refreshTokenEnc);
    if (!refreshToken) throw new BadRequestException('Stored token is unreadable — reconnect required.');

    const token = await this.requestToken(def, { grant_type: 'refresh_token', refresh_token: refreshToken });
    // Some providers rotate the refresh token; keep the old one if none returned.
    if (!token.refresh_token) token.refresh_token = refreshToken;
    await this.persistToken(integrationId, token, integration.oauthToken.realmId ?? undefined);
    this.logger.log(`Refreshed ${def.name} token for integration ${integrationId}.`);
    return token.access_token;
  }
}
