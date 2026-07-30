import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { ForecastingModule } from '../forecasting/forecasting.module';
import { AutomationModule } from '../automation/automation.module';

@Global()
@Module({
  imports: [RiskEngineModule, ForecastingModule, AutomationModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
