'use client';

/* Phase 1 of the cash-ledger input paths: manual entry.
   CSV import and accounting sync are specced but not built —
   see docs/specs/transaction-expense-model.md */

import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, Plus, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useRunway, RUNWAY_REASON_COPY } from '../useRunway';

interface CashAccount {
  id: string;
  name: string;
  accountType: string;
  currency: string;
  currentBalance: string | number;
  balanceAsOf: string;
  isActive: boolean;
}

interface Transaction {
  id: string;
  direction: 'INFLOW' | 'OUTFLOW';
  amount: string | number;
  category: string | null;
  description: string;
  counterparty: string | null;
  occurredAt: string;
  isRecurring: boolean;
  excludedFromBurn: boolean;
}

const CATEGORIES = [
  'PAYROLL', 'RENT', 'SOFTWARE', 'MARKETING', 'PROFESSIONAL_FEES',
  'TAXES', 'UTILITIES', 'INVENTORY', 'TRAVEL', 'EQUIPMENT', 'OTHER',
];

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`;
const asDate = (s: string) => new Date(s).toISOString().split('T')[0];

export default function ExpensesPage() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { runway, refresh: refreshRunway } = useRunway();

  // Per-field validation messages. A silent `return` on an empty form is
  // indistinguishable from a broken button, so every rejected submit must say
  // which field it wants and why.
  const [acctErrors, setAcctErrors] = useState<{ name?: string; currentBalance?: string }>({});
  const [txErrors, setTxErrors] = useState<{ amount?: string; description?: string }>({});

  const [acct, setAcct] = useState({ name: '', currentBalance: '', accountType: 'CURRENT' });
  const [tx, setTx] = useState({
    direction: 'OUTFLOW' as 'INFLOW' | 'OUTFLOW',
    amount: '',
    description: '',
    counterparty: '',
    category: 'PAYROLL',
    occurredAt: new Date().toISOString().split('T')[0],
    isRecurring: false,
    excludedFromBurn: false,
  });

  const load = useCallback(async () => {
    try {
      setError(null);
      const [a, t] = await Promise.all([
        api.get<CashAccount[]>('/api/expenses/accounts'),
        api.get<Transaction[]>('/api/expenses/transactions'),
      ]);
      setAccounts(a || []);
      setTxns(t || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load the cash ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Every mutation re-reads runway: the whole point of this page is moving that
  // number, so it must never show a stale figure after an edit.
  const afterMutate = async () => { await load(); await refreshRunway(); };

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();

    const errs: typeof acctErrors = {};
    if (!acct.name.trim()) errs.name = 'Enter an account name.';
    if (acct.currentBalance === '') errs.currentBalance = 'Enter the current balance.';
    else if (!Number.isFinite(Number(acct.currentBalance)))
      errs.currentBalance = 'Balance must be a number.';

    setAcctErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Send focus to the first problem so keyboard and screen-reader users
      // aren't left hunting for it.
      document.getElementById(errs.name ? 'acct-name' : 'acct-bal')?.focus();
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/expenses/accounts', {
        name: acct.name,
        currentBalance: Number(acct.currentBalance),
        accountType: acct.accountType,
      });
      setAcct({ name: '', currentBalance: '', accountType: 'CURRENT' });
      setAcctErrors({});
      await afterMutate();
    } catch (err: any) {
      setError(err?.message || 'Could not save the account.');
    } finally {
      setSaving(false);
    }
  }

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();

    const errs: typeof txErrors = {};
    if (!tx.amount.trim()) errs.amount = 'Enter an amount.';
    else if (!Number.isFinite(Number(tx.amount))) errs.amount = 'Amount must be a number.';
    else if (Number(tx.amount) <= 0) errs.amount = 'Amount must be greater than zero.';
    if (!tx.description.trim()) errs.description = 'Enter a description.';

    setTxErrors(errs);
    if (Object.keys(errs).length > 0) {
      document.getElementById(errs.amount ? 'tx-amt' : 'tx-desc')?.focus();
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/expenses/transactions', {
        ...tx,
        amount: Number(tx.amount),
        category: tx.direction === 'OUTFLOW' ? tx.category : null,
      });
      setTx({ ...tx, amount: '', description: '', counterparty: '' });
      setTxErrors({});
      await afterMutate();
    } catch (err: any) {
      setError(err?.message || 'Could not save the transaction.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind: 'accounts' | 'transactions', id: string) {
    try {
      await api.del(`/api/expenses/${kind}/${id}`);
      await afterMutate();
    } catch (err: any) {
      setError(err?.message || 'Could not delete.');
    }
  }

  const field =
    'w-full text-xs border border-[#0d2227]/15 rounded-lg px-3 py-2 bg-white text-[#0d2227] focus:outline-none focus:border-[#abc6d8]';
  /** Red border on the offending input, so the error is visible before reading. */
  const fieldErr = `${field} border-red-400 focus:border-red-400`;
  const FieldError = ({ id, msg }: { id: string; msg?: string }) =>
    msg ? (
      <span id={id} role="alert" className="text-[10px] font-semibold text-red-600 mt-1 block">
        {msg}
      </span>
    ) : null;
  const label = 'text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1';
  const card =
    'bg-white border border-[#0d2227]/15 rounded-2xl p-5 shadow-sm text-[#0d2227]';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="mb-2">
        <h1 className="text-lg font-extrabold text-[#0d2227]">Expenses &amp; Cash</h1>
        <p className="text-[11px] text-zinc-500 font-mono">
          Cash movement ledger — powers burn rate and forecast runway
        </p>
      </header>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Live runway readout, so the effect of each entry is immediate. */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <span className={label}>Current Runway</span>
            <div className="text-2xl font-extrabold">
              {runway?.runwayMonths == null ? (
                <span className="text-zinc-300">—</span>
              ) : (
                `${runway.runwayMonths} months`
              )}
            </div>
            <span className="text-[10px] text-zinc-400 mt-2 block">
              {runway?.runwayMonths != null
                ? `${money(runway.netBurn ?? 0)}/mo net burn · ${money(runway.grossBurn ?? 0)} gross − ${money(runway.operatingInflow ?? 0)} inflow · ${runway.windowMonths}-month average`
                : runway?.unavailableReason
                  ? RUNWAY_REASON_COPY[runway.unavailableReason]
                  : 'Add a cash account and expenses below'}
            </span>
          </div>
          <button
            onClick={afterMutate}
            className="w-8 h-8 rounded-full bg-[#abc6d8]/15 flex items-center justify-center hover:bg-[#abc6d8]/30 transition-colors"
            aria-label="Recalculate runway"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ------------------------------------------------ cash accounts */}
        <div className={card}>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-[#abc6d8]" />
            <h3 className="font-extrabold text-sm">Cash Accounts</h3>
          </div>

          {/* noValidate: native constraint validation silently blocks submit
              before React's handler runs, so our inline messages would never
              appear for out-of-range values. One validator, one voice. */}
          <form onSubmit={addAccount} noValidate className="grid grid-cols-2 gap-3 mb-5">
            <div className="col-span-2">
              <label className={label} htmlFor="acct-name">Account name</label>
              <input
                id="acct-name" className={acctErrors.name ? fieldErr : field} value={acct.name}
                aria-invalid={!!acctErrors.name}
                aria-describedby={acctErrors.name ? 'acct-name-err' : undefined}
                onChange={(e) => {
                  setAcct({ ...acct, name: e.target.value });
                  if (acctErrors.name) setAcctErrors({ ...acctErrors, name: undefined });
                }}
                placeholder="HDFC Current — 4471"
              />
              <FieldError id="acct-name-err" msg={acctErrors.name} />
            </div>
            <div>
              <label className={label} htmlFor="acct-bal">Current balance (₹)</label>
              <input
                id="acct-bal" type="number" className={acctErrors.currentBalance ? fieldErr : field}
                value={acct.currentBalance}
                aria-invalid={!!acctErrors.currentBalance}
                aria-describedby={acctErrors.currentBalance ? 'acct-bal-err' : undefined}
                onChange={(e) => {
                  setAcct({ ...acct, currentBalance: e.target.value });
                  if (acctErrors.currentBalance) setAcctErrors({ ...acctErrors, currentBalance: undefined });
                }}
                placeholder="4850000"
              />
              <FieldError id="acct-bal-err" msg={acctErrors.currentBalance} />
            </div>
            <div>
              <label className={label} htmlFor="acct-type">Type</label>
              <select
                id="acct-type" className={field} value={acct.accountType}
                onChange={(e) => setAcct({ ...acct, accountType: e.target.value })}
              >
                {['CURRENT', 'SAVINGS', 'CREDIT_LINE', 'ESCROW'].map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <button
              type="submit" disabled={saving}
              className="col-span-2 bg-[#0d2227] text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-[#0d2227]/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add account
            </button>
          </form>

          {loading ? (
            <p className="text-[10px] text-zinc-400 font-mono">Loading…</p>
          ) : accounts.length === 0 ? (
            <p className="text-[10px] text-zinc-400 font-mono">
              No cash accounts yet — runway needs at least one.
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs border-b border-zinc-100 pb-2 last:border-0">
                  <div>
                    <span className="font-semibold block">{a.name}</span>
                    <span className="text-[9px] font-mono text-zinc-500">
                      {a.accountType.replace('_', ' ')} · as of {asDate(a.balanceAsOf)}
                      {a.accountType === 'CREDIT_LINE' && ' · excluded from cash'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold">{money(a.currentBalance)}</span>
                    <button onClick={() => remove('accounts', a.id)} aria-label={`Delete ${a.name}`}>
                      <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-600 transition-colors" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* -------------------------------------------------- add movement */}
        <div className={card}>
          <h3 className="font-extrabold text-sm mb-4">Record Cash Movement</h3>
          <form onSubmit={addTransaction} noValidate className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="tx-dir">Direction</label>
              <select
                id="tx-dir" className={field} value={tx.direction}
                onChange={(e) => setTx({ ...tx, direction: e.target.value as 'INFLOW' | 'OUTFLOW' })}
              >
                <option value="OUTFLOW">Outflow (expense)</option>
                <option value="INFLOW">Inflow (received)</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="tx-amt">Amount (₹)</label>
              <input
                id="tx-amt" type="number" min="0" className={txErrors.amount ? fieldErr : field}
                value={tx.amount}
                aria-invalid={!!txErrors.amount}
                aria-describedby={txErrors.amount ? 'tx-amt-err' : undefined}
                onChange={(e) => {
                  setTx({ ...tx, amount: e.target.value });
                  if (txErrors.amount) setTxErrors({ ...txErrors, amount: undefined });
                }}
                placeholder="980000"
              />
              <FieldError id="tx-amt-err" msg={txErrors.amount} />
            </div>
            <div className="col-span-2">
              <label className={label} htmlFor="tx-desc">Description</label>
              <input
                id="tx-desc" className={txErrors.description ? fieldErr : field} value={tx.description}
                aria-invalid={!!txErrors.description}
                aria-describedby={txErrors.description ? 'tx-desc-err' : undefined}
                onChange={(e) => {
                  setTx({ ...tx, description: e.target.value });
                  if (txErrors.description) setTxErrors({ ...txErrors, description: undefined });
                }}
                placeholder="Monthly payroll"
              />
              <FieldError id="tx-desc-err" msg={txErrors.description} />
            </div>
            <div>
              <label className={label} htmlFor="tx-cp">Counterparty</label>
              <input
                id="tx-cp" className={field} value={tx.counterparty}
                onChange={(e) => setTx({ ...tx, counterparty: e.target.value })}
                placeholder="Team payroll"
              />
            </div>
            <div>
              <label className={label} htmlFor="tx-date">Date</label>
              <input
                id="tx-date" type="date" className={field} value={tx.occurredAt}
                onChange={(e) => setTx({ ...tx, occurredAt: e.target.value })}
              />
            </div>
            {tx.direction === 'OUTFLOW' && (
              <div className="col-span-2">
                <label className={label} htmlFor="tx-cat">Category</label>
                <select
                  id="tx-cat" className={field} value={tx.category}
                  onChange={(e) => setTx({ ...tx, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            )}
            <label className="col-span-2 flex items-center gap-2 text-[11px] text-zinc-600">
              <input
                type="checkbox" checked={tx.isRecurring}
                onChange={(e) => setTx({ ...tx, isRecurring: e.target.checked })}
              />
              Recurring monthly
            </label>
            <label className="col-span-2 flex items-center gap-2 text-[11px] text-zinc-600 -mt-1">
              <input
                type="checkbox" checked={tx.excludedFromBurn}
                onChange={(e) => setTx({ ...tx, excludedFromBurn: e.target.checked })}
              />
              One-off — exclude from burn rate
            </label>
            <button
              type="submit" disabled={saving}
              className="col-span-2 bg-[#0d2227] text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-[#0d2227]/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Record movement
            </button>
          </form>
        </div>
      </div>

      {/* -------------------------------------------------------- ledger */}
      <div className={card}>
        <h3 className="font-extrabold text-sm mb-4">Cash Ledger</h3>
        {loading ? (
          <p className="text-[10px] text-zinc-400 font-mono">Loading…</p>
        ) : txns.length === 0 ? (
          <p className="text-[10px] text-zinc-400 font-mono">
            Nothing recorded yet — burn rate needs 2 complete months of history.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[9px] uppercase font-mono text-zinc-500 border-b border-zinc-100">
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5 text-right">Amount</th>
                  <th className="p-2.5" />
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-50 last:border-0">
                    <td className="p-2.5 font-mono text-zinc-500">{asDate(t.occurredAt)}</td>
                    <td className="p-2.5">
                      <span className="font-semibold">{t.description}</span>
                      {t.counterparty && (
                        <span className="text-[9px] font-mono text-zinc-500 block">{t.counterparty}</span>
                      )}
                      {t.excludedFromBurn && (
                        <span className="text-[9px] font-mono text-amber-600">excluded from burn</span>
                      )}
                    </td>
                    <td className="p-2.5 text-[10px] font-mono text-zinc-500">
                      {t.category ? t.category.replace('_', ' ') : '—'}
                    </td>
                    <td
                      className="p-2.5 text-right font-mono font-bold"
                      style={{ color: `var(${t.direction === 'INFLOW' ? '--text-success' : '--text-danger'})` }}
                    >
                      {t.direction === 'INFLOW' ? '+' : '−'}{money(t.amount)}
                    </td>
                    <td className="p-2.5 text-right">
                      <button onClick={() => remove('transactions', t.id)} aria-label={`Delete ${t.description}`}>
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-600 transition-colors" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
