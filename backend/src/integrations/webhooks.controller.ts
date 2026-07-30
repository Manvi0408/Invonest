import { Controller, Post, Get, Req, Res, Headers, Query, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { ProviderKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/public.decorator';
import { IntegrationsQueue } from './integrations.queue';

/**
 * Inbound webhook endpoints. All are @Public (providers don't send our JWT) but
 * every payload is HMAC-verified against the raw body before it's trusted, and
 * every event is de-duplicated via the WebhookEvent unique(provider,externalId)
 * constraint so a redelivery is never processed twice.
 */
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: IntegrationsQueue,
  ) {}

  private raw(req: Request): Buffer {
    return (req as any).rawBody ?? Buffer.from(JSON.stringify((req as any).body ?? {}));
  }

  private hmacHex(secret: string, data: Buffer): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
  private hmacB64(secret: string, data: Buffer): string {
    return crypto.createHmac('sha256', secret).update(data).digest('base64');
  }
  private safeEq(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  }

  /**
   * Record the event (idempotently) and, if it's new + valid, fan a webhook sync
   * out to every connected integration for that provider. Returns whether it was
   * newly accepted.
   */
  private async record(provider: ProviderKey, externalId: string, eventType: string | undefined, payload: any, valid: boolean) {
    try {
      await this.prisma.webhookEvent.create({ data: { provider, externalId, eventType, signatureValid: valid, payload } });
    } catch {
      // Unique violation → already seen. Idempotent no-op.
      return { duplicate: true };
    }
    if (valid) {
      const targets = await this.prisma.integration.findMany({
        where: { provider, status: { in: ['CONNECTED', 'SYNCING', 'SYNC_FAILED'] } },
        select: { id: true },
      });
      for (const t of targets) await this.queue.enqueue('webhook', { integrationId: t.id });
    }
    return { duplicate: false };
  }

  // --- Stripe --------------------------------------------------------------
  @Public()
  @Post('stripe')
  async stripe(@Req() req: Request, @Headers('stripe-signature') sig: string, @Res() res: Response) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const raw = this.raw(req);
    let valid = false;
    if (secret && sig) {
      const parts = Object.fromEntries(sig.split(',').map((kv) => kv.split('=')));
      const expected = this.hmacHex(secret, Buffer.concat([Buffer.from(`${parts.t}.`), raw]));
      valid = !!parts.v1 && this.safeEq(expected, parts.v1);
    }
    const body: any = (req as any).body ?? {};
    if (!valid) return res.status(400).json({ received: false, error: 'signature_verification_failed' });
    await this.record('STRIPE', body.id ?? crypto.randomUUID(), body.type, body, true);
    return res.status(200).json({ received: true });
  }

  // --- Razorpay ------------------------------------------------------------
  @Public()
  @Post('razorpay')
  async razorpay(@Req() req: Request, @Headers('x-razorpay-signature') sig: string, @Res() res: Response) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const raw = this.raw(req);
    const valid = !!secret && !!sig && this.safeEq(this.hmacHex(secret, raw), sig);
    const body: any = (req as any).body ?? {};
    if (!valid) return res.status(400).json({ received: false, error: 'signature_verification_failed' });
    const externalId =
      body?.payload?.payment?.entity?.id ?? (body?.event ? `${body.event}:${body.created_at}` : crypto.randomUUID());
    await this.record('RAZORPAY', externalId, body.event, body, true);
    return res.status(200).json({ received: true });
  }

  // --- WhatsApp (Meta Cloud API) ------------------------------------------
  // GET: subscription verification handshake. POST: message/status events.
  @Public()
  @Get('whatsapp')
  whatsappVerify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string, @Res() res: Response) {
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && expected && token === expected) return res.status(200).send(challenge);
    return res.status(403).send('verification_failed');
  }

  @Public()
  @Post('whatsapp')
  async whatsapp(@Req() req: Request, @Headers('x-hub-signature-256') sig: string, @Res() res: Response) {
    const secret = process.env.META_APP_SECRET;
    const raw = this.raw(req);
    const valid = !!secret && !!sig && this.safeEq('sha256=' + this.hmacHex(secret, raw), sig);
    const body: any = (req as any).body ?? {};
    if (!valid) return res.status(401).json({ received: false });
    const change = body?.entry?.[0]?.changes?.[0]?.value;
    const externalId = change?.messages?.[0]?.id ?? change?.statuses?.[0]?.id ?? crypto.randomUUID();
    await this.record('WHATSAPP', externalId, 'whatsapp_event', body, true);
    return res.status(200).json({ received: true });
  }

  // --- Xero ----------------------------------------------------------------
  @Public()
  @Post('xero')
  async xero(@Req() req: Request, @Headers('x-xero-signature') sig: string, @Res() res: Response) {
    const secret = process.env.XERO_WEBHOOK_KEY;
    const raw = this.raw(req);
    const valid = !!secret && !!sig && this.safeEq(this.hmacB64(secret, raw), sig);
    // Xero requires a 200 for a valid signature and 401 otherwise (intent phase).
    if (!valid) return res.status(401).send();
    const body: any = (req as any).body ?? {};
    await this.record('XERO', String(body?.lastEventSequence ?? crypto.randomUUID()), 'xero_event', body, true);
    return res.status(200).send();
  }

  // --- QuickBooks ----------------------------------------------------------
  @Public()
  @Post('quickbooks')
  async quickbooks(@Req() req: Request, @Headers('intuit-signature') sig: string, @Res() res: Response) {
    const secret = process.env.QUICKBOOKS_WEBHOOK_TOKEN;
    const raw = this.raw(req);
    const valid = !!secret && !!sig && this.safeEq(this.hmacB64(secret, raw), sig);
    const body: any = (req as any).body ?? {};
    if (!valid) return res.status(401).json({ received: false });
    const externalId = body?.eventNotifications?.[0]?.realmId + ':' + (body?.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0]?.lastUpdated ?? Date.now());
    await this.record('QUICKBOOKS', externalId, 'qbo_event', body, true);
    return res.status(200).json({ received: true });
  }
}
