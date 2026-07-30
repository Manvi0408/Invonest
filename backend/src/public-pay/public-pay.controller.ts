import { Controller, Get, Post, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { Public } from '../auth/public.decorator';

/**
 * Customer-facing payment portal (5d).
 *
 * Deliberately outside the authenticated dashboard: the person paying is the
 * vendor's *customer*, has no InvoNest account, and should never see InvoNest
 * branding. Every route is @Public() and keyed by invoice id alone.
 *
 * Security posture — this endpoint is unauthenticated by design, so it returns
 * strictly the fields needed to recognise and pay one invoice. It never exposes
 * the org's other clients, its ledger, totals, risk scores, or contact lists,
 * and it never accepts an orgId from the caller (the invoice determines it).
 */
@Controller('public/pay')
export class PublicPayController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  @Public()
  @Get(':invoiceId')
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        organization: true,
        client: true,
        items: true,
        payments: true,
      },
    });

    // Same response for "never existed" and "not payable" — an attacker
    // enumerating ids learns nothing either way.
    if (!invoice) throw new NotFoundException('Invoice not found.');

    const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const total = Number(invoice.amount);

    return {
      invoice: {
        id: invoice.id,
        number: invoice.invoiceNumber,
        currency: invoice.currency,
        total,
        amountPaid: paid,
        amountDue: Math.max(0, total - paid),
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        isPaid: invoice.status === 'PAID' || paid >= total,
        items: invoice.items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          amount: Number(it.amount),
        })),
      },
      // The vendor's identity — this is what makes the page "branded".
      vendor: {
        name: invoice.organization.name,
        logoUrl: invoice.organization.logoUrl,
        brandColor: invoice.organization.brandColor ?? '#0d2227',
        supportEmail: invoice.organization.supportEmail,
      },
      // First name only. The full record stays private.
      billedTo: { name: invoice.client.name },
    };
  }

  /**
   * Marks the invoice viewed. Separate from the GET so a link preview crawler
   * fetching the page doesn't fake a "customer opened it" signal.
   */
  @Public()
  @Post(':invoiceId/viewed')
  async markViewed(@Param('invoiceId') invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    if (invoice.status === 'SENT' || invoice.status === 'DUE') {
      const timeline = ((invoice.timeline as any[]) ?? []).concat({
        status: 'VIEWED',
        date: new Date().toISOString(),
        description: 'Customer opened the payment page.',
      });
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'VIEWED', timeline: timeline as any },
      });
    }
    return { ok: true };
  }
}
