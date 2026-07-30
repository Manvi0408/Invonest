'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity, Bell, AlertTriangle, CheckCircle2, UserPlus, UserMinus, FileUp, CalendarClock,
} from 'lucide-react';
import { api } from '../lib/api';

type EventType =
  | 'REMINDER_SENT' | 'INVOICE_OVERDUE' | 'PAYMENT_RECEIVED' | 'CLIENT_ADDED'
  | 'CLIENT_REMOVED' | 'INVOICE_UPLOADED' | 'PROMISE_TO_PAY_LOGGED';

interface ActivityRow {
  id: string;
  eventType: EventType;
  actor: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

const ICONS: Record<EventType, React.ComponentType<{ className?: string }>> = {
  REMINDER_SENT: Bell,
  INVOICE_OVERDUE: AlertTriangle,
  PAYMENT_RECEIVED: CheckCircle2,
  CLIENT_ADDED: UserPlus,
  CLIENT_REMOVED: UserMinus,
  INVOICE_UPLOADED: FileUp,
  PROMISE_TO_PAY_LOGGED: CalendarClock,
};

const money = (v: unknown) =>
  typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : '';

/** Renders each event from its own metadata rather than a stored sentence, so
    older rows still read correctly if the wording changes later. */
function describe(row: ActivityRow): string {
  const m = row.metadata ?? {};
  switch (row.eventType) {
    case 'REMINDER_SENT':
      return `${m.channel ?? 'Reminder'} reminder sent to ${m.clientName ?? 'client'} for ${m.invoiceNumber ?? 'an invoice'}`;
    case 'INVOICE_OVERDUE':
      return `${m.invoiceNumber ?? 'An invoice'} for ${m.clientName ?? 'a client'} went overdue`;
    case 'PAYMENT_RECEIVED':
      return `${money(m.amount)} received from ${m.clientName ?? 'client'}${m.fullySettled ? ' — settled in full' : ''}`;
    case 'CLIENT_ADDED':
      return `${m.clientName ?? 'A client'} was added`;
    case 'CLIENT_REMOVED':
      return `${m.clientName ?? 'A client'} was archived`;
    case 'INVOICE_UPLOADED':
      return `${m.invoiceNumber ?? 'An invoice'} uploaded${m.clientName ? ` for ${m.clientName}` : ''}`;
    case 'PROMISE_TO_PAY_LOGGED':
      return `${m.clientName ?? 'A client'} promised payment${m.promisedDate ? ` by ${m.promisedDate}` : ''}`;
    default:
      return 'Activity recorded';
  }
}

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ActivityFeed() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setRows(await api.get<ActivityRow[]>('/api/activity?limit=15'));
      } catch (err: any) {
        setError(err?.message || 'Could not load activity.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 shadow-sm text-[#0d2227]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-extrabold text-sm text-[#0d2227]">Recent Activity</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Live event stream</p>
        </div>
        <Activity className="w-4 h-4 text-[#abc6d8]" />
      </div>

      {loading ? (
        <p className="text-[10px] text-zinc-400 font-mono">Loading…</p>
      ) : error ? (
        <p className="text-[10px] text-red-600 font-semibold">{error}</p>
      ) : rows.length === 0 ? (
        // Honest empty state — the feed is real, so before anything happens it
        // is genuinely empty rather than padded with sample rows.
        <p className="text-[10px] text-zinc-400 font-mono">
          No activity yet. Reminders, payments and client changes appear here as they happen.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const Icon = ICONS[r.eventType] ?? Activity;
            return (
              <div key={r.id} className="flex items-start gap-3 text-xs pb-3 border-b border-zinc-100 last:border-0 last:pb-0">
                <span className="w-7 h-7 shrink-0 rounded-full bg-[#abc6d8]/15 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-[#0d2227]" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[#0d2227] block">{describe(r)}</span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    {r.actor} · {ago(r.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
