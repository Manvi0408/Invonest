import { Module } from '@nestjs/common';
import { PublicPayController } from './public-pay.controller';

@Module({ controllers: [PublicPayController] })
export class PublicPayModule {}
