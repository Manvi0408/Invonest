import { Controller, Get, Post, Param, Query, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { SyncJobKind } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from './integrations.service';
import { OAuthService } from './oauth.service';
import { IntegrationsQueue } from './integrations.queue';
import { providerFromSlug, PROVIDERS } from './providers';

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:3000';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
    private readonly oauth: OAuthService,
    private readonly queue: IntegrationsQueue,
  ) {}

  private resolve(slug: string) {
    const def = providerFromSlug(slug);
    if (!def) throw new BadRequestException(`Unknown provider "${slug}".`);
    return def;
  }

  /** All providers + this org's live connection state. */
  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.integrations.listForOrg(user.orgId);
  }

  /** Start a connection — returns an OAuth authorize URL or flips API-key providers to connected. */
  @Post(':provider/connect')
  connect(@CurrentUser() user: AuthedUser, @Param('provider') provider: string) {
    return this.integrations.connect(user.orgId, this.resolve(provider).key);
  }

  /** Trigger a manual sync. First run is a full initial import; later runs are incremental. */
  @Post(':provider/sync')
  async sync(@CurrentUser() user: AuthedUser, @Param('provider') provider: string) {
    const integration = await this.integrations.requireConnected(user.orgId, this.resolve(provider).key);
    const kind = integration.lastSyncedAt ? 'incremental' : 'initial-import';
    await this.queue.enqueue(kind as any, { integrationId: integration.id });
    return { queued: true, kind };
  }

  @Post(':provider/disconnect')
  disconnect(@CurrentUser() user: AuthedUser, @Param('provider') provider: string) {
    return this.integrations.disconnect(user.orgId, this.resolve(provider).key);
  }

  @Get(':provider/logs')
  logs(@CurrentUser() user: AuthedUser, @Param('provider') provider: string) {
    return this.integrations.logs(user.orgId, this.resolve(provider).key);
  }

  /**
   * OAuth 2.0 redirect target. Public (the provider's browser redirect carries
   * no bearer token); the signed `state` binds the callback to the integration
   * that started the flow. On success we exchange the code, kick off the initial
   * import, and bounce the user back to the Integrations page.
   */
  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('realmId') realmId: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const def = this.resolve(provider);
    const back = (qs: string) => res.redirect(`${FRONTEND()}/dashboard/integrations?${qs}`);
    if (error) return back(`error=${encodeURIComponent(error)}&provider=${def.key}`);
    if (!code || !state) return back(`error=missing_code&provider=${def.key}`);

    try {
      const integrationId = this.oauth.verifyState(state);
      const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
      if (!integration || integration.provider !== def.key) throw new BadRequestException('State/provider mismatch.');

      await this.oauth.exchangeCode(integration, code, { realmId: realmId ?? '' });
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'CONNECTED', error: null, scopes: def.oauth?.scopes ?? [] },
      });
      await this.prisma.connectedAccount.create({
        data: { integrationId: integration.id, externalId: realmId || 'oauth', displayName: `${def.name} account` },
      });
      await this.prisma.syncLog.create({ data: { integrationId: integration.id, level: 'INFO', message: `${def.name} authorized.` } });
      await this.queue.enqueue('initial-import', { integrationId: integration.id });
      return back(`connected=${def.key}`);
    } catch (e: any) {
      return back(`error=${encodeURIComponent(e?.message || 'oauth_failed')}&provider=${def.key}`);
    }
  }
}
