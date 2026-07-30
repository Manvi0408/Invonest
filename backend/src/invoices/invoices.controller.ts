import { Controller, Post, Get, Patch, Param, Body } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { ReminderService } from './reminder.service';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { OwnershipService } from '../auth/ownership.service';
import type { AuthedUser } from '../auth/jwt-auth.guard';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly reminders: ReminderService,
    private readonly ownership: OwnershipService,
  ) {}

  @Post()
  async create(
    @CurrentUser('orgId') orgId: string,
    @Body() body: {
      clientId: string;
      invoiceNumber: string;
      amount: number;
      currency?: string;
      dueDate: string;
      items: Array<{ description: string; quantity: number; unitPrice: number }>;
    },
  ) {
    // Prevent attaching an invoice to another tenant's client.
    await this.ownership.assertClient(body.clientId, orgId);
    return this.invoicesService.createInvoice(orgId, {
      ...body,
      dueDate: new Date(body.dueDate),
    });
  }

  @Get()
  async getAll(@CurrentUser('orgId') orgId: string) {
    return this.invoicesService.getInvoices(orgId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser('orgId') orgId: string) {
    await this.ownership.assertInvoice(id, orgId);
    return this.invoicesService.getInvoice(id);
  }

  @Post(':id/reminder')
  async sendReminder(
    @Param('id') id: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.reminders.sendReminder(orgId, id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: InvoiceStatus,
    @CurrentUser('orgId') orgId: string,
  ) {
    await this.ownership.assertInvoice(id, orgId);
    return this.invoicesService.updateStatus(id, status);
  }

  /**
   * Author identity comes from the token. It used to be read from the request
   * body, which let a caller post comments under any name they liked.
   */
  @Post(':id/comments')
  async comment(
    @Param('id') id: string,
    @Body('text') text: string,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.ownership.assertInvoice(id, user.orgId);
    return this.invoicesService.addComment(id, user.userId, user.email, text);
  }

  @Post(':id/payments')
  async pay(
    @Param('id') id: string,
    @Body() body: { amount: number; method: PaymentMethod; transactionId?: string },
    @CurrentUser('orgId') orgId: string,
  ) {
    await this.ownership.assertInvoice(id, orgId);
    return this.invoicesService.recordPayment(id, body.amount, body.method, body.transactionId);
  }
}
