import { Injectable, Logger } from '@nestjs/common';
import { Integration, ProviderKey, SyncJobKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OAuthService } from '../oauth.service';
import { StripeClient } from '../payments/stripe.client';
import { RazorpayClient } from '../payments/razorpay.client';
import { PROVIDERS } from '../providers';

/**
 * Provider sync engine. Every sync runs inside a SyncJob (QUEUED → RUNNING →
 * SUCCEEDED/FAILED) and writes SyncLog rows, so the Integrations page can show
 * real history and a health indicator. Each provider method makes real API
 * calls with the stored (decrypted, auto-refreshed) credentials and upserts the
 * results into the namespaced Synced* tables — no mock data. With placeholder
 * env the calls simply fail fast and the job is recorded as FAILED with the
 * provider's actual reason.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: OAuthService,
    private readonly stripe: StripeClient,
    private readonly razorpay: RazorpayClient,
  ) {}

  async run(integrationId: string, kind: SyncJobKind = SyncJobKind.INCREMENTAL): Promise<{ records: number }> {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) throw new Error('Integration not found.');
    const def = PROVIDERS[integration.provider];

    const job = await this.prisma.syncJob.create({
      data: { integrationId, kind, status: 'RUNNING', startedAt: new Date(), attempts: 1 },
    });
    await this.prisma.integration.update({ where: { id: integrationId }, data: { status: 'SYNCING' } });
    await this.log(integrationId, 'INFO', `${def.name}: ${kind} sync started.`);

    try {
      const records = await this.dispatch(integration);
      const next = new Date(Date.now() + integration.syncIntervalMin * 60_000);
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { status: 'CONNECTED', lastSyncedAt: new Date(), nextSyncAt: next, error: null },
      });
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: { status: 'SUCCEEDED', finishedAt: new Date(), recordsSynced: records },
      });
      await this.log(integrationId, 'INFO', `${def.name}: synced ${records} records.`, { records });
      return { records };
    } catch (err: any) {
      const msg = err?.message || 'Sync failed.';
      await this.prisma.integration.update({ where: { id: integrationId }, data: { status: 'SYNC_FAILED', error: msg } });
      await this.prisma.syncJob.update({ where: { id: job.id }, data: { status: 'FAILED', finishedAt: new Date(), error: msg } });
      await this.log(integrationId, 'ERROR', `${def.name}: sync failed — ${msg}`);
      throw err;
    }
  }

  private dispatch(i: Integration): Promise<number> {
    switch (i.provider) {
      case 'QUICKBOOKS': return this.syncQuickBooks(i);
      case 'XERO': return this.syncXero(i);
      case 'ZOHO_BOOKS': return this.syncZoho(i);
      case 'SALESFORCE': return this.syncSalesforce(i);
      case 'STRIPE': return this.syncStripe(i);
      case 'RAZORPAY': return this.syncRazorpay(i);
      case 'GMAIL': return this.syncGmail(i);
      case 'WHATSAPP': return this.syncWhatsApp(i);
      default: return Promise.resolve(0);
    }
  }

  // --- upsert helpers ------------------------------------------------------
  private customer(orgId: string, provider: ProviderKey, externalId: string, d: { name?: string; email?: string; meta?: any }) {
    return this.prisma.syncedCustomer.upsert({
      where: { provider_externalId: { provider, externalId } },
      create: { organizationId: orgId, provider, externalId, ...d },
      update: { ...d },
    });
  }
  private invoice(orgId: string, provider: ProviderKey, externalId: string, d: any) {
    return this.prisma.syncedInvoice.upsert({
      where: { provider_externalId: { provider, externalId } },
      create: { organizationId: orgId, provider, externalId, ...d },
      update: { ...d },
    });
  }
  private payment(orgId: string, provider: ProviderKey, externalId: string, d: any) {
    return this.prisma.syncedPayment.upsert({
      where: { provider_externalId: { provider, externalId } },
      create: { organizationId: orgId, provider, externalId, ...d },
      update: { ...d },
    });
  }
  private contact(orgId: string, provider: ProviderKey, externalId: string, d: any) {
    return this.prisma.syncedContact.upsert({
      where: { provider_externalId: { provider, externalId } },
      create: { organizationId: orgId, provider, externalId, ...d },
      update: { ...d },
    });
  }
  private conversation(orgId: string, provider: ProviderKey, externalId: string, d: any) {
    return this.prisma.conversation.upsert({
      where: { provider_externalId: { provider, externalId } },
      create: { organizationId: orgId, provider, externalId, ...d },
      update: { ...d },
    });
  }

  private log(integrationId: string, level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any) {
    return this.prisma.syncLog.create({ data: { integrationId, level, message, meta } }).catch(() => undefined);
  }

  private async json(url: string, headers: Record<string, string>): Promise<any> {
    const res = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error?.message || body?.message || body?.Message || `${res.status} from ${new URL(url).host}`);
    return body;
  }

  // --- providers -----------------------------------------------------------
  private async syncQuickBooks(i: Integration): Promise<number> {
    const tok = await this.prisma.oAuthToken.findUnique({ where: { integrationId: i.id } });
    const realmId = tok?.realmId;
    if (!realmId) throw new Error('Missing QuickBooks realmId — reconnect required.');
    const access = await this.oauth.getValidAccessToken(i.id);
    const base = `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?minorversion=65&query=`;
    const H = { Authorization: `Bearer ${access}` };
    let n = 0;
    const cust = await this.json(base + encodeURIComponent('select * from Customer maxresults 100'), H);
    for (const c of cust?.QueryResponse?.Customer ?? []) { await this.customer(i.organizationId, 'QUICKBOOKS', c.Id, { name: c.DisplayName, email: c.PrimaryEmailAddr?.Address, meta: c }); n++; }
    const inv = await this.json(base + encodeURIComponent('select * from Invoice maxresults 100'), H);
    for (const v of inv?.QueryResponse?.Invoice ?? []) { await this.invoice(i.organizationId, 'QUICKBOOKS', v.Id, { number: v.DocNumber, amount: v.TotalAmt, currency: v.CurrencyRef?.value, status: v.Balance > 0 ? 'OUTSTANDING' : 'PAID', dueDate: v.DueDate ? new Date(v.DueDate) : null, meta: v }); n++; }
    const pay = await this.json(base + encodeURIComponent('select * from Payment maxresults 100'), H);
    for (const p of pay?.QueryResponse?.Payment ?? []) { await this.payment(i.organizationId, 'QUICKBOOKS', p.Id, { amount: p.TotalAmt, currency: p.CurrencyRef?.value, status: 'RECEIVED', meta: p }); n++; }
    return n;
  }

  private async syncXero(i: Integration): Promise<number> {
    const access = await this.oauth.getValidAccessToken(i.id);
    const conns = await this.json('https://api.xero.com/connections', { Authorization: `Bearer ${access}` });
    const tenantId = conns?.[0]?.tenantId;
    if (!tenantId) throw new Error('No Xero tenant authorized.');
    const H = { Authorization: `Bearer ${access}`, 'Xero-tenant-id': tenantId };
    let n = 0;
    const contacts = await this.json('https://api.xero.com/api.xro/2.0/Contacts', H);
    for (const c of contacts?.Contacts ?? []) { await this.contact(i.organizationId, 'XERO', c.ContactID, { name: c.Name, email: c.EmailAddress, meta: c }); n++; }
    const invoices = await this.json('https://api.xero.com/api.xro/2.0/Invoices', H);
    for (const v of invoices?.Invoices ?? []) { await this.invoice(i.organizationId, 'XERO', v.InvoiceID, { number: v.InvoiceNumber, amount: v.Total, currency: v.CurrencyCode, status: v.Status, dueDate: v.DueDateString ? new Date(v.DueDateString) : null, meta: v }); n++; }
    const payments = await this.json('https://api.xero.com/api.xro/2.0/Payments', H);
    for (const p of payments?.Payments ?? []) { await this.payment(i.organizationId, 'XERO', p.PaymentID, { amount: p.Amount, currency: p.CurrencyRate ? undefined : undefined, status: p.Status, meta: p }); n++; }
    return n;
  }

  private async syncZoho(i: Integration): Promise<number> {
    const access = await this.oauth.getValidAccessToken(i.id);
    const H = { Authorization: `Zoho-oauthtoken ${access}` };
    const orgs = await this.json('https://www.zohoapis.com/books/v3/organizations', H);
    const orgId = orgs?.organizations?.[0]?.organization_id;
    if (!orgId) throw new Error('No Zoho Books organization found.');
    let n = 0;
    const contacts = await this.json(`https://www.zohoapis.com/books/v3/contacts?organization_id=${orgId}`, H);
    for (const c of contacts?.contacts ?? []) { await this.customer(i.organizationId, 'ZOHO_BOOKS', c.contact_id, { name: c.contact_name, email: c.email, meta: c }); n++; }
    const invoices = await this.json(`https://www.zohoapis.com/books/v3/invoices?organization_id=${orgId}`, H);
    for (const v of invoices?.invoices ?? []) { await this.invoice(i.organizationId, 'ZOHO_BOOKS', v.invoice_id, { number: v.invoice_number, amount: v.total, currency: v.currency_code, status: v.status, dueDate: v.due_date ? new Date(v.due_date) : null, meta: v }); n++; }
    const pays = await this.json(`https://www.zohoapis.com/books/v3/customerpayments?organization_id=${orgId}`, H);
    for (const p of pays?.customerpayments ?? []) { await this.payment(i.organizationId, 'ZOHO_BOOKS', p.payment_id, { amount: p.amount, currency: p.currency_code, status: 'RECEIVED', meta: p }); n++; }
    return n;
  }

  private async syncSalesforce(i: Integration): Promise<number> {
    const tok = await this.prisma.oAuthToken.findUnique({ where: { integrationId: i.id } });
    const instance = (tok?.meta as any)?.instance_url;
    if (!instance) throw new Error('Missing Salesforce instance_url — reconnect required.');
    const access = await this.oauth.getValidAccessToken(i.id);
    const H = { Authorization: `Bearer ${access}` };
    const soql = (q: string) => `${instance}/services/data/v59.0/query?q=${encodeURIComponent(q)}`;
    let n = 0;
    const accounts = await this.json(soql('SELECT Id, Name, Website FROM Account LIMIT 100'), H);
    for (const a of accounts?.records ?? []) { await this.customer(i.organizationId, 'SALESFORCE', a.Id, { name: a.Name, meta: a }); n++; }
    const contacts = await this.json(soql('SELECT Id, Name, Email FROM Contact LIMIT 100'), H);
    for (const c of contacts?.records ?? []) { await this.contact(i.organizationId, 'SALESFORCE', c.Id, { name: c.Name, email: c.Email, meta: c }); n++; }
    const opps = await this.json(soql('SELECT Id, Name, Amount, StageName, CloseDate FROM Opportunity LIMIT 100'), H);
    for (const o of opps?.records ?? []) { await this.invoice(i.organizationId, 'SALESFORCE', o.Id, { number: o.Name, amount: o.Amount, status: o.StageName, dueDate: o.CloseDate ? new Date(o.CloseDate) : null, meta: o }); n++; }
    return n;
  }

  private async syncStripe(i: Integration): Promise<number> {
    let n = 0;
    const customers = await this.stripe.listCustomers(100);
    for (const c of customers?.data ?? []) { await this.customer(i.organizationId, 'STRIPE', c.id, { name: c.name, email: c.email, meta: c }); n++; }
    const intents = await this.stripe.listPaymentIntents(100);
    for (const p of intents?.data ?? []) { await this.payment(i.organizationId, 'STRIPE', p.id, { amount: p.amount != null ? p.amount / 100 : null, currency: p.currency, status: p.status, meta: p }); n++; }
    const invoices = await this.stripe.listInvoices(100);
    for (const v of invoices?.data ?? []) { await this.invoice(i.organizationId, 'STRIPE', v.id, { number: v.number, amount: v.total != null ? v.total / 100 : null, currency: v.currency, status: v.status, dueDate: v.due_date ? new Date(v.due_date * 1000) : null, meta: v }); n++; }
    return n;
  }

  private async syncRazorpay(i: Integration): Promise<number> {
    let n = 0;
    const payments = await this.razorpay.listPayments(100);
    for (const p of payments?.items ?? []) { await this.payment(i.organizationId, 'RAZORPAY', p.id, { amount: p.amount != null ? p.amount / 100 : null, currency: p.currency, status: p.status, meta: p }); n++; }
    const orders = await this.razorpay.listOrders(100);
    for (const o of orders?.items ?? []) { await this.invoice(i.organizationId, 'RAZORPAY', o.id, { number: o.receipt, amount: o.amount != null ? o.amount / 100 : null, currency: o.currency, status: o.status, meta: o }); n++; }
    const customers = await this.razorpay.listCustomers(100);
    for (const c of customers?.items ?? []) { await this.customer(i.organizationId, 'RAZORPAY', c.id, { name: c.name, email: c.email, meta: c }); n++; }
    return n;
  }

  private async syncGmail(i: Integration): Promise<number> {
    const access = await this.oauth.getValidAccessToken(i.id);
    const H = { Authorization: `Bearer ${access}` };
    const list = await this.json('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50', H);
    let n = 0;
    for (const m of list?.messages ?? []) {
      const msg = await this.json(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, H);
      const subject = (msg.payload?.headers ?? []).find((h: any) => h.name === 'Subject')?.value;
      await this.conversation(i.organizationId, 'GMAIL', m.threadId || m.id, { channel: 'EMAIL', subject, status: (msg.labelIds || []).includes('UNREAD') ? 'UNREAD' : 'READ', meta: { snippet: msg.snippet } });
      n++;
    }
    return n;
  }

  private async syncWhatsApp(i: Integration): Promise<number> {
    // The WhatsApp Cloud API has no "list past messages" endpoint — history
    // arrives via webhooks. So the sync reconciles from stored WebhookEvents
    // into Conversations (delivery/read/reminder status). Live once the webhook
    // is receiving events.
    const events = await this.prisma.webhookEvent.findMany({ where: { provider: 'WHATSAPP', processedAt: null }, take: 200 });
    let n = 0;
    for (const e of events) {
      const p: any = e.payload;
      const entry = p?.entry?.[0]?.changes?.[0]?.value;
      const wa = entry?.messages?.[0] || entry?.statuses?.[0];
      if (!wa) continue;
      await this.conversation(i.organizationId, 'WHATSAPP', wa.id || e.externalId, { channel: 'WHATSAPP', status: wa.status || 'RECEIVED', meta: entry });
      await this.prisma.webhookEvent.update({ where: { id: e.id }, data: { processedAt: new Date() } });
      n++;
    }
    return n;
  }
}
