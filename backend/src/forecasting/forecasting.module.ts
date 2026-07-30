import { Module } from '@nestjs/common';
import { ForecastingService } from './forecasting.service';
import { BurnRateService } from './burn-rate.service';
import { CashCrunchService } from './cash-crunch.service';
import { ForecastingController } from './forecasting.controller';
import { ExpensesController } from './expenses.controller';

@Module({
  controllers: [ForecastingController, ExpensesController],
  providers: [ForecastingService, BurnRateService, CashCrunchService],
  exports: [ForecastingService, BurnRateService, CashCrunchService],
})
export class ForecastingModule {}
