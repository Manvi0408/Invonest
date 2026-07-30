import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Minimal Razorpay REST client. Uses HTTP Basic auth with
 * RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET, read at call time so the module boots
 * without credentials.
 */
@Injectable()
export class RazorpayClient {
  private readonly base = 'https://api.razorpay.com/v1';

  private auth(): string {
    const id = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!id || !secret) throw new BadRequestException('Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing).');
    return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
  }

  private async req<T = any>(method: 'GET' | 'POST', path: string, body?: Record<string, any>): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: { Authorization: this.auth(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new BadRequestException(json?.error?.description || `Razorpay API error (${res.status}).`);
    return json;
  }

  // Razorpay paginates with count (max 100) + skip.
  listPayments(count = 100, skip = 0) {
    return this.req('GET', `/payments?count=${count}&skip=${skip}`);
  }
  listOrders(count = 100, skip = 0) {
    return this.req('GET', `/orders?count=${count}&skip=${skip}`);
  }
  listCustomers(count = 100, skip = 0) {
    return this.req('GET', `/customers?count=${count}&skip=${skip}`);
  }
  getPayment(id: string) {
    return this.req('GET', `/payments/${id}`);
  }
  createRefund(paymentId: string, amount?: number) {
    return this.req('POST', `/payments/${paymentId}/refund`, amount ? { amount } : {});
  }
}
