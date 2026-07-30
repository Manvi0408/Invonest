import { Controller, Post, Get, Param, Body, NotFoundException } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { ReminderChannel } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { OwnershipService } from '../auth/ownership.service';
import { PlanService } from '../billing/plan.service';
import { PlanLimitException } from '../billing/plan-limit.exception';
import { PrismaService } from '../prisma/prisma.service';

@Controller('automation')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly ownership: OwnershipService,
    private readonly plans: PlanService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('workflow')
  async createWorkflow(
    @CurrentUser('orgId') orgId: string,
    @Body('steps') steps: any[],
  ) {
    return this.automationService.createReminderWorkflow(orgId, steps);
  }

  @Get('workflow')
  async getWorkflows(@CurrentUser('orgId') orgId: string) {
    return this.automationService.getReminderWorkflows(orgId);
  }

  @Post('reminder')
  async createReminder(
    @CurrentUser('orgId') orgId: string,
    @Body() body: { invoiceId: string; channel: ReminderChannel; delayDays: number },
  ) {
    await this.ownership.assertInvoice(body.invoiceId, orgId);

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found.');

    // The UI disables these channels, but the API is the real boundary.
    if (body.channel === 'WHATSAPP' && !this.plans.hasFeature(org, 'whatsapp_reminders')) {
      throw new PlanLimitException(
        'whatsapp_locked',
        'WhatsApp escalation is a Premium feature.',
      );
    }
    if (body.channel === 'SMS' && !this.plans.hasFeature(org, 'sms_reminders')) {
      throw new PlanLimitException('sms_locked', 'SMS reminders are a Premium feature.');
    }

    return this.automationService.createReminder(body.invoiceId, body.channel, body.delayDays);
  }

  @Post('reminder/:id/execute')
  async executeReminder(@Param('id') id: string, @CurrentUser('orgId') orgId: string) {
    await this.ownership.assertReminder(id, orgId);
    return this.automationService.triggerReminderExecution(id);
  }
}
