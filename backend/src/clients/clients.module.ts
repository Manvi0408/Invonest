import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';

@Module({
  // Needed so adding or archiving a client can rescore the whole portfolio.
  imports: [RiskEngineModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
