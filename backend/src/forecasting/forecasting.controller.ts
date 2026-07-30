import { Controller, Get, Post, Query, Body, NotFoundException } from '@nestjs/common';
import { ForecastingService } from './forecasting.service';
import { BurnRateService } from './burn-rate.service';
import { CashCrunchService } from './cash-crunch.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { PlanService } from '../billing/plan.service';
import { PlanLimitException } from '../billing/plan-limit.exception';
import { PrismaService } from '../prisma/prisma.service';

@Controller('forecasting')
export class ForecastingController {
  constructor(
    private readonly forecastingService: ForecastingService,
    private readonly burnRate: BurnRateService,
    private readonly cashCrunch: CashCrunchService,
    private readonly plans: PlanService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Runway, and the burn rate behind it. Free on every plan — it's the hook
   * that makes the Premium simulator worth paying for.
   */
  @Get('runway')
  async getRunway(@CurrentUser('orgId') orgId: string) {
    return this.burnRate.getRunway(orgId);
  }

  /**
   * Runs the cash-crunch check for the caller's org immediately, instead of
   * waiting for the hourly sweep. Used by the dashboard and for verification.
   */
  @Post('runway/check-alert')
  async checkCashCrunch(@CurrentUser('orgId') orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found.');
    return this.cashCrunch.checkOrg(org);
  }

  /** Baseline forecast stays available on every plan. */
  @Get()
  async getForecast(
    @CurrentUser('orgId') orgId: string,
    @Query('rangeDays') rangeDays?: string,
  ) {
    const days = rangeDays ? parseInt(rangeDays, 10) : 30;
    return this.forecastingService.getForecast(orgId, days);
  }

  @Post('simulate')
  async simulateScenario(
    @CurrentUser('orgId') orgId: string,
    @Body() body: {
      scenario: string;
      clientName?: string;
      percentageChange?: number;
      valueAmount?: number;
    },
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found.');

    if (!this.plans.hasFeature(org, 'scenario_simulator')) {
      throw new PlanLimitException(
        'scenario_simulator_locked',
        'The Scenario Simulator is a Premium feature. See a 30-second preview of it modelling a client default before you upgrade.',
      );
    }

    return this.forecastingService.runScenarioSimulation(
      orgId,
      body.scenario,
      body.clientName,
      body.percentageChange,
      body.valueAmount,
    );
  }
}
