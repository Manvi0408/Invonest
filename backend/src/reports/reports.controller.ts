import { Controller, Get, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('aging')
  async getAging(@CurrentUser('orgId') orgId: string) {
    return this.reportsService.generateAgingReport(orgId);
  }

  @Post('executive')
  async generateExecutive(@CurrentUser('orgId') orgId: string) {
    return this.reportsService.generateExecutiveWeeklySummary(orgId);
  }
}
