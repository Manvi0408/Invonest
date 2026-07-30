'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MoreVertical, Plus, X, Users } from 'lucide-react';
import { api } from '../../lib/api';

interface RiskProfile {
  riskScore: number;
  riskLevel: string;
  paymentReliability: number;
  paidInvoiceCount: number;
  hasSufficientHistory: boolean;
  revenueContribution: number;
  creditworthinessLimit: string | number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  industry: string | null;
  creditLimit: string | number | null;
  outstandingBalance: string | number;
  archivedAt: string | null;
  riskProfile: RiskProfile | null;
}

const money = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '—' : `₹${Number(v).toLocaleString('en-IN')}`;

const INDUSTRIES = [
  'Software & SaaS', 'Manufacturing', 'Retail & E-commerce', 'Financial Services',
  'Healthcare', 'Logistics', 'Construction', 'Media & Advertising', 'Other',
];

export default function ClientManager({ onChanged }: { onChanged?: () => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: '', email: '', creditLimit: '', outstandingBalance: '', industry: '',
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});

  const load = useCallback(async () => {
    try {
      setError(null);
      setClients(await api.get<Client[]>('/api/clients'));
    } catch (err: any) {
      setError(err?.message || 'Could not load clients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close the three-dot menu on any outside click.
  useEffect(() => {
    if (!menuFor) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuFor]);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof formErrors = {};
    if (!form.name.trim()) errs.name = 'Enter a company name.';
    if (!form.email.trim()) errs.email = 'Enter a contact email.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) errs.email = 'Enter a valid email.';
    setFormErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(errs.name ? 'cl-name' : 'cl-email')?.focus();
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/clients', {
        name: form.name.trim(),
        email: form.email.trim(),
        industry: form.industry || undefined,
        creditLimit: form.creditLimit === '' ? undefined : Number(form.creditLimit),
        outstandingBalance: form.outstandingBalance === '' ? undefined : Number(form.outstandingBalance),
      });
      setForm({ name: '', email: '', creditLimit: '', outstandingBalance: '', industry: '' });
      setFormErrors({});
      setModalOpen(false);
      await load();
      // The server rescored the whole portfolio; tell the rest of the dashboard
      // so aggregate metrics don't sit stale behind a fresh table.
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Could not add the client.');
    } finally {
      setSaving(false);
    }
  }

  async function archive(c: Client) {
    setMenuFor(null);
    try {
      await api.del(`/api/clients/${c.id}`);
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Could not remove the client.');
    }
  }

  const field =
    'w-full text-xs border border-[#0d2227]/15 rounded-lg px-3 py-2 bg-white text-[#0d2227] focus:outline-none focus:border-[#abc6d8]';
  const label = 'text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1';

  return (
    <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 shadow-sm text-[#0d2227]">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-[#abc6d8]" /> Clients
          </h3>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
            Adding or removing a client rescores the whole portfolio
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#0d2227] hover:bg-[#1a3339] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add client
        </button>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-2.5 text-xs font-semibold mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[10px] text-zinc-400 font-mono">Loading…</p>
      ) : clients.length === 0 ? (
        <p className="text-[10px] text-zinc-400 font-mono">No clients yet. Add one to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[9px] uppercase font-mono text-zinc-500 border-b border-zinc-100">
                <th className="p-2.5">Client</th>
                <th className="p-2.5">Industry</th>
                <th className="p-2.5 text-right">Outstanding</th>
                <th className="p-2.5 text-right">Credit limit</th>
                <th className="p-2.5 text-right">Contribution</th>
                <th className="p-2.5 text-right">Reliability</th>
                <th className="p-2.5" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const r = c.riskProfile;
                return (
                  <tr key={c.id} className="border-b border-zinc-50 last:border-0">
                    <td className="p-2.5">
                      <span className="font-semibold block">{c.name}</span>
                      <span className="text-[9px] font-mono text-zinc-500">{c.email}</span>
                    </td>
                    <td className="p-2.5 text-zinc-600">{c.industry || '—'}</td>
                    <td className="p-2.5 text-right font-mono">{money(c.outstandingBalance)}</td>
                    <td className="p-2.5 text-right font-mono">{money(c.creditLimit)}</td>
                    <td className="p-2.5 text-right font-mono">
                      {r ? `${r.revenueContribution}%` : '—'}
                    </td>
                    <td className="p-2.5 text-right">
                      {/* The honest-state rule: a client without enough paid
                          invoices shows why, never a flattering placeholder. */}
                      {r?.hasSufficientHistory ? (
                        <span className="font-mono font-bold">{r.paymentReliability}%</span>
                      ) : (
                        <span
                          className="text-[9px] font-mono text-zinc-400"
                          title={`Needs 3 paid invoices; has ${r?.paidInvoiceCount ?? 0}`}
                        >
                          Insufficient history
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-right relative">
                      <button
                        onClick={() => setMenuFor(menuFor === c.id ? null : c.id)}
                        aria-label={`Actions for ${c.name}`}
                        aria-haspopup="menu"
                        aria-expanded={menuFor === c.id}
                        className="p-1 rounded hover:bg-zinc-100 transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5 text-zinc-500" />
                      </button>
                      {menuFor === c.id && (
                        <div
                          ref={menuRef}
                          role="menu"
                          className="absolute right-2 top-8 z-20 w-44 liquid rounded-xl border border-[#0d2227]/10 shadow-xl py-1 text-left"
                        >
                          <button
                            role="menuitem"
                            onClick={() => archive(c)}
                            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Remove client
                          </button>
                          <p className="px-3 pt-1 pb-1.5 text-[9px] font-mono text-zinc-500 leading-snug">
                            Archives the client. Invoices and history are kept.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add-client modal — liquid glass, per the brief. */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add client"
            onClick={(e) => e.stopPropagation()}
            className="liquid w-full max-w-md rounded-2xl border border-white/15 shadow-2xl p-6"
          >
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-extrabold text-sm">Add client</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                  Metrics recalculate across the dashboard on save
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} aria-label="Close">
                <X className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
              </button>
            </div>

            <form onSubmit={addClient} noValidate className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={label} htmlFor="cl-name">Company name</label>
                <input
                  id="cl-name" className={field} value={form.name}
                  aria-invalid={!!formErrors.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); if (formErrors.name) setFormErrors({ ...formErrors, name: undefined }); }}
                  placeholder="Northwind Traders"
                />
                {formErrors.name && <span role="alert" className="text-[10px] font-semibold text-red-500 mt-1 block">{formErrors.name}</span>}
              </div>
              <div className="col-span-2">
                <label className={label} htmlFor="cl-email">Contact email</label>
                <input
                  id="cl-email" className={field} value={form.email}
                  aria-invalid={!!formErrors.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); if (formErrors.email) setFormErrors({ ...formErrors, email: undefined }); }}
                  placeholder="ap@northwind.com"
                />
                {formErrors.email && <span role="alert" className="text-[10px] font-semibold text-red-500 mt-1 block">{formErrors.email}</span>}
              </div>
              <div>
                <label className={label} htmlFor="cl-credit">Credit limit (₹)</label>
                <input
                  id="cl-credit" type="number" className={field} value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                  placeholder="300000"
                />
              </div>
              <div>
                <label className={label} htmlFor="cl-overdue">Overdue amount (₹)</label>
                <input
                  id="cl-overdue" type="number" className={field} value={form.outstandingBalance}
                  onChange={(e) => setForm({ ...form, outstandingBalance: e.target.value })}
                  placeholder="optional"
                />
              </div>
              <div className="col-span-2">
                <label className={label} htmlFor="cl-industry">Industry</label>
                <select
                  id="cl-industry" className={field} value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                >
                  <option value="">Optional</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <button
                type="submit" disabled={saving}
                className="col-span-2 bg-[#0d2227] text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-[#1a3339] transition-colors mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Add client'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
