import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Integration, ProviderKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OAuthService } from './oauth.service';
import { ALL_PROVIDERS, PROVIDERS, ProviderDef, isConfigured, missingEnv } from './providers';

/**
 * Orchestrates the connection lifecycle across all providers. The controller
 * stays thin; provider-specific auth lives in OAuthService and the sync engine.
 */
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: OAuthService,
  ) {}

  /** All 8 providers merged with this org's live connection state, for the UI. */
  async listForOrg(orgId: string) {
    const rows = await this.prisma.integration.findMany({
      where: { organizationId: orgId },
      include: { accounts: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
    const byKey = new Map(rows.map((r) => [r.provider, r]));

    return ALL_PROVIDERS.map((def) => {
      const row = byKey.get(def.key);
      return {
        provider: def.key,
        name: def.name,
        category: def.category,
        description: def.description,
        authType: def.authType,
        brandColor: def.brandColor,
        syncs: def.syncs,
        supportsWebhooks: def.webhooks,
        configured: isConfigured(def),
        missingEnv: isConfigured(def) ? [] : missingEnv(def),
        status: row?.status ?? 'NOT_CONNECTED',
        connectedAccount: row?.accounts?.[0]?.displayName ?? row?.accounts?.[0]?.email ?? null,
        lastSyncedAt: row?.lastSyncedAt ?? null,
        nextSyncAt: row?.nextSyncAt ?? null,
        error: row?.error ?? null,
        integrationId: row?.id ?? null,
      };
    });
  }

  private def(provider: ProviderKey): ProviderDef {
    return PROVIDERS[provider];
  }

  async getOrCreate(orgId: string, provider: ProviderKey): Promise<Integration> {
    const existing = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId: orgId, provider } },
    });
    if (existing) return existing;
    return this.prisma.integration.create({
      data: { organizationId: orgId, provider, status: 'NOT_CONNECTED', scopes: this.def(provider).oauth?.scopes ?? [] },
    });
  }

  /**
   * Begin a connection.
   *  - OAuth providers: returns an authorize URL to open (status → AUTHORIZING).
   *  - API-key providers (Stripe/Razorpay): the keys are server-side env secrets,
   *    so "connect" verifies they're present and flips to CONNECTED.
   * When a provider isn't configured yet, returns { configured:false } with the
   * exact env vars to set — so the button is tappable and informative today.
   */
  async connect(orgId: string, provider: ProviderKey) {
    const def = this.def(provider);
    const integration = await this.getOrCreate(orgId, provider);

    if (!isConfigured(def)) {
      return { configured: false, missingEnv: missingEnv(def), authType: def.authType };
    }

    if (def.authType === 'oauth2') {
      await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'AUTHORIZING', error: null } });
      const authorizeUrl = this.oauth.buildAuthorizeUrl(integration);
      return { configured: true, authType: 'oauth2', authorizeUrl };
    }

    // API-key provider — env keys present, mark connected.
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { status: 'CONNECTED', error: null, scopes: def.syncs },
    });
    await this.prisma.syncLog.create({ data: { integrationId: integration.id, level: 'INFO', message: `${def.name} connected via API key.` } });
    return { configured: true, authType: 'apikey', status: 'CONNECTED', integrationId: integration.id };
  }

  async disconnect(orgId: string, provider: ProviderKey) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId: orgId, provider } },
    });
    if (!integration) throw new NotFoundException('Integration not found.');
    await this.prisma.oAuthToken.deleteMany({ where: { integrationId: integration.id } });
    await this.prisma.integration.update({ where: { id: integration.id }, data: { status: 'DISCONNECTED', error: null } });
    await this.prisma.syncLog.create({ data: { integrationId: integration.id, level: 'INFO', message: `${this.def(provider).name} disconnected.` } });
    return { status: 'DISCONNECTED' };
  }

  async requireConnected(orgId: string, provider: ProviderKey): Promise<Integration> {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId: orgId, provider } },
    });
    if (!integration || ['NOT_CONNECTED', 'DISCONNECTED'].includes(integration.status)) {
      throw new BadRequestException(`${this.def(provider).name} is not connected.`);
    }
    return integration;
  }

  async logs(orgId: string, provider: ProviderKey) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId: orgId, provider } },
    });
    if (!integration) return { jobs: [], logs: [] };
    const [jobs, logs] = await Promise.all([
      this.prisma.syncJob.findMany({ where: { integrationId: integration.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.syncLog.findMany({ where: { integrationId: integration.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
    ]);
    return { jobs, logs };
  }
}
