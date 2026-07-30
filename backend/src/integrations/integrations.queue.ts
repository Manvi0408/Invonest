import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { SyncJobKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SyncService } from './sync/sync.service';
import { OAuthService } from './oauth.service';

type JobData = { integrationId: string; kind?: SyncJobKind };

/**
 * Background jobs for the integrations platform, mirroring the app's existing
 * BullMQ-with-fallback pattern: if REDIS_URL is set we use a real queue/worker,
 * otherwise we run inline via timers so everything still works in local dev.
 *
 * Recurring workers:
 *   - scheduled-sync   : enqueue INCREMENTAL for integrations past nextSyncAt
 *   - refresh-tokens   : refresh OAuth tokens expiring soon
 *   - retry-failed     : re-run FAILED SyncJobs (bounded attempts)
 * On-demand:
 *   - initial-import / incremental / webhook processing
 */
@Injectable()
export class IntegrationsQueue implements OnModuleInit {
  private readonly logger = new Logger(IntegrationsQueue.name);
  private queue?: Queue;
  private worker?: Worker;
  private useFallback = true;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: SyncService,
    private readonly oauth: OAuthService,
  ) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.queue = new Queue('invonest-integrations', { connection: { url: redisUrl } });
        this.worker = new Worker('invonest-integrations', (job: Job) => this.handle(job.name, job.data), {
          connection: { url: redisUrl },
        });
        this.worker.on('failed', (job, err) => this.logger.error(`Integration job ${job?.name} failed: ${err.message}`));
        this.useFallback = false;
        await this.queue.add('scheduled-sync', {}, { repeat: { pattern: '*/5 * * * *' } });
        await this.queue.add('refresh-tokens', {}, { repeat: { pattern: '*/15 * * * *' } });
        await this.queue.add('retry-failed', {}, { repeat: { pattern: '*/10 * * * *' } });
        this.logger.log('Integrations BullMQ workers running.');
      } catch (err: any) {
        this.logger.warn(`Integrations queue: Redis unavailable, using timers. ${err.message}`);
      }
    }
    if (this.useFallback) {
      setInterval(() => this.handle('scheduled-sync', {}).catch(() => {}), 5 * 60_000);
      setInterval(() => this.handle('refresh-tokens', {}).catch(() => {}), 15 * 60_000);
      setInterval(() => this.handle('retry-failed', {}).catch(() => {}), 10 * 60_000);
      this.logger.log('Integrations fallback scheduler (timers) active.');
    }
  }

  /** Enqueue an on-demand job (or run inline in fallback mode). */
  async enqueue(name: 'initial-import' | 'incremental' | 'webhook', data: JobData) {
    if (!this.useFallback && this.queue) {
      await this.queue.add(name, data);
    } else {
      setTimeout(() => this.handle(name, data).catch((e) => this.logger.error(e.message)), 50);
    }
  }

  private async handle(name: string, data: Partial<JobData> = {}) {
    switch (name) {
      case 'initial-import':
        return void (await this.sync.run(data.integrationId!, SyncJobKind.INITIAL_IMPORT));
      case 'incremental':
      case 'webhook':
        return void (await this.sync.run(data.integrationId!, name === 'webhook' ? SyncJobKind.WEBHOOK : SyncJobKind.INCREMENTAL));
      case 'scheduled-sync':
        return this.runScheduledSync();
      case 'refresh-tokens':
        return this.runTokenRefresh();
      case 'retry-failed':
        return this.runRetry();
      default:
        this.logger.warn(`Unknown integration job: ${name}`);
    }
  }

  private async runScheduledSync() {
    const due = await this.prisma.integration.findMany({
      where: { status: { in: ['CONNECTED', 'SYNC_FAILED'] }, nextSyncAt: { lte: new Date() } },
      select: { id: true },
    });
    for (const i of due) await this.enqueue('incremental', { integrationId: i.id });
    if (due.length) this.logger.log(`Scheduled sync enqueued for ${due.length} integrations.`);
  }

  private async runTokenRefresh() {
    const soon = new Date(Date.now() + 10 * 60_000);
    const tokens = await this.prisma.oAuthToken.findMany({
      where: { expiresAt: { lte: soon }, refreshTokenEnc: { not: null } },
      select: { integrationId: true },
    });
    for (const t of tokens) {
      try {
        await this.oauth.refresh(t.integrationId);
      } catch (e: any) {
        this.logger.warn(`Token refresh failed for ${t.integrationId}: ${e.message}`);
      }
    }
  }

  private async runRetry() {
    const failed = await this.prisma.syncJob.findMany({
      where: { status: 'FAILED', attempts: { lt: 3 } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      distinct: ['integrationId'],
      select: { integrationId: true },
    });
    for (const j of failed) await this.enqueue('incremental', { integrationId: j.integrationId });
  }
}
