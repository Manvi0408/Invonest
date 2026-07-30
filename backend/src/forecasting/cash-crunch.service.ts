import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BurnRateService } from './burn-rate.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Proactive cash-crunch alerting (5c).
 *
 * Polls each org's runway and raises a notification when it drops below that
 * org's configured threshold — so the owner is told, rather than having to
 * open the dashboard and notice.
 *
 * Depends on the Transaction/CashAccount model; orgs with no cash ledger yield
 * `runwayMonths: null` and are skipped rather than alerted on a guess.
 *
 * DELIVERY LIMITATION: only the in-app notification is real. Email and
 * WhatsApp are not wired — no mail transport is installed, and the WhatsApp
 * path in AutomationService is a simulated dispatch. `deliverExternal()` marks
 * where those go; it deliberately does nothing rather than logging a fake send.
 */
@Injectable()
export class CashCrunchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CashCrunchService.name);
  private timer: NodeJS.Timeout | null = null;

  /** Re-alerting is suppressed for this long after a fire. */
  private static readonly REALERT_COOLDOWN_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly burnRate: BurnRateService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    // Hourly. Runway moves on the scale of days, so this is ample, and it keeps
    // the job cheap on a single-connection PGlite dev database.
    this.timer = setInterval(() => {
      this.sweep().catch((e) => this.logger.error(`Cash-crunch sweep failed: ${e?.message}`));
    }, 60 * 60 * 1000);
    // Unref so an idle timer can't hold the process open during shutdown.
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Checks every org. Exposed so it can be triggered on demand and tested. */
  async sweep(): Promise<Array<{ orgId: string; runwayMonths: number | null; alerted: boolean }>> {
    const orgs = await this.prisma.organization.findMany({
      select: { id: true, name: true, runwayAlertMonths: true, runwayAlertedAt: true },
    });

    const results = [];
    for (const org of orgs) {
      results.push(await this.checkOrg(org));
    }
    return results;
  }

  async checkOrg(org: {
    id: string;
    name: string;
    runwayAlertMonths: number;
    runwayAlertedAt: Date | null;
  }) {
    const runway = await this.burnRate.getRunway(org.id);

    // No runway figure means no honest basis for an alert. Cash-flow-positive
    // orgs land here too, which is correct — they have no crunch to warn about.
    if (runway.runwayMonths === null) {
      return { orgId: org.id, runwayMonths: null, alerted: false };
    }

    const threshold = org.runwayAlertMonths ?? 2;
    if (runway.runwayMonths > threshold) {
      // Recovered — clear the marker so a future dip alerts again immediately.
      if (org.runwayAlertedAt) {
        await this.prisma.organization.update({
          where: { id: org.id },
          data: { runwayAlertedAt: null },
        });
      }
      return { orgId: org.id, runwayMonths: runway.runwayMonths, alerted: false };
    }

    // Below threshold. Suppress if we already said so recently — a daily nag
    // gets muted, and a muted alert is worse than no alert.
    const cooledDown =
      !org.runwayAlertedAt ||
      Date.now() - org.runwayAlertedAt.getTime() >
        CashCrunchService.REALERT_COOLDOWN_HOURS * 3600_000;
    if (!cooledDown) {
      return { orgId: org.id, runwayMonths: runway.runwayMonths, alerted: false };
    }

    const money = (n: number | null) => `₹${Math.round(n ?? 0).toLocaleString('en-IN')}`;
    const message =
      `Runway is down to ${runway.runwayMonths} months — below your ${threshold}-month alert threshold. ` +
      `Net burn is ${money(runway.netBurn)}/month against ${money(runway.cashPosition)} in cash. ` +
      `Chasing overdue invoices or trimming recurring costs will extend it.`;

    await this.notifications.createNotification(
      org.id,
      'Cash-crunch warning',
      message,
      'WARNING',
    );

    await this.deliverExternal(org.id, 'Cash-crunch warning', message);

    await this.prisma.organization.update({
      where: { id: org.id },
      data: { runwayAlertedAt: new Date() },
    });

    return { orgId: org.id, runwayMonths: runway.runwayMonths, alerted: true };
  }

  /**
   * Email / WhatsApp delivery hook — NOT IMPLEMENTED.
   *
   * No mail transport is installed and the WhatsApp integration is simulated,
   * so there is nothing to send through. This logs at debug and returns; it
   * does not pretend to have delivered anything. Wire a real transport here.
   */
  private async deliverExternal(orgId: string, title: string, body: string): Promise<void> {
    this.logger.debug(
      `External delivery not configured — in-app notification only for org ${orgId}: ${title}`,
    );
  }
}
