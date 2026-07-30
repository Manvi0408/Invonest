import { Controller, Post, Get, Param } from '@nestjs/common';
import { RiskEngineService } from './risk-engine.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { OwnershipService } from '../auth/ownership.service';

@Controller('risk-engine')
export class RiskEngineController {
  constructor(
    private readonly riskEngineService: RiskEngineService,
    private readonly ownership: OwnershipService,
  ) {}

  @Post('client/:clientId/health')
  async assessClient(
    @Param('clientId') clientId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    await this.ownership.assertClient(clientId, orgId);
    return this.riskEngineService.calculateClientHealthScore(clientId);
  }

  @Post('invoice/:invoiceId/predict')
  async predictInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    await this.ownership.assertInvoice(invoiceId, orgId);
    return this.riskEngineService.predictInvoiceRisk(invoiceId);
  }

  @Get('heatmap')
  async getHeatmap(@CurrentUser('orgId') orgId: string) {
    return this.riskEngineService.getRevenueRiskHeatmap(orgId);
  }
}
