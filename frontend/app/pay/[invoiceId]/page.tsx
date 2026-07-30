'use client';

/* Customer-facing payment portal (5d).
   Deliberately isolated from /dashboard: the person paying is the vendor's
   customer, has no InvoNest account, and never authenticates. Nothing on this
   page imports dashboard state or the authenticated api client. */

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE } from '../../lib/api';

interface PortalData {
  invoice: {
    id: string;
    number: string;
    currency: string;
    total: number;
    amountPaid: number;
    amountDue: number;
    status: string;
    issueDate: string;
    dueDate: string;
    isPaid: boolean;
    items: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  };
  vendor: { name: string; logoUrl: string | null; brandColor: string; supportEmail: string | null };
  billedTo: { name: string };
}

export default function PublicPayPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      try {
        // Plain fetch, not the authenticated api helper — that one redirects to
        // /login on 401, which would be wrong for a customer with no account.
        const res = await fetch(`${API_BASE}/api/public/pay/${invoiceId}`);
        if (!res.ok) {
          setError(
            res.status === 404
              ? 'This invoice link is not valid. Check the link, or contact whoever sent it.'
              : 'Could not load this invoice. Please try again shortly.',
          );
          return;
        }
        setData(await res.json());
        // Fire-and-forget: a failed view ping must not break the page.
        fetch(`${API_BASE}/api/public/pay/${invoiceId}/viewed`, { method: 'POST' }).catch(() => {});
      } catch {
        setError('Could not reach the server. Please try again shortly.');
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  const money = (n: number, currency: string) =>
    `${currency === 'INR' ? '₹' : ''}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <Shell brand="#0d2227">
        <p className="text-sm text-zinc-500 font-mono">Loading invoice…</p>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell brand="#0d2227">
        <h1 className="text-lg font-bold text-zinc-900 mb-2">Invoice unavailable</h1>
        <p className="text-sm text-zinc-600">{error}</p>
      </Shell>
    );
  }

  const { invoice, vendor, billedTo } = data;
  const overdue = !invoice.isPaid && new Date(invoice.dueDate) < new Date();

  return (
    <Shell brand={vendor.brandColor}>
      {/* Vendor identity — this page is theirs, not InvoNest's. */}
      <div className="flex items-center gap-3 mb-8">
        {vendor.logoUrl ? (
          <img src={vendor.logoUrl} alt={vendor.name} className="h-9 w-auto object-contain" />
        ) : (
          <span
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: vendor.brandColor }}
          >
            {vendor.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="font-bold text-zinc-900">{vendor.name}</span>
      </div>

      <div className="mb-6">
        <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-500">
          Invoice {invoice.number}
        </span>
        <div className="text-3xl font-extrabold text-zinc-900 mt-1">
          {money(invoice.amountDue, invoice.currency)}
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {invoice.isPaid ? (
            <span style={{ color: 'var(--text-success)' }} className="font-semibold">
              Paid in full — thank you
            </span>
          ) : (
            <>
              Billed to {billedTo.name} · due {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
              {overdue && <span className="text-red-600 font-semibold"> · overdue</span>}
            </>
          )}
        </p>
      </div>

      {invoice.items.length > 0 && (
        <div className="border border-zinc-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50">
              <tr className="text-left text-[10px] uppercase font-mono text-zinc-500">
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={i} className="border-t border-zinc-100">
                  <td className="p-3 text-zinc-800">{it.description}</td>
                  <td className="p-3 text-right font-mono text-zinc-600">{it.quantity}</td>
                  <td className="p-3 text-right font-mono text-zinc-800">
                    {money(it.amount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between text-xs text-zinc-600 mb-1">
        <span>Invoice total</span>
        <span className="font-mono">{money(invoice.total, invoice.currency)}</span>
      </div>
      {invoice.amountPaid > 0 && (
        <div className="flex justify-between text-xs text-zinc-600 mb-1">
          <span>Already paid</span>
          <span className="font-mono">−{money(invoice.amountPaid, invoice.currency)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm font-bold text-zinc-900 pt-2 border-t border-zinc-200">
        <span>Amount due</span>
        <span className="font-mono">{money(invoice.amountDue, invoice.currency)}</span>
      </div>

      {!invoice.isPaid && (
        <>
          <button
            disabled
            className="w-full mt-6 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: vendor.brandColor }}
          >
            Pay {money(invoice.amountDue, invoice.currency)}
          </button>
          {/* Honest about state: no payment processor is connected yet, so the
              button must not imply a working checkout. */}
          <p className="text-[10px] text-zinc-500 text-center mt-2 font-mono">
            Card payments are not enabled yet
            {vendor.supportEmail ? ` — contact ${vendor.supportEmail} to settle this invoice` : ''}.
          </p>
        </>
      )}

      {vendor.supportEmail && (
        <p className="text-[11px] text-zinc-500 text-center mt-8">
          Questions? <a className="underline" href={`mailto:${vendor.supportEmail}`}>{vendor.supportEmail}</a>
        </p>
      )}
    </Shell>
  );
}

/** Light, self-contained chrome — the dark dashboard theme would be wrong for
    a customer-facing receipt, and this route must not inherit it. */
function Shell({ brand, children }: { brand: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-zinc-100 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-zinc-200 p-8">
        <div className="h-1 w-12 rounded-full mb-6" style={{ backgroundColor: brand }} />
        {children}
      </div>
    </div>
  );
}
