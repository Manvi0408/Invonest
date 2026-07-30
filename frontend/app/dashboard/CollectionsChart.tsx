'use client';

import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from 'recharts';
import { useDashboard } from './DashboardProvider';

/**
 * Weekly collections, in the reference's pill-bar style.
 *
 * Built from real invoices — each bar is the value of invoices due on that
 * weekday. The reference alternates a dark and a cream bar; here the darker
 * fill marks the heaviest day rather than alternating decoratively, so the
 * colour carries information instead of just rhythm.
 */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CollectionsChart() {
  const { invoices } = useDashboard();

  const { data, total, peak } = useMemo(() => {
    const buckets = DAYS.map((d) => ({ day: d, value: 0 }));
    for (const inv of invoices) {
      if (inv.status === 'PAID') continue;
      const d = new Date(inv.dueDate);
      if (Number.isNaN(d.getTime())) continue;
      // getDay(): 0 = Sunday. Shift so Monday is index 0.
      buckets[(d.getDay() + 6) % 7].value += inv.amount;
    }
    const total = buckets.reduce((s, b) => s + b.value, 0);
    const peak = buckets.reduce((m, b) => (b.value > m ? b.value : m), 0);
    return { data: buckets, total, peak };
  }, [invoices]);

  const lakh = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

  return (
    <div className="bg-white rounded-2xl p-6">
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="z-label z-muted">Collections due this week</span>
          <div className="z-figure text-3xl mt-1">{lakh(total)}</div>
        </div>
        <span className="text-[11px] z-muted font-semibold">
          Across {invoices.filter((i) => i.status !== 'PAID').length} open invoices
        </span>
      </div>

      {total === 0 ? (
        <p className="text-[11px] z-muted font-mono py-10 text-center">
          Nothing due this week.
        </p>
      ) : (
        <div className="h-[220px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 0, left: -18, bottom: 0 }} barCategoryGap="28%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#7b776f', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#b6b1a8', fontSize: 10 }}
                tickFormatter={(v) => (v === 0 ? '0' : `${Math.round(v / 100000)}L`)}
                width={44}
              />
              <Tooltip
                cursor={{ fill: 'rgba(28,28,28,0.04)' }}
                formatter={(v: any) => [lakh(Number(v)), 'Due']}
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(28,28,28,0.14)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              {/* Large radius on all four corners is what gives the pill shape. */}
              <Bar dataKey="value" radius={[14, 14, 14, 14]} background={{ fill: '#efece4', radius: 14 } as any}>
                {data.map((d) => (
                  <Cell key={d.day} fill={d.value === peak && peak > 0 ? '#232323' : '#cddcc0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
