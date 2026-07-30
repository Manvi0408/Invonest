import { ProviderKey } from '@prisma/client';

/**
 * Static provider registry — the single source of truth for the 8 Phase-1
 * integrations. Everything that differs per provider (auth style, OAuth
 * endpoints, scopes, which env vars hold the credentials, what a sync pulls)
 * lives here so the services stay generic.
 *
 * No secrets live in this file. Credentials are read from process.env at call
 * time via the `env` keys below, so the app boots and the UI works with empty
 * placeholders — a provider simply reports `configured: false` until its keys
 * are supplied.
 */

export type ProviderCategory = 'ACCOUNTING' | 'CRM' | 'PAYMENTS' | 'COMMUNICATION';
export type AuthType = 'oauth2' | 'apikey';

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Extra query params appended to the authorize URL (provider quirks). */
  extraAuthParams?: Record<string, string>;
}

export interface ProviderDef {
  key: ProviderKey;
  name: string;
  category: ProviderCategory;
  description: string;
  authType: AuthType;
  /** Env var names — NOT values. Read from process.env at runtime. */
  env: {
    clientId?: string;
    clientSecret?: string;
    apiKey?: string; // primary api key (Stripe secret / Razorpay key id)
    apiSecret?: string; // secondary secret (Razorpay key secret)
    webhookSecret?: string;
  };
  oauth?: OAuthConfig;
  /** Object types this provider syncs — drives the UI + the sync workers. */
  syncs: string[];
  /** Whether we expose an inbound webhook endpoint for this provider. */
  webhooks: boolean;
  brandColor: string;
}

const BASE = (): string => process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001';
export const redirectUri = (key: ProviderKey): string =>
  `${BASE()}/api/integrations/${key.toLowerCase()}/callback`;

export const PROVIDERS: Record<ProviderKey, ProviderDef> = {
  QUICKBOOKS: {
    key: 'QUICKBOOKS',
    name: 'QuickBooks Online',
    category: 'ACCOUNTING',
    description: 'Sync customers, invoices, outstanding balances and payments from QuickBooks Online.',
    authType: 'oauth2',
    env: { clientId: 'QUICKBOOKS_CLIENT_ID', clientSecret: 'QUICKBOOKS_CLIENT_SECRET' },
    oauth: {
      authorizeUrl: 'https://appcenter.intuit.com/connect/oauth2',
      tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      scopes: ['com.intuit.quickbooks.accounting', 'openid', 'email'],
    },
    syncs: ['Customers', 'Invoices', 'Outstanding invoices', 'Payments'],
    webhooks: true,
    brandColor: '#2CA01C',
  },
  XERO: {
    key: 'XERO',
    name: 'Xero',
    category: 'ACCOUNTING',
    description: 'Sync contacts, invoices, payments and credit notes from Xero.',
    authType: 'oauth2',
    env: { clientId: 'XERO_CLIENT_ID', clientSecret: 'XERO_CLIENT_SECRET' },
    oauth: {
      authorizeUrl: 'https://login.xero.com/identity/connect/authorize',
      tokenUrl: 'https://identity.xero.com/connect/token',
      scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'offline_access'],
    },
    syncs: ['Contacts', 'Invoices', 'Payments', 'Credit notes'],
    webhooks: true,
    brandColor: '#13B5EA',
  },
  ZOHO_BOOKS: {
    key: 'ZOHO_BOOKS',
    name: 'Zoho Books',
    category: 'ACCOUNTING',
    description: 'Sync customers, invoices and payments from Zoho Books.',
    authType: 'oauth2',
    env: { clientId: 'ZOHO_CLIENT_ID', clientSecret: 'ZOHO_CLIENT_SECRET' },
    oauth: {
      authorizeUrl: 'https://accounts.zoho.com/oauth/v2/auth',
      tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
      scopes: ['ZohoBooks.contacts.READ', 'ZohoBooks.invoices.READ', 'ZohoBooks.customerpayments.READ'],
      extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    },
    syncs: ['Customers', 'Invoices', 'Payments'],
    webhooks: false,
    brandColor: '#E42527',
  },
  SALESFORCE: {
    key: 'SALESFORCE',
    name: 'Salesforce',
    category: 'CRM',
    description: 'Sync accounts, contacts and opportunities from Salesforce.',
    authType: 'oauth2',
    env: { clientId: 'SALESFORCE_CLIENT_ID', clientSecret: 'SALESFORCE_CLIENT_SECRET' },
    oauth: {
      authorizeUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      scopes: ['api', 'refresh_token', 'offline_access'],
    },
    syncs: ['Accounts', 'Contacts', 'Opportunities'],
    webhooks: false,
    brandColor: '#00A1E0',
  },
  STRIPE: {
    key: 'STRIPE',
    name: 'Stripe',
    category: 'PAYMENTS',
    description: 'Sync customers, payments, payment intents and invoices from Stripe.',
    authType: 'apikey',
    env: { apiKey: 'STRIPE_SECRET_KEY', webhookSecret: 'STRIPE_WEBHOOK_SECRET' },
    syncs: ['Customers', 'Payments', 'Payment Intents', 'Invoices'],
    webhooks: true,
    brandColor: '#635BFF',
  },
  RAZORPAY: {
    key: 'RAZORPAY',
    name: 'Razorpay',
    category: 'PAYMENTS',
    description: 'Sync payments, orders and customers from Razorpay.',
    authType: 'apikey',
    env: { apiKey: 'RAZORPAY_KEY_ID', apiSecret: 'RAZORPAY_KEY_SECRET', webhookSecret: 'RAZORPAY_WEBHOOK_SECRET' },
    syncs: ['Payments', 'Orders', 'Customers'],
    webhooks: true,
    brandColor: '#0C2451',
  },
  GMAIL: {
    key: 'GMAIL',
    name: 'Gmail',
    category: 'COMMUNICATION',
    description: 'Sync email conversations, reminder history and delivery status via Gmail.',
    authType: 'oauth2',
    // Dedicated OAuth client (separate from the GOOGLE_CLIENT_ID used by "Sign in
    // with Google") so the two can't clash — a Gmail-API client with the Gmail
    // scopes, not the sign-in client.
    env: { clientId: 'GMAIL_CLIENT_ID', clientSecret: 'GMAIL_CLIENT_SECRET' },
    oauth: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'openid',
        'email',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ],
      extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    },
    syncs: ['Email conversations', 'Reminder history', 'Email status'],
    webhooks: false,
    brandColor: '#EA4335',
  },
  WHATSAPP: {
    key: 'WHATSAPP',
    name: 'WhatsApp Business',
    category: 'COMMUNICATION',
    description: 'Sync message history, delivery status and read receipts via the Meta Cloud API.',
    authType: 'oauth2',
    env: { clientId: 'META_APP_ID', clientSecret: 'META_APP_SECRET', webhookSecret: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN' },
    oauth: {
      authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
      scopes: ['whatsapp_business_messaging', 'whatsapp_business_management', 'business_management'],
    },
    syncs: ['Message history', 'Delivery status', 'Read receipts', 'Reminder status'],
    webhooks: true,
    brandColor: '#25D366',
  },
};

export const ALL_PROVIDERS = Object.values(PROVIDERS);

export function providerFromSlug(slug: string): ProviderDef | undefined {
  return ALL_PROVIDERS.find((p) => p.key.toLowerCase() === slug.toLowerCase());
}

/** True when the env vars this provider needs are all present (non-empty). */
export function isConfigured(p: ProviderDef): boolean {
  const need: (string | undefined)[] = [];
  if (p.authType === 'oauth2') {
    need.push(p.env.clientId, p.env.clientSecret);
  } else {
    need.push(p.env.apiKey);
    if (p.env.apiSecret) need.push(p.env.apiSecret);
  }
  return need.every((k) => !!k && !!process.env[k] && process.env[k]!.trim().length > 0);
}

/** The env var names a provider still needs (for a helpful "not configured" message). */
export function missingEnv(p: ProviderDef): string[] {
  const keys = [p.env.clientId, p.env.clientSecret, p.env.apiKey, p.env.apiSecret].filter(Boolean) as string[];
  return keys.filter((k) => !process.env[k] || !process.env[k]!.trim());
}
