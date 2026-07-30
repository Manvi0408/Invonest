'use client';

/* Extracted from the old single-page dashboard so each sidebar item opens its own
   route. Shared state comes from <DashboardProvider> in layout.tsx. */

import React from 'react';
import Link from 'next/link';
import { Heart, ArrowDown, ArrowUp, Activity, ArrowRight } from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import UpgradePrompt from '../components/UpgradePrompt';
import {
  computeBadDebtRisk,
  computeCollectionSpeed,
  BAD_DEBT_INDUSTRY_THRESHOLD_PCT,
  WRITE_OFF_DAYS,
} from './liquidityMetrics';
import { useRunway, RUNWAY_REASON_COPY } from './useRunway';
import ActivityFeed from './ActivityFeed';
import CollectionsChart from './CollectionsChart';
import KpiDetail from './KpiDetail';

export default function DashboardOverviewPage() {
  const { invoices, totalOutstanding, totalOverdue, recoveryRate, clients, kpiBreakdown, upgrade, setUpgrade } = useDashboard();

  const badDebt = React.useMemo(() => computeBadDebtRisk(invoices), [invoices]);
  const speed = React.useMemo(() => computeCollectionSpeed(invoices), [invoices]);
  const { runway, loading: runwayLoading, error: runwayError } = useRunway();

  const inLakh = (n: number) => `₹${(n / 100000).toFixed(2)}L`;
  const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  // Per-client outstanding rows, largest first — the "why is it this number"
  // breakdown behind the Outstanding and At-Risk cards.
  const clientRows = [...clients]
    .filter((c) => c.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .map((c) => ({ label: c.name, value: rupee(c.outstandingBalance) }));

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="z-on-canvas mb-2">
        <h1 className="text-lg font-extrabold text-[#0d2227]">Overview Panel</h1>
        <p className="text-[11px] text-zinc-500 font-mono">Portfolio-wide receivable metrics</p>
      </header>

      {/* KPI row — hover/tap any card for a liquid-glass breakdown of the number. */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiDetail
          title="Outstanding by client"
          rows={clientRows.length ? clientRows : [{ label: 'No open balances', value: '—', muted: true }]}
          total={{ label: 'Total outstanding', value: rupee(totalOutstanding) }}
          note="Sum of every active client's current balance. Adding, removing, or editing a client moves this."
        >
          <div className="z-stat z-stat-sage relative">
            <div className="flex items-start justify-between mb-6">
              <span className="z-label">Outstanding</span>
              <span className="z-delta">₹</span>
            </div>
            <div className="z-figure text-[28px]">₹{(totalOutstanding / 100000).toFixed(2)}L</div>
            <span className="text-[11px] mt-1.5 block opacity-65">{clients.length} client{clients.length === 1 ? '' : 's'}</span>
          </div>
        </KpiDetail>

        <KpiDetail
          title="Recovery rate"
          rows={[
            { label: 'Invoices paid', value: `${kpiBreakdown.paidCount}` },
            { label: 'Total invoices', value: `${kpiBreakdown.invoiceCount}` },
          ]}
          total={{ label: 'Settled', value: `${recoveryRate}%` }}
          note="Paid invoices as a share of all invoices issued."
        >
          <div className="z-stat z-stat-amber relative">
            <div className="flex items-start justify-between mb-6">
              <span className="z-label">Recovery Rate</span>
              <span className="z-delta">+4%</span>
            </div>
            <div className="z-figure text-[28px]">{recoveryRate}%</div>
            <span className="text-[11px] mt-1.5 block opacity-65">Settled vs issued</span>
          </div>
        </KpiDetail>

        <KpiDetail
          title="At-risk breakdown"
          rows={[
            { label: 'Overdue invoices', value: rupee(kpiBreakdown.invoiceOverdue) },
            { label: 'Manually-added client balances', value: rupee(kpiBreakdown.manualExtra), muted: kpiBreakdown.manualExtra === 0 },
          ]}
          total={{ label: 'Total at risk', value: rupee(totalOverdue) }}
          note="Overdue invoice value plus the overdue amount entered for clients that have no invoices yet."
        >
          <div className="z-stat z-stat-iris relative">
            <div className="flex items-start justify-between mb-6">
              <span className="z-label">At Risk</span>
              <span className="z-delta">!</span>
            </div>
            <div className="z-figure text-[28px]">₹{(totalOverdue / 100000).toFixed(2)}L</div>
            <span className="text-[11px] mt-1.5 block opacity-65">Overdue exposure</span>
          </div>
        </KpiDetail>

        <KpiDetail
          title="Runway calculation"
          rows={
            runway?.runwayMonths != null
              ? [
                  { label: 'Cash position', value: rupee(runway.cashPosition ?? 0) },
                  { label: 'Net burn / month', value: rupee(runway.netBurn ?? 0) },
                  { label: 'Averaging window', value: `${runway.windowMonths} months` },
                ]
              : [{ label: 'No expense data yet', value: '—', muted: true }]
          }
          total={runway?.runwayMonths != null ? { label: 'Runway', value: `${runway.runwayMonths} months` } : undefined}
          note="Cash position divided by average monthly net burn."
        >
          <div className="z-stat bg-white relative border border-[rgba(28,28,28,0.08)]">
            <div className="flex items-start justify-between mb-6">
              <span className="z-label">Forecast Runway</span>
              <span className="z-delta bg-[#f1ede4]">⏱</span>
            </div>
            <div className={`z-figure text-[28px] ${runway?.runwayMonths == null ? 'opacity-30' : ''}`}>
              {runwayLoading ? '···' : runway?.runwayMonths == null ? '—' : `${runway.runwayMonths} mo`}
            </div>
            <span className="text-[11px] mt-1.5 block z-muted">
              {runway?.runwayMonths != null
                ? `${inLakh(runway.netBurn ?? 0)}/mo net burn`
                : 'Connect expense data'}
            </span>
          </div>
        </KpiDetail>
      </div>

      {/* Weekly collections, pill bars, from real invoice due dates. */}
      <CollectionsChart />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
        {/* CLIENT HEALTH SCOREBOARD */}
        <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-[#0d2227]">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-[#0d2227]">Client Health Scoreboard</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Categorized settlement metrics</p>
              </div>
              <Heart className="w-4 h-4 text-[#abc6d8]" />
            </div>

            <div className="space-y-3.5">
              {[
                { name: 'ABC Corp', score: 17, category: 'CRITICAL', reliability: 40, contribution: 15, limit: '₹1L' },
                { name: 'XYZ Ltd', score: 74, category: 'MONITOR', reliability: 74, contribution: 25, limit: '₹3L' },
                { name: 'Acquirer Corp', score: 16, category: 'CRITICAL', reliability: 35, contribution: 60, limit: '₹2L' }
              ].map((c, i) => (
                <div key={i} className="flex justify-between items-center text-xs pb-3 border-b border-zinc-100 last:border-0 last:pb-0">
                  <div>
                    <span className="font-semibold text-[#0d2227] block">{c.name}</span>
                    <span className="text-[9px] font-mono text-zinc-500">Credit Limit: {c.limit} | Contrib: {c.contribution}%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${c.category === 'CRITICAL' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                        {c.category}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">Reliability: {c.reliability}%</span>
                    </div>

                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[10px] ${c.score < 30 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                      {c.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Real event stream — queries ActivityLog, no hardcoded rows. */}
      <ActivityFeed />

      {/* LIQUIDITY PULSE */}
      <div>
        <header className="z-on-canvas mb-4">
          <h2 className="text-lg font-extrabold text-[#0d2227]">Liquidity Pulse</h2>
          <p className="text-[11px] text-zinc-500 font-mono">Cash Flow Overview</p>
          <p className="text-xs text-zinc-600 mt-2 max-w-2xl">
            Keep track of incoming collections, forecast runways, and accounts receivable
            efficiency metrics.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1 — Forecast Runway. Single point estimate up top, with the burn
              rate that produced it as the supporting line. No best/worst range
              until there's enough history to make one meaningful. */}
          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-[#abc6d8] transition-all duration-300 text-[#0d2227]">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
              Forecast Runway
            </span>
            <div
              className={`text-2xl font-extrabold ${runway?.runwayMonths == null ? 'text-zinc-300' : 'text-[#0d2227]'}`}
            >
              {runwayLoading
                ? '···'
                : runway?.runwayMonths == null
                  ? '—'
                  : `${runway.runwayMonths} months`}
            </div>

            <span className="text-[10px] text-zinc-400 mt-2 block">
              {runwayLoading
                ? 'Calculating…'
                : runwayError
                  ? 'Runway unavailable'
                  : runway?.runwayMonths != null
                    ? `${inLakh(runway.netBurn ?? 0)}/mo net burn · ${runway.windowMonths}-month average`
                    : runway?.unavailableReason
                      ? RUNWAY_REASON_COPY[runway.unavailableReason]
                      : 'Connect expense data to calculate runway'}
            </span>

            {/* The CTA only earns its place while there's nothing to show. */}
            {!runwayLoading && runway?.runwayMonths == null && (
              <Link
                href="/dashboard/expenses"
                className="text-[10px] font-bold text-[#0d2227] mt-1.5 inline-flex items-center gap-1 hover:gap-1.5 transition-all"
              >
                Connect expense data <ArrowRight className="w-3 h-3" />
              </Link>
            )}

            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#abc6d8]/10 flex items-center justify-center text-[#0d2227]">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 2 — Bad Debt Write-off Risk */}
          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-[#abc6d8] transition-all duration-300 text-[#0d2227]">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
              Bad Debt Write-off Risk
            </span>
            <div
              className={`text-2xl font-extrabold ${badDebt.pct === null ? 'text-zinc-300' : ''}`}
              style={
                badDebt.pct === null
                  ? undefined
                  : { color: `var(${badDebt.aboveThreshold ? '--text-danger' : '--text-success'})` }
              }
            >
              {badDebt.pct === null ? '—' : `${badDebt.pct.toFixed(1)}%`}
            </div>
            <span className="text-[10px] text-zinc-400 mt-2 block">
              {badDebt.pct === null
                ? 'Not enough data yet — no outstanding receivables'
                : `${badDebt.aboveThreshold ? 'Above' : 'Below'} ${BAD_DEBT_INDUSTRY_THRESHOLD_PCT}% industry threshold · ${badDebt.invoiceCount} invoice${badDebt.invoiceCount === 1 ? '' : 's'} ${WRITE_OFF_DAYS}+ days overdue`}
            </span>
            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 text-xs">
              !
            </div>
          </div>

          {/* 3 — Average Collection Speed */}
          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-[#abc6d8] transition-all duration-300 text-[#0d2227]">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
              Average Collection Speed
            </span>
            <div
              className={`text-2xl font-extrabold ${speed.currentDays === null ? 'text-zinc-300' : 'text-[#0d2227]'}`}
            >
              {speed.currentDays === null ? '—' : `${speed.currentDays} days`}
            </div>
            <span className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
              {speed.currentDays === null ? (
                'Not enough data yet — no invoices paid this quarter'
              ) : speed.improved === null ? (
                `Averaged over ${speed.sampleSize} paid invoice${speed.sampleSize === 1 ? '' : 's'} · no prior quarter to compare`
              ) : (
                <>
                  {speed.improved ? (
                    <ArrowDown className="w-3 h-3 shrink-0" style={{ color: 'var(--text-success)' }} />
                  ) : (
                    <ArrowUp className="w-3 h-3 shrink-0" style={{ color: 'var(--text-danger)' }} />
                  )}
                  {speed.improved ? 'Improved from' : 'Slower than'} {speed.priorDays} days last
                  quarter
                </>
              )}
            </span>
            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#abc6d8]/20 flex items-center justify-center text-[#0d2227] text-xs">
              ⏱
            </div>
          </div>
        </div>
      </div>

      {upgrade && (
        <UpgradePrompt
          trigger={upgrade.trigger}
          quota={upgrade.quota}
          resetAt={upgrade.resetAt}
          onClose={() => setUpgrade(null)}
        />
      )}
    </div>
  );
}
