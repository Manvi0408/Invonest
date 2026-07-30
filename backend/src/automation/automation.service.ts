import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReminderChannel, ReminderStatus } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async createReminderWorkflow(orgId: string, workflowSteps: any[]) {
    // Stores visual automation sequence in reports/parameters configuration metadata
    const report = await this.prisma.report.create({
      data: {
        organizationId: orgId,
        type: 'COLLECTIONS',
        generatedBy: 'SYSTEM_AUTOMATION',
        parameters: { steps: workflowSteps } as any,
      },
    });

    return report;
  }

  async getReminderWorkflows(orgId: string) {
    return this.prisma.report.findMany({
      where: {
        organizationId: orgId,
        type: 'COLLECTIONS',
        generatedBy: 'SYSTEM_AUTOMATION',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReminder(invoiceId: string, channel: ReminderChannel, delayDays: number) {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + delayDays);

    const reminder = await this.prisma.reminder.create({
      data: {
        invoiceId,
        channel,
        scheduledFor,
        status: 'SCHEDULED',
      },
      include: {
        invoice: { include: { client: true } },
      },
    });

    this.logger.log(`Scheduled ${channel} reminder for Invoice ${reminder.invoice.invoiceNumber} in ${delayDays} days.`);
    return reminder;
  }

  async triggerReminderExecution(reminderId: string) {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
      include: { invoice: { include: { client: true } } },
    });

    if (!reminder || reminder.status === 'SENT') {
      return { success: false, reason: 'Already processed or invalid reminder.' };
    }

    const client = reminder.invoice.client;
    const amount = Number(reminder.invoice.amount);
    const invoiceNum = reminder.invoice.invoiceNumber;

    // AI reminder body template builder
    let messageContent = '';
    const paymentUrl = `https://invonest.co/pay/${reminder.invoiceId}`;

    if (reminder.channel === 'EMAIL') {
      messageContent = `Dear ${client.name},\n\nThis is a friendly reminder that Invoice ${invoiceNum} for ₹${amount.toLocaleString()} is due. Please settle the invoice using this link: ${paymentUrl}.\n\nBest Regards,\nInvoNest Automated Accounts Receivable`;
    } else if (reminder.channel === 'SMS') {
      messageContent = `InvoNest Alert: Invoice ${invoiceNum} for ₹${amount.toLocaleString()} is outstanding. Pay now: ${paymentUrl}`;
    } else if (reminder.channel === 'WHATSAPP') {
      messageContent = `💬 *InvoNest Accounts Receivable Update*\n\nHello *${client.name}*,\nYour invoice *${invoiceNum}* is currently outstanding. \n\n💰 *Total Due:* ₹${amount.toLocaleString()}\n🔗 *Quick Payment Link:* ${paymentUrl}\n\nReplies to this message are monitored by our billing department. Thank you!`;
    }

    try {
      // Here we would integrate SendGrid, Twilio, or Meta API.
      // We simulate successful dispatch.
      const log = await this.prisma.reminderLog.create({
        data: {
          reminderId: reminder.id,
          channel: reminder.channel,
          recipient: reminder.channel === 'EMAIL' ? client.email : client.phone || '0000000000',
          content: messageContent,
          status: 'DELIVERED',
          responseMetadata: { provider: 'mock_gateway_api', statusCode: 200 } as any,
        },
      });

      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      await this.activity.record(
        reminder.invoice.organizationId,
        'REMINDER_SENT',
        'System',
        {
          reminderId: reminder.id,
          invoiceNumber: reminder.invoice.invoiceNumber,
          clientName: client.name,
          channel: reminder.channel,
        },
      );

      // Update invoice timeline to reflect communication opened/sent
      const timeline = (reminder.invoice.timeline as any[]) || [];
      timeline.push({
        status: 'REMINDER_SENT',
        date: new Date().toISOString(),
        description: `Automated ${reminder.channel} reminder dispatched to ${client.name}.`,
      });

      await this.prisma.invoice.update({
        where: { id: reminder.invoiceId },
        data: { timeline: timeline as any },
      });

      this.logger.log(`Dispatched automated reminder ${reminder.id} via ${reminder.channel}.`);
      return { success: true, log };
    } catch (err) {
      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'FAILED' },
      });
      return { success: false, error: err.message };
    }
  }
}
