'use client';

import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import type { PlanState } from '../lib/usePlan';

/**
 * Chatbot-credit meter for the AI Copilot input row.
 *
 * Renders three distinct states rather than disappearing:
 *   - loading  → muted placeholder
 *   - error    → "Credits unavailable" (the billing lookup failed)
 *   - loaded   → used/limit, top-up balance, progress bar
 *
 * Colour escalates neutral → amber (≥70% spent) → red (≥90% or exhausted).
 */

interface Props {
  plan: PlanState | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export default function CreditsCounter({ plan, loading, error, className = '' }: Props) {
  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-[10px] font-mono text-zinc-400 ${className}`}>
        <Zap className="w-3 h-3" />
        <span>Loading credits…</span>
      </div>
    );
  }

  // Explicit, visible failure state — the whole point of the usePlan error flag.
  if (error || !plan) {
    return (
      <div
        className={`flex items-center gap-2 text-[10px] font-mono text-zinc-400 ${className}`}
        title={error || 'Plan details could not be loaded.'}
      >
        <AlertTriangle className="w-3 h-3" />
        <span>Credits unavailable</span>
      </div>
    );
  }

  const c = plan.quotas.chatbot_credits;
  const topup = c.topupBalance ?? 0;

  if (c.unlimited || c.limit === null) {
    return (
      <div className={`flex items-center gap-2 text-[10px] font-mono text-zinc-500 ${className}`}>
        <Zap className="w-3 h-3 text-[#0d2227]" />
        <span className="font-bold text-[#0d2227]">Unlimited credits</span>
      </div>
    );
  }

  const used = c.used;
  const limit = c.limit;
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100);
  const grantRemaining = c.remaining ?? Math.max(0, limit - used);
  const totalRemaining = grantRemaining + topup;

  const exhausted = totalRemaining <= 0;
  const tone =
    exhausted || pct >= 90
      ? { text: 'text-red-600', bar: '#dc2626', label: 'text-red-600' }
      : pct >= 70
        ? { text: 'text-amber-600', bar: '#d97706', label: 'text-amber-600' }
        : { text: 'text-[#0d2227]', bar: '#0d2227', label: 'text-zinc-500' };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Zap className={`w-3 h-3 ${tone.text}`} />
          <span className={`text-[10px] font-mono font-bold ${tone.text}`}>
            {used.toLocaleString('en-IN')} / {limit.toLocaleString('en-IN')} credits
          </span>
          {topup > 0 && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700"
              title="Purchased top-ups carry over past the monthly reset"
            >
              +{topup.toLocaleString('en-IN')} top-up
            </span>
          )}
        </div>
        <span className={`text-[9px] font-mono ${tone.label}`}>
          {exhausted ? 'exhausted' : `${totalRemaining.toLocaleString('en-IN')} left`}
        </span>
      </div>

      <div className="h-1 rounded-full bg-zinc-200/70 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: tone.bar }}
        />
      </div>
    </div>
  );
}
