import { Controller, Post, Get, Body } from '@nestjs/common';
import { AiCopilotService } from './ai-copilot.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/jwt-auth.guard';
import { PlanService } from '../billing/plan.service';
import { PlanLimitException } from '../billing/plan-limit.exception';

/** Credits charged per copilot question. */
const CREDITS_PER_QUERY = 1;

@Controller('ai-copilot')
export class AiCopilotController {
  constructor(
    private readonly copilotService: AiCopilotService,
    private readonly plans: PlanService,
  ) {}

  @Post('ask')
  async ask(@CurrentUser() user: AuthedUser, @Body('query') query: string) {
    // Reserve the credit BEFORE doing the work. consumeCredits() is transactional
    // and returns false rather than letting the balance go negative, so a caller
    // can't get free queries by making the handler fail partway through.
    const charged = await this.plans.consumeCredits(
      user.orgId,
      CREDITS_PER_QUERY,
      `Copilot query: ${(query || '').slice(0, 60)}`,
    );

    if (!charged) {
      const balance = await this.plans.creditBalance(user.orgId);
      throw new PlanLimitException(
        'credits_exhausted',
        "You're out of credits for this month.",
        { resetAt: balance.resetAt },
      );
    }

    const result = await this.copilotService.askCopilot(user.orgId, user.userId, query);
    const after = await this.plans.creditBalance(user.orgId);

    return {
      ...result,
      credits: { remaining: after.total, resetAt: after.resetAt },
    };
  }

  @Get('narrative')
  async getNarrative(@CurrentUser('orgId') orgId: string) {
    return this.copilotService.getFinancialNarrative(orgId);
  }

  @Get('actions')
  async getActions(@CurrentUser('orgId') orgId: string) {
    return this.copilotService.getTodaysActions(orgId);
  }
}
