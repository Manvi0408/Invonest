import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { ReminderService } from './reminder.service';
import { InvoicesController } from './invoices.controller';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';

@Module({
  // Needed so a status change can re-run delay-risk scoring for the invoice.
  imports: [RiskEngineModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, ReminderService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
