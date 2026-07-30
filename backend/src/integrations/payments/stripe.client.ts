import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Minimal, dependency-free Stripe REST client (no `stripe` SDK needed).
 * Reads STRIPE_SECRET_KEY at call time so the module boots without it — every
 * method throws a clear "not configured" error until the key is provided.
 */
@Injectable()
export class StripeClient {
  private readonly base = 'https://api.stripe.com/v1';

  private key(): string {
    const k = process.env.STRIPE_SECRET_KEY;
    if (!k || !k.trim()) throw new BadRequestException('Stripe is not configured (STRIPE_SECRET_KEY missing).');
    return k.trim();
  }

  private async req<T = any>(method: 'GET' | 'POST', path: string, form?: Record<string, any>): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.key()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form ? new URLSearchParams(this.flatten(form)).toString() : undefined,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new BadRequestException(json?.error?.message || `Stripe API error (${res.status}).`);
    return json;
  }

  /** Stripe wants nested params as `a[b]=c`; flatten one level for our needs. */
  private flatten(obj: Record<string, any>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      out[k] = String(v);
    }
    return out;
  }

  listCustomers(limit = 100, startingAfter?: string) {
    const q = new URLSearchParams({ limit: String(limit), ...(startingAfter ? { starting_after: startingAfter } : {}) });
    return this.req('GET', `/customers?${q}`);
  }
  listPaymentIntents(limit = 100, startingAfter?: string) {
    const q = new URLSearchParams({ limit: String(limit), ...(startingAfter ? { starting_after: startingAfter } : {}) });
    return this.req('GET', `/payment_intents?${q}`);
  }
  listCharges(limit = 100, startingAfter?: string) {
    const q = new URLSearchParams({ limit: String(limit), ...(startingAfter ? { starting_after: startingAfter } : {}) });
    return this.req('GET', `/charges?${q}`);
  }
  listInvoices(limit = 100, startingAfter?: string) {
    const q = new URLSearchParams({ limit: String(limit), ...(startingAfter ? { starting_after: startingAfter } : {}) });
    return this.req('GET', `/invoices?${q}`);
  }
  getPaymentIntent(id: string) {
    return this.req('GET', `/payment_intents/${id}`);
  }
  createRefund(paymentIntentId: string, amount?: number) {
    return this.req('POST', '/refunds', { payment_intent: paymentIntentId, ...(amount ? { amount } : {}) });
  }
}
