import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly riskEngine: RiskEngineService,
  ) {}

  async createInvoice(orgId: string, data: {
    clientId: string;
    invoiceNumber: string;
    amount: number;
    currency?: string;
    dueDate: Date;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
  }) {
    const timeline = [
      { status: 'DRAFT', date: new Date().toISOString(), description: 'Invoice initialized in draft mode.' }
    ];

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId: orgId,
        clientId: data.clientId,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        currency: data.currency || 'INR',
        status: 'DRAFT',
        issueDate: new Date(),
        dueDate: data.dueDate,
        timeline: timeline as any,
        comments: [] as any,
        items: {
          create: data.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            amount: i.quantity * i.unitPrice,
          })),
        },
      },
      include: {
        items: true,
        client: true,
      },
    });

    // Increment client outstanding balance
    await this.prisma.client.update({
      where: { id: data.clientId },
      data: { outstandingBalance: { increment: data.amount } },
    });

    await this.notifications.createNotification(
      orgId,
      'Invoice Created',
      `Invoice ${invoice.invoiceNumber} (₹${Number(invoice.amount).toLocaleString()}) has been created.`,
      'INFO',
    );

    return invoice;
  }

  async getInvoices(orgId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId: orgId },
      include: { client: true, items: true, riskPrediction: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { client: { include: { riskProfile: true } }, items: true, payments: true, riskPrediction: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async updateStatus(id: string, status: InvoiceStatus) {
    const invoice = await this.getInvoice(id);
    const wasPaid = invoice.status === 'PAID';
    const nowPaid = status === 'PAID';
    const amount = Number(invoice.amount);

    const timeline = (invoice.timeline as any[]) || [];
    timeline.push({
      status,
      date: new Date().toISOString(),
      description: `Invoice state transitioned to ${status}.`,
    });

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        // paidAt is the source of truth for "settled"; keep it in step so the
        // collection-speed metric and the AI ledger context stay honest.
        paidAt: nowPaid ? invoice.paidAt ?? new Date() : wasPaid ? null : invoice.paidAt,
        timeline: timeline as any,
      },
      include: { client: true },
    });

    // Delay Risk is forward-looking non-payment risk. A PAID invoice has none —
    // leaving the pre-payment score (e.g. 84%) on screen is stale and misleading.
    // Re-run scoring on EVERY status change, not just at creation, and force it
    // to 0 once settled. This is the fix for the "PAID but still 84%" bug.
    if (nowPaid && !wasPaid) {
      await this.prisma.riskPrediction.updateMany({
        where: { invoiceId: id },
        data: { riskScore: 0, probabilityCurve: { d7: 100, d14: 100, d30: 100 }, confidence: 1 },
      });
      // Outstanding drops to zero for this invoice — reflect it on the client
      // balance so the portfolio KPIs move too.
      await this.prisma.client.update({
        where: { id: invoice.clientId },
        data: { outstandingBalance: { decrement: amount } },
      });
      await this.activity.record(updated.organizationId, 'PAYMENT_RECEIVED', 'System', {
        invoiceId: id,
        invoiceNumber: updated.invoiceNumber,
        clientName: (invoice as any).client?.name ?? null,
        amount,
        via: 'status change',
      });
    } else if (wasPaid && !nowPaid) {
      // Reversal/refund — the balance comes back and the risk is recomputed
      // fresh rather than left at 0.
      await this.prisma.client.update({
        where: { id: invoice.clientId },
        data: { outstandingBalance: { increment: amount } },
      });
      await this.riskEngine.predictInvoiceRisk(id).catch(() => undefined);
    } else {
      // Sent -> Overdue and the like: re-score so the number tracks reality.
      await this.riskEngine.predictInvoiceRisk(id).catch(() => undefined);
    }

    await this.notifications.createNotification(
      updated.organizationId,
      'Invoice Updated',
      `Invoice ${updated.invoiceNumber} status is now ${status}.`,
      status === 'OVERDUE' ? 'WARNING' : 'INFO',
    );

    return updated;
  }

  async addComment(id: string, userId: string, userName: string, text: string) {
    const invoice = await this.getInvoice(id);
    const comments = (invoice.comments as any[]) || [];
    comments.push({
      userId,
      userName,
      text,
      date: new Date().toISOString(),
    });

    return this.prisma.invoice.update({
      where: { id },
      data: { comments: comments as any },
    });
  }

  async recordPayment(id: string, amount: number, method: PaymentMethod, transactionId?: string) {
    const invoice = await this.getInvoice(id);

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: id,
        amount,
        paymentMethod: method,
        transactionId,
        status: 'SUCCESS',
        processedAt: new Date(),
      },
    });

    // Check if fully paid
    const totalPayments = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + amount;
    const isFullyPaid = totalPayments >= Number(invoice.amount);
    const nextStatus = isFullyPaid ? InvoiceStatus.PAID : invoice.status;

    const timeline = (invoice.timeline as any[]) || [];
    timeline.push({
      status: nextStatus,
      date: new Date().toISOString(),
      description: `Payment of ₹${amount.toLocaleString()} received via ${method}.`,
    });

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: nextStatus,
        paidAt: isFullyPaid ? new Date() : null,
        timeline: timeline as any,
      },
    });

    // Reduce client outstanding balance
    await this.prisma.client.update({
      where: { id: invoice.clientId },
      data: { outstandingBalance: { decrement: amount } },
    });

    await this.activity.record(invoice.organizationId, 'PAYMENT_RECEIVED', 'System', {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: (invoice as any).client?.name ?? null,
      amount,
      method,
      fullySettled: isFullyPaid,
    });

    await this.notifications.createNotification(
      invoice.organizationId,
      'Payment Received',
      `Payment of ₹${amount.toLocaleString()} processed for Invoice ${invoice.invoiceNumber}.`,
      'SUCCESS',
    );

    return { payment, invoice: updatedInvoice };
  }
}
