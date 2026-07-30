import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Organization, Plan, CreditTxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PLAN_LIMITS,
  FEATURES,
  QUOTA_OVERRIDE_COLUMN,
  type FeatureKey,
  type QuotaKey,
} from './plan.config';

export interface QuotaResult {
  used: number;
  /** null = unlimited */
  limit: number | null;
  /** null = unlimited */
  remaining: number | null;
  unlimited: boolean;
}

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Boolean capability check. Synchronous — callers already hold the org.
   */
  hasFeature(org: Pick<Organization, 'plan'>, feature: FeatureKey): boolean {
    const allowed = FEATURES[feature] as readonly Plan[];
    return allowed.includes(org.plan);
  }

  /** Effective limit for a quota: per-org override wins, else the plan default. */
  limitFor(org: Organization, key: QuotaKey): number | null {
    const override = org[QUOTA_OVERRIDE_COLUMN[key]] as number | null;
    if (override !== null && override !== undefined) return override;
    return PLAN_LIMITS[org.plan][key];
  }

  dataRetentionDays(org: Organization): number | null {
    if (org.dataRetentionDays !== null && org.dataRetentionDays !== undefined) {
      return org.dataRetentionDays;
    }
    return PLAN_LIMITS[org.plan].data_retention_days;
  }

  /**
   * Numeric quota check, for caps that render as a progress bar rather than a lock.
   *
   * Rolls the monthly window forward lazily on read, so a missed cron can never
   * leave an org stuck at its cap.
   */
  async remainingQuota(orgOrId: Organization | string, key: QuotaKey): Promise<QuotaResult> {
    let org = typeof orgOrId === 'string' ? await this.getOrg(orgOrId) : orgOrId;
    org = await this.rollMonthlyWindowIfDue(org);

    const limit = this.limitFor(org, key);
    const used = await this.usageFor(org, key);

    if (limit === null) {
      return { used, limit: null, remaining: null, unlimited: true };
    }
    return { used, limit, remaining: Math.max(0, limit - used), unlimited: false };
  }

  private async usageFor(org: Organization, key: QuotaKey): Promise<number> {
    switch (key) {
      case 'invoice_upload':
        return org.invoiceUploadCount;
      case 'chatbot_credits':
        return org.chatbotCreditsUsed;
      case 'team_seat':
        // Seats aren't a counter — they're live membership rows.
        return this.prisma.membership.count({ where: { organizationId: org.id } });
    }
  }

  /**
   * Credits available right now = unused monthly grant + carried-over top-ups.
   *
   * Top-ups deliberately survive the monthly reset; only the grant expires.
   */
  async creditBalance(orgOrId: Organization | string): Promise<{
    grantRemaining: number;
    topupBalance: number;
    total: number;
    grantLimit: number | null;
    resetAt: Date;
  }> {
    let org = typeof orgOrId === 'string' ? await this.getOrg(orgOrId) : orgOrId;
    org = await this.rollMonthlyWindowIfDue(org);

    const grantLimit = this.limitFor(org, 'chatbot_credits');
    const grantRemaining =
      grantLimit === null ? Number.MAX_SAFE_INTEGER : Math.max(0, grantLimit - org.chatbotCreditsUsed);

    return {
      grantRemaining,
      topupBalance: org.topupCreditBalance,
      total: grantLimit === null ? Number.MAX_SAFE_INTEGER : grantRemaining + org.topupCreditBalance,
      grantLimit,
      resetAt: org.quotaResetAt,
    };
  }

  /**
   * Spend credits: the monthly grant is drawn down first, then top-ups.
   * Returns false (and writes nothing) if the balance can't cover the spend.
   */
  async consumeCredits(orgId: string, amount: number, description?: string): Promise<boolean> {
    if (amount <= 0) return true;

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: orgId } });
      if (!org) throw new NotFoundException('Organization not found.');

      const grantLimit = this.limitFor(org, 'chatbot_credits');
      if (grantLimit === null) {
        await this.writeLedger(tx, org.id, CreditTxType.USAGE, -amount, Number.MAX_SAFE_INTEGER, description);
        return true;
      }

      const grantRemaining = Math.max(0, grantLimit - org.chatbotCreditsUsed);
      if (grantRemaining + org.topupCreditBalance < amount) return false;

      const fromGrant = Math.min(grantRemaining, amount);
      const fromTopup = amount - fromGrant;

      const updated = await tx.organization.update({
        where: { id: org.id },
        data: {
          chatbotCreditsUsed: { increment: fromGrant },
          topupCreditBalance: { decrement: fromTopup },
        },
      });

      const balanceAfter =
        Math.max(0, grantLimit - updated.chatbotCreditsUsed) + updated.topupCreditBalance;
      await this.writeLedger(tx, org.id, CreditTxType.USAGE, -amount, balanceAfter, description);
      return true;
    });
  }

  /** Record a purchased top-up. These never expire on the monthly reset. */
  async addTopup(orgId: string, amount: number, description?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: orgId },
        data: { topupCreditBalance: { increment: amount } },
      });
      const grantLimit = this.limitFor(org, 'chatbot_credits');
      const balanceAfter =
        (grantLimit === null ? 0 : Math.max(0, grantLimit - org.chatbotCreditsUsed)) +
        org.topupCreditBalance;
      await this.writeLedger(tx, orgId, CreditTxType.TOPUP_PURCHASE, amount, balanceAfter, description);
    });
  }

  /** Atomic increment used by the invoice-upload enforcement point. */
  async incrementInvoiceUploads(orgId: string, by = 1): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { invoiceUploadCount: { increment: by } },
    });
  }

  /**
   * If the billing month has elapsed, zero the per-period counters and post the
   * new monthly grant. Top-up balance is left untouched by design.
   */
  private async rollMonthlyWindowIfDue(org: Organization): Promise<Organization> {
    const now = new Date();
    const nextReset = new Date(org.quotaResetAt);
    nextReset.setMonth(nextReset.getMonth() + 1);
    if (now < nextReset) return org;

    const grantLimit = this.limitFor(org, 'chatbot_credits');
    this.logger.log(`Rolling monthly quota window for org ${org.id} (plan ${org.plan}).`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: org.id },
        data: { invoiceUploadCount: 0, chatbotCreditsUsed: 0, quotaResetAt: now },
      });
      await this.writeLedger(
        tx,
        org.id,
        CreditTxType.MONTHLY_GRANT,
        grantLimit ?? 0,
        (grantLimit ?? 0) + updated.topupCreditBalance,
        'Monthly credit grant',
      );
      return updated;
    });
  }

  private async writeLedger(
    tx: any,
    organizationId: string,
    type: CreditTxType,
    amount: number,
    balanceAfter: number,
    description?: string,
  ) {
    await tx.creditTransaction.create({
      data: { organizationId, type, amount, balanceAfter, description },
    });
  }

  private async getOrg(id: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found.');
    return org;
  }
}
