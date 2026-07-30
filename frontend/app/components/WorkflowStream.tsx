'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * The four-step automation trace, as a dark panel with a signal that travels
 * left to right on a loop.
 *
 * The cascade is driven by one `step` counter rather than per-node animations,
 * so the arrows and the tiles can never drift out of sync — the arrow between
 * A and B is lit exactly while the signal is between them, by construction.
 */
const STEPS = [
  { icon: '$', title: 'Payment Received', sub: 'via Stripe Integration', tint: '#60a5fa' },
  { icon: '✓', title: 'Invoice Updated', sub: 'in InvoNest Ledger', tint: '#c084fc' },
  { icon: '📈', title: 'Forecast Recalculated', sub: 'Cash flow runway updated', tint: '#34d399' },
  { icon: '🔔', title: 'Slack Alert Sent', sub: 'Finance team notified', tint: '#fbbf24' },
];

/** Milliseconds each tile stays lit before the signal moves on. */
const BEAT = 900;

export default function WorkflowStream() {
  const reduce = useReducedMotion();
  // -1 = idle. Runs 0..3, then pauses a beat before restarting.
  const [step, setStep] = useState(reduce ? STEPS.length - 1 : 0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setStep((s) => (s + 1) % (STEPS.length + 1)), BEAT);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div
      className="mt-16 max-w-4xl mx-auto rounded-2xl p-5 md:p-6 border border-white/10"
      style={{
        background: 'linear-gradient(160deg, #14161c 0%, #0a0c11 60%, #07080c 100%)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] text-white/40 font-mono">
          Live automation trace
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-300/80">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={reduce ? {} : { opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          RUNNING
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-2.5">
        {STEPS.map((s, i) => {
          const active = step === i;
          const done = step > i;
          return (
            <React.Fragment key={s.title}>
              <motion.div
                className="flex items-center gap-3 p-3 rounded-xl flex-1 min-w-0 border"
                animate={{
                  borderColor: active ? `${s.tint}66` : 'rgba(255,255,255,0.07)',
                  backgroundColor: active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
                  // Lifting the active tile is what sells the depth; a flat
                  // colour change alone reads as a hover state, not a signal.
                  y: active ? -3 : 0,
                  boxShadow: active
                    ? `0 10px 24px -8px ${s.tint}55, inset 0 1px 0 rgba(255,255,255,0.08)`
                    : '0 0 0 rgba(0,0,0,0), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.span
                  className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                  animate={{
                    backgroundColor: active || done ? `${s.tint}26` : 'rgba(255,255,255,0.06)',
                    color: active || done ? s.tint : 'rgba(255,255,255,0.5)',
                    scale: active ? 1.08 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {s.icon}
                </motion.span>
                <div className="min-w-0">
                  <span className="text-xs font-bold block text-white truncate">{s.title}</span>
                  <span className="text-[9px] block font-medium text-white/45 truncate">{s.sub}</span>
                </div>
              </motion.div>

              {i < STEPS.length - 1 && (
                <div className="hidden md:flex items-center justify-center w-8 shrink-0 relative">
                  {/* Rail the pulse travels along. */}
                  <div className="absolute inset-x-0 h-[2px] rounded-full bg-white/10" />
                  {/* The pulse itself — only runs while the signal is crossing
                      this exact gap, which is why it never desyncs. */}
                  {step === i + 1 && !reduce && (
                    <motion.div
                      className="absolute h-[2px] w-3 rounded-full"
                      style={{ background: `linear-gradient(90deg, transparent, ${STEPS[i + 1].tint})` }}
                      initial={{ left: '-10%', opacity: 0 }}
                      animate={{ left: '100%', opacity: [0, 1, 0] }}
                      transition={{ duration: BEAT / 1000, ease: 'easeInOut' }}
                    />
                  )}
                  {/* Chevron. The offset dark copy behind gives it a bevel
                      instead of a flat glyph. */}
                  <span className="relative leading-none">
                    <span className="absolute inset-0 translate-y-[1px] text-black/70 select-none">›</span>
                    <motion.span
                      className="relative block text-lg font-bold"
                      animate={{
                        color: step > i ? STEPS[i + 1].tint : 'rgba(255,255,255,0.28)',
                        textShadow: step > i ? `0 0 12px ${STEPS[i + 1].tint}99` : '0 0 0 transparent',
                        x: step === i + 1 ? [0, 3, 0] : 0,
                      }}
                      transition={{ duration: 0.45 }}
                    >
                      ›
                    </motion.span>
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
