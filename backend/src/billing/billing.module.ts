import { Global, Module } from '@nestjs/common';
import { PlanService } from './plan.service';
import { BillingController } from './billing.controller';

/** Global: quota + feature checks are needed at nearly every enforcement point. */
@Global()
@Module({
  controllers: [BillingController],
  providers: [PlanService],
  exports: [PlanService],
})
export class BillingModule {}
