import { siStripe, siWhatsapp, siGmail, siXero, siZoho, siRazorpay, siQuickbooks } from 'simple-icons';

/**
 * Shared provider catalogue for the marketing integrations section — the 8
 * Phase-1 providers InvoNest connects to. Real brand marks come from
 * `simple-icons` (CC0 SVG path data). Salesforce was removed from simple-icons,
 * so it falls back to a monogram (icon: null).
 */

export type ProviderCategory = 'Accounting' | 'CRM' | 'Payments' | 'Communication';

export interface ProviderInfo {
  name: string;
  mono: string;
  category: ProviderCategory;
  /** Display/tile colour (a few are lightened vs. the true brand hex so the
   *  tile stays visible on a black background). */
  color: string;
  description: string;
  /** SVG path from simple-icons, or null to render the monogram instead. */
  icon: string | null;
}

export const PROVIDERS: ProviderInfo[] = [
  { name: 'QuickBooks', mono: 'QB', category: 'Accounting', color: '#2CA01C', icon: siQuickbooks.path, description: 'Sync customers, invoices, outstanding balances and payments from QuickBooks Online.' },
  { name: 'Xero', mono: 'X', category: 'Accounting', color: '#13B5EA', icon: siXero.path, description: 'Sync contacts, invoices, payments and credit notes from Xero.' },
  { name: 'Zoho Books', mono: 'Z', category: 'Accounting', color: '#E42527', icon: siZoho.path, description: 'Sync customers, invoices and payments from Zoho Books.' },
  { name: 'Salesforce', mono: 'SF', category: 'CRM', color: '#00A1E0', icon: null, description: 'Sync accounts, contacts and opportunities from Salesforce.' },
  { name: 'Stripe', mono: 'S', category: 'Payments', color: '#635BFF', icon: siStripe.path, description: 'Sync customers, payments, payment intents and invoices from Stripe.' },
  { name: 'Razorpay', mono: 'R', category: 'Payments', color: '#0C6BFF', icon: siRazorpay.path, description: 'Sync payments, orders and customers from Razorpay.' },
  { name: 'Gmail', mono: 'G', category: 'Communication', color: '#EA4335', icon: siGmail.path, description: 'Sync email conversations, reminder history and delivery status via Gmail.' },
  { name: 'WhatsApp', mono: 'W', category: 'Communication', color: '#25D366', icon: siWhatsapp.path, description: 'Sync message history, delivery status and read receipts via WhatsApp Business.' },
];

export const CATEGORIES: Array<'All' | ProviderCategory> = ['All', 'Accounting', 'CRM', 'Payments', 'Communication'];
