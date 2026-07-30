import { Module } from '@nestjs/common';
import { AiCopilotService } from './ai-copilot.service';
import { GeminiService } from './gemini.service';
import { AiCopilotController } from './ai-copilot.controller';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { ForecastingModule } from '../forecasting/forecasting.module';

@Module({
  imports: [RiskEngineModule, ForecastingModule],
  controllers: [AiCopilotController],
  providers: [AiCopilotService, GeminiService],
  exports: [AiCopilotService],
})
export class AiCopilotModule {}
