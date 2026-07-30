import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ActivityModule } from './activity/activity.module';
import { PublicPayModule } from './public-pay/public-pay.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { BillingModule } from './billing/billing.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ClientsModule } from './clients/clients.module';
import { InvoicesModule } from './invoices/invoices.module';
import { OcrModule } from './ocr/ocr.module';
import { ForecastingModule } from './forecasting/forecasting.module';
import { RiskEngineModule } from './risk-engine/risk-engine.module';
import { AutomationModule } from './automation/automation.module';
import { AiCopilotModule } from './ai-copilot/ai-copilot.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { QueueModule } from './queue/queue.module';
import { TeamModule } from './team/team.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ActivityModule,
    PublicPayModule,
    AuthModule,
    BillingModule,
    OrganizationsModule,
    ClientsModule,
    InvoicesModule,
    OcrModule,
    ForecastingModule,
    RiskEngineModule,
    AutomationModule,
    AiCopilotModule,
    NotificationsModule,
    ReportsModule,
    QueueModule,
    TeamModule,
    IntegrationsModule,
  ],
  providers: [
    // Deny-by-default: every route requires a valid JWT unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
