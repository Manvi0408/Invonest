'use client';

import React, { useState, useRef, useEffect } from 'react';

/**
 * Wraps a KPI card and shows an Apple-style liquid-glass popover on hover /
 * focus / tap, explaining how the headline number was derived.
 *
 * The popover is the explanation the user asked for — "why is Outstanding
 * ₹7.35L" — rendered as a frosted panel with the line-item breakdown the
 * caller passes in.
 */
export default function KpiDetail({
  children,
  title,
  rows,
  total,
  note,
}: {
  children: React.ReactNode;
  title: string;
  rows: Array<{ label: string; value: string; muted?: boolean }>;
  total?: { label: string; value: string };
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tap-outside closes it on touch devices, where there's no mouseleave.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* The card itself. role/tabIndex so keyboard + tap can open the detail. */}
      <div
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="cursor-pointer outline-none rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/40"
      >
        {children}
      </div>

      {open && (
        <div
          role="tooltip"
          className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl p-4 text-left animate-[kpiIn_.16s_ease-out]"
          style={{
            background: 'rgba(20, 20, 24, 0.62)',
            backdropFilter: 'blur(22px) saturate(150%)',
            WebkitBackdropFilter: 'blur(22px) saturate(150%)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 20px 50px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/50 mb-2.5">
            {title}
          </div>
          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <div key={i} className="flex justify-between items-baseline gap-4 text-xs">
                <span className={r.muted ? 'text-white/45' : 'text-white/75'}>{r.label}</span>
                <span className={`font-mono ${r.muted ? 'text-white/45' : 'text-white/90 font-semibold'}`}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
          {total && (
            <div className="flex justify-between items-baseline gap-4 text-xs mt-2.5 pt-2.5 border-t border-white/12">
              <span className="font-bold text-white">{total.label}</span>
              <span className="font-mono font-extrabold text-white">{total.value}</span>
            </div>
          )}
          {note && <p className="text-[10px] text-white/45 mt-2.5 leading-snug">{note}</p>}
        </div>
      )}
    </div>
  );
}
