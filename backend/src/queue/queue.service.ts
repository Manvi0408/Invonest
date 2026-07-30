import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import * as QueueMQ from 'bullmq';
import { ReminderChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { ForecastingService } from '../forecasting/forecasting.service';
import { AutomationService } from '../automation/automation.service';
import { PlanService } from '../billing/plan.service';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private queue: Queue;
  private worker: Worker;
  private useFallback = true;

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskEngine: RiskEngineService,
    private readonly forecasting: ForecastingService,
    private readonly automation: AutomationService,
    private readonly plans: PlanService,
  ) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        this.logger.log(`Attempting to initialize BullMQ with Redis at ${redisUrl}...`);
        this.queue = new Queue('invonest-jobs', {
          connection: { url: redisUrl },
        });

        this.worker = new Worker(
          'invonest-jobs',
          async (job: Job) => {
            await this.processJob(job.name, job.data);
          },
          { connection: { url: redisUrl } },
        );

        this.worker.on('completed', (job) => {
          this.logger.log(`Job ${job.id} of type ${job.name} finished successfully.`);
        });

        this.worker.on('failed', (job, err) => {
          this.logger.error(`Job ${job?.id} of type ${job?.name} failed: ${err.message}`);
        });

        this.useFallback = false;
        this.logger.log('BullMQ queues and workers running.');

        // Schedule recurring jobs (Every night/hour)
        await this.queue.add('risk-recalculation', {}, { repeat: { pattern: '0 2 * * *' } });
        await this.queue.add('forecast-generator', {}, { repeat: { pattern: '0 3 * * *' } });
      } catch (err) {
        this.logger.warn(`Failed to connect to Redis. Falling back to background polling: ${err.message}`);
      }
    }

    if (this.useFallback) {
      this.logger.log('Fallback Scheduler activated. Initiating polling tickers for background tasks...');
      this.runFallbackTickers();
    }
  }

  private runFallbackTickers() {
    // Recalculate risks and forecasts every 10 minutes locally for demo purposes
    setInterval(async () => {
      this.logger.log('[Fallback Queue Worker] Starting scheduled background tasks...');
      try {
        await this.processJob('risk-recalculation', {});
        await this.processJob('forecast-generator', {});
      } catch (err) {
        this.logger.error(`Fallback scheduler failed: ${err.message}`);
      }
    }, 10 * 60 * 1000);
  }

  async addJob(name: string, data: any) {
    if (!this.useFallback && this.queue) {
      await this.queue.add(name, data);
    } else {
      this.logger.log(`[Fallback Queue Worker] Enqueued direct task: ${name}`);
      // Asynchronously process task immediately in fallback mode
      setTimeout(() => this.processJob(name, data).catch((e) => this.logger.error(e)), 100);
    }
  }

  private async processJob(name: string, data: any) {
    this.logger.log(`Processing job: ${name}`);
    switch (name) {
      case 'risk-recalculation':
        await this.runRiskRecalculation();
        break;

      case 'forecast-generator':
        // Generate new cash flow forecasts for active organizations
        const orgs = await this.prisma.organization.findMany({ select: { id: true } });
        for (const org of orgs) {
          await this.forecasting.getForecast(org.id, 30);
        }
        this.logger.log(`Generated active forecast snapshots for ${orgs.length} orgs.`);
        break;

      case 'reminder-scheduler':
        await this.runReminderScheduler();
        break;

      default:
        this.logger.warn(`Job handler for ${name} is not registered.`);
    }
  }

  /**
   * Risk is recomputed for everyone on every run — the difference is how often the
   * result is *written*. Premium sees a fresh score nightly; Free has its score
   * persisted once a week, so the number they see is deliberately (and visibly)
   * stale rather than silently degraded. The UI reads RiskPrediction.updatedAt to
   * render "Updated X ago".
   */
  private async runRiskRecalculation() {
    const orgs = await this.prisma.organization.findMany({
      select: { id: true, plan: true, invoiceUploadLimit: true, teamSeatLimit: true, chatbotCreditLimit: true, dataRetentionDays: true },
    });

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let written = 0;
    let skipped = 0;

    for (const org of orgs) {
      const liveScoring = this.plans.hasFeature(org as any, 'live_risk_scoring');

      const clients = await this.prisma.client.findMany({
        where: { organizationId: org.id },
        select: { id: true },
      });
      for (const client of clients) {
        await this.riskEngine.calculateClientHealthScore(client.id);
      }

      const invoices = await this.prisma.invoice.findMany({
        where: { organizationId: org.id, status: { notIn: ['PAID', 'DRAFT'] } },
        select: { id: true, riskPrediction: { select: { updatedAt: true } } },
      });

      for (const invoice of invoices) {
        if (!liveScoring) {
          const lastWrite = invoice.riskPrediction?.updatedAt;
          // Free plan: hold the previous score until a week has elapsed.
          if (lastWrite && now - lastWrite.getTime() < WEEK_MS) {
            skipped++;
            continue;
          }
        }
        await this.riskEngine.predictInvoiceRisk(invoice.id);
        written++;
      }
    }

    this.logger.log(
      `Risk recalculation complete across ${orgs.length} orgs — ${written} scores written, ${skipped} held (free-plan weekly batch).`,
    );
  }

  /**
   * Free plan gets one fixed nudge 7 days before the due date.
   * Premium gets the escalating ladder: day -7 email, day 0 email, day +7 WhatsApp.
   */
  private async runReminderScheduler() {
    const now = new Date();

    const dueReminders = await this.prisma.reminder.findMany({
      where: { status: 'SCHEDULED', scheduledFor: { lte: now } },
      select: { id: true },
    });
    for (const reminder of dueReminders) {
      await this.automation.triggerReminderExecution(reminder.id);
    }

    const orgs = await this.prisma.organization.findMany({
      select: { id: true, plan: true, invoiceUploadLimit: true, teamSeatLimit: true, chatbotCreditLimit: true, dataRetentionDays: true },
    });

    let scheduled = 0;

    for (const org of orgs) {
      const ladder = this.plans.hasFeature(org as any, 'auto_escalation_ladder');

      // Premium escalates through channels; free gets the single pre-due nudge.
      const steps: Array<{ offsetDays: number; channel: ReminderChannel }> = ladder
        ? [
            { offsetDays: -7, channel: ReminderChannel.EMAIL },
            { offsetDays: 0, channel: ReminderChannel.EMAIL },
            { offsetDays: 7, channel: ReminderChannel.WHATSAPP },
          ]
        : [{ offsetDays: -7, channel: ReminderChannel.EMAIL }];

      const invoices = await this.prisma.invoice.findMany({
        where: { organizationId: org.id, status: { notIn: ['PAID', 'DRAFT'] } },
        select: { id: true, dueDate: true, reminders: { select: { scheduledFor: true, channel: true } } },
      });

      for (const invoice of invoices) {
        for (const step of steps) {
          const fireAt = new Date(invoice.dueDate);
          fireAt.setDate(fireAt.getDate() + step.offsetDays);
          if (fireAt < now) continue; // window already passed

          // Idempotency: never double-book the same rung of the ladder.
          const already = invoice.reminders.some(
            (r) =>
              r.channel === step.channel &&
              Math.abs(r.scheduledFor.getTime() - fireAt.getTime()) < 12 * 60 * 60 * 1000,
          );
          if (already) continue;

          await this.prisma.reminder.create({
            data: {
              invoiceId: invoice.id,
              channel: step.channel,
              scheduledFor: fireAt,
              status: 'SCHEDULED',
            },
          });
          scheduled++;
        }
      }
    }

    this.logger.log(
      `Reminder scheduler: executed ${dueReminders.length} due, queued ${scheduled} new across ${orgs.length} orgs.`,
    );
  }
}
