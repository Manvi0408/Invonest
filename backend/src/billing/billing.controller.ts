import { Controller, Get, NotFoundException } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { FEATURES, type FeatureKey } from './plan.config';

/**
 * One call that tells the frontend everything it needs to render plan-aware UI:
 * which features are unlocked (lock icons) and where each quota stands (progress bars).
 */
@Controller('billing')
export class BillingController {
  constructor(
    private readonly plans: PlanService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('plan')
  async getPlan(@CurrentUser('orgId') orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found.');

    const [invoiceUpload, teamSeat, credits] = await Promise.all([
      this.plans.remainingQuota(org, 'invoice_upload'),
      this.plans.remainingQuota(org, 'team_seat'),
      this.plans.creditBalance(org),
    ]);

    const features = Object.fromEntries(
      (Object.keys(FEATURES) as FeatureKey[]).map((k) => [k, this.plans.hasFeature(org, k)]),
    ) as Record<FeatureKey, boolean>;

    return {
      plan: org.plan,
      planStatus: org.planStatus,
      quotaResetAt: org.quotaResetAt,
      dataRetentionDays: this.plans.dataRetentionDays(org),
      features,
      quotas: {
        invoice_upload: invoiceUpload,
        team_seat: teamSeat,
        chatbot_credits: {
          used: credits.grantLimit === null ? 0 : credits.grantLimit - credits.grantRemaining,
          limit: credits.grantLimit,
          remaining: credits.grantLimit === null ? null : credits.grantRemaining,
          topupBalance: credits.topupBalance,
          unlimited: credits.grantLimit === null,
        },
      },
    };
  }
}
