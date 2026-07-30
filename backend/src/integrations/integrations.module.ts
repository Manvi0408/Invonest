import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CryptoService } from './crypto.service';
import { OAuthService } from './oauth.service';
import { IntegrationsService } from './integrations.service';
import { SyncService } from './sync/sync.service';
import { StripeClient } from './payments/stripe.client';
import { RazorpayClient } from './payments/razorpay.client';
import { IntegrationsQueue } from './integrations.queue';
import { IntegrationsController } from './integrations.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController, WebhooksController],
  providers: [
    CryptoService,
    OAuthService,
    IntegrationsService,
    SyncService,
    StripeClient,
    RazorpayClient,
    IntegrationsQueue,
  ],
  exports: [IntegrationsService, SyncService, OAuthService],
})
export class IntegrationsModule {}
