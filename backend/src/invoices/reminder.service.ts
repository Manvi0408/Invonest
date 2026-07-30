import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

/**
 * Invoice payment reminders.
 *
 * Email goes through Resend's REST API. The result the caller gets back
 * reflects the provider's ACTUAL response — a reminder is only reported as sent
 * once Resend returns 200 with a message id. A failed send (bad address,
 * unverified domain, provider error) throws, so the UI shows an error rather
 * than a false "Reminder Sent".
 *
 * WhatsApp is intentionally not implemented: there is no WhatsApp Business API
 * wired up. The channel is reported as `email` only.
 */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly resendKey = process.env.RESEND_API_KEY;
  // Resend's shared sandbox sender — works without a verified domain. Swap for
  // a verified from-address once the org has its own domain in Resend.
  private readonly from = 'InvoNest <onboarding@resend.dev>';

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async sendReminder(orgId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: { client: true, organization: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    if (invoice.status === 'PAID') {
      throw new BadRequestException('This invoice is already paid — nothing to remind.');
    }
    if (!invoice.client?.email) {
      throw new BadRequestException('This client has no email on file.');
    }
    if (!this.resendKey) {
      throw new BadRequestException('Email is not configured on this server (RESEND_API_KEY missing).');
    }

    const amount = `₹${Number(invoice.amount).toLocaleString('en-IN')}`;
    const payUrl = `https://pay.invonest.com/${invoice.id}`;
    const name = invoice.client.name;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1c1c1c">
        <h2 style="font-weight:800">Hi ${name},</h2>
        <p>Your payment of <strong>${amount}</strong> for Invoice
        <strong>${invoice.invoiceNumber}</strong> is due. Here's your payment
        link — it takes less than two minutes.</p>
        <p style="margin:24px 0">
          <a href="${payUrl}" style="background:#0d2227;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700">
            Pay ${amount}
          </a>
        </p>
        <p style="color:#666;font-size:13px">Sent by ${invoice.organization.name} via InvoNest.</p>
      </div>`;

    let providerId: string;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: this.from,
          to: invoice.client.email,
          subject: `Payment reminder — Invoice ${invoice.invoiceNumber} (${amount})`,
          html,
        }),
      });
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Surface the provider's real reason. In Resend test mode this is often
        // "you can only send to your own verified address" until a domain is
        // verified — the honest failure the spec asks us to show, not hide.
        const msg = body?.message || body?.error?.message || `Resend returned ${res.status}`;
        this.logger.warn(`Reminder send failed for ${invoice.invoiceNumber}: ${msg}`);
        throw new BadRequestException(`Email provider rejected the send: ${msg}`);
      }
      providerId = body.id;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Reminder transport error: ${err?.message}`);
      throw new BadRequestException('Could not reach the email service. Try again shortly.');
    }

    // Only reached on a confirmed 200 from Resend.
    const timeline = ((invoice.timeline as any[]) ?? []).concat({
      status: 'REMINDER_SENT',
      date: new Date().toISOString(),
      description: `Email reminder sent to ${invoice.client.email}.`,
    });
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { timeline: timeline as any },
    });
    await this.activity.record(orgId, 'REMINDER_SENT', 'System', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: name,
      channel: 'EMAIL',
    });

    return { sent: true, channel: 'email', to: invoice.client.email, providerId };
  }
}
