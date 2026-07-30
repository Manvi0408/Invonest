'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { Activity, Briefcase, MessageSquare, UploadCloud, ShieldAlert, TrendingUp, Zap, Sparkles } from 'lucide-react';

/**
 * Apple-keynote-style floating annotations for the "See the Platform in Action"
 * tour.
 *
 * The tour is an interactive React mockup, not an <video>, so its "playback
 * position" is the `activeTab` index the section already owns. This card is a
 * pure function of that index — it holds NO timer of its own. So it inherits
 * every behaviour for free: pause the tour and the card freezes; click a feature
 * (tab / sidebar / dot) and the card jumps to it instantly; the loop that wraps
 * activeTab %7 restarts the sequence. Exactly one card is ever mounted, keyed by
 * the index, with AnimatePresence handling the cinematic in/out.
 *
 * On wide screens each card floats FULLY outside the frame in the side gutter
 * (alternating left / right), connected to the video by a small inward tail —
 * like the reference tooltip. Below xl it drops to a centred card under the
 * frame so it never overlaps the mockup or overflows the page.
 */

type Feature = {
  title: string;
  desc: string;
  side: 'left' | 'right';
  Icon: React.ComponentType<{ className?: string }>;
  ai?: boolean;
};

// Order matches the tour's 7 tabs / sidebar / dots (activeTab 0–6), alternating side.
const FEATURES: Feature[] = [
  { title: 'Overview', desc: 'Monitor outstanding revenue, recovery performance and business health in one intelligent dashboard.', side: 'left', Icon: Activity },
  { title: 'Accounts Receivable', desc: 'Track every invoice, overdue payment and customer balance in real time.', side: 'right', Icon: Briefcase },
  { title: 'AI CFO Chat', desc: 'Ask financial questions in natural language and receive instant recommendations.', side: 'left', Icon: MessageSquare, ai: true },
  { title: 'Invoice OCR', desc: 'Automatically extract invoice information using AI with zero manual entry.', side: 'right', Icon: UploadCloud, ai: true },
  { title: 'Risk Engine', desc: 'Predict customer payment risk using historical behaviour and AI.', side: 'left', Icon: ShieldAlert, ai: true },
  { title: 'Cash Forecast', desc: 'Forecast future cash flow using intelligent scenario modelling.', side: 'right', Icon: TrendingUp, ai: true },
  { title: 'Automation', desc: 'Automatically send reminders, payment links and collection workflows.', side: 'left', Icon: Zap },
];

export default function PlatformAnnotations({ activeTab }: { activeTab: number }) {
  const feature = FEATURES[activeTab % FEATURES.length];
  const reduce = useReducedMotion();
  const isLeft = feature.side === 'left';

  // Cursor parallax — tiny rotation toward the pointer, spring-smoothed. Written
  // to motion values (no React re-render), so it stays at 60fps.
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 120, damping: 18, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 120, damping: 18, mass: 0.4 });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      ry.set(Math.max(-6, Math.min(6, ((e.clientX - cx) / window.innerWidth) * 26)));
      rx.set(Math.max(-6, Math.min(6, (-(e.clientY - cy) / window.innerHeight) * 26)));
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [reduce, rx, ry]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={[
        // Mobile / tablet / lg: centred card under the frame — never overlaps.
        'absolute left-1/2 -translate-x-1/2 -bottom-4 w-[86%] max-w-[260px] z-20 pointer-events-none',
        // xl+: float FULLY outside the frame in the side gutter, vertically centred.
        'xl:top-1/2 xl:bottom-auto xl:-translate-y-1/2 xl:translate-x-0 xl:w-[220px] xl:max-w-none',
        isLeft
          ? 'xl:left-auto xl:right-[calc(100%_+_22px)]'
          : 'xl:right-auto xl:left-[calc(100%_+_22px)]',
      ].join(' ')}
      style={{ perspective: 1200 }}
    >
      {/* One card, re-keyed by activeTab. Remounting on key change guarantees the
          content always tracks the tour — no AnimatePresence, so nothing can gate
          the swap (an infinite idle animation under mode="wait" was freezing it).
          The entry animation replays on every change for the cinematic feel. */}
      <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.9, y: 24, rotateX: reduce ? 0 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.6 }}
          style={{
            transformStyle: 'preserve-3d',
            rotateX: reduce ? 0 : srx,
            rotateY: reduce ? 0 : sry,
            willChange: 'transform, opacity',
          }}
        >
          {/* Gentle idle float — CSS-driven so nothing blocks the remount. */}
          <div
            className="relative rounded-[24px] p-5 bg-white"
            style={{
              border: '1px solid rgba(13,34,39,0.06)',
              boxShadow:
                '0 26px 60px -22px rgba(8,12,20,0.5), 0 6px 16px -8px rgba(8,12,20,0.25), inset 0 1px 0 rgba(255,255,255,0.9)',
              animation: reduce ? undefined : 'annFloat 7s ease-in-out infinite',
            }}
          >
            {/* Inward tail — a small white diamond on the edge nearest the video,
                only shown on xl+ where the card sits in the gutter. */}
            <div
              className={`hidden xl:block absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rotate-45 ${
                isLeft ? 'right-[-6px]' : 'left-[-6px]'
              }`}
              style={{
                borderRight: isLeft ? '1px solid rgba(13,34,39,0.06)' : 'none',
                borderTop: isLeft ? '1px solid rgba(13,34,39,0.06)' : 'none',
                borderLeft: !isLeft ? '1px solid rgba(13,34,39,0.06)' : 'none',
                borderBottom: !isLeft ? '1px solid rgba(13,34,39,0.06)' : 'none',
              }}
            />

            <div className="relative">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span
                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #0d2227, #33586a)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 14px -6px rgba(13,34,39,0.7)',
                  }}
                >
                  <feature.Icon className="w-4 h-4" />
                </span>
                {feature.ai && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#0d2227] bg-[#abc6d8]/25 border border-[#abc6d8]/40 rounded-full px-2 py-0.5 font-mono">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-extrabold text-[#0d2227] leading-tight tracking-tight">{feature.title}</h3>
              <p className="text-[11.5px] leading-relaxed text-[#0d2227]/60 font-medium mt-1.5">{feature.desc}</p>
            </div>
          </div>
        </motion.div>
    </div>
  );
}
