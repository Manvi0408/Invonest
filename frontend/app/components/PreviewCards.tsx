'use client';

import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

/**
 * The two dashboard preview cards, assembling from scattered glass fragments.
 *
 * Nothing here is ever opaque: the card shell, every fragment, and every badge
 * stay translucent from the first frame of the animation through to the settled
 * state. Only the text itself reaches full opacity, so it stays readable.
 */

/** Shared glass — deliberately low-alpha so the video reads through. */
const GLASS: React.CSSProperties = {
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
};

/** Fragments carry the same treatment, just a touch brighter to read as pieces. */
const FRAGMENT_GLASS: React.CSSProperties = {
  backdropFilter: 'blur(12px) saturate(150%)',
  WebkitBackdropFilter: 'blur(12px) saturate(150%)',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.13)',
};

const TEXT_SHADOW = '0 1px 4px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.45)';

/** Each fragment starts as a small circle flung out in 3D, then morphs into place. */
function fragment(dx: number, dy: number, radius = '10px'): Variants {
  return {
    hidden: {
      x: dx,
      y: dy,
      z: -260,
      scale: 0.28,
      borderRadius: '9999px',
      rotateX: -45,
      rotateY: dx > 0 ? 35 : -35,
      opacity: 0,
    },
    show: {
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      borderRadius: radius,
      rotateX: 0,
      rotateY: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 120, damping: 17, mass: 0.9 },
    },
  };
}

/** Text lags its fragment slightly so it appears as the shape settles. */
const textIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] } },
};

const shellIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const container = (delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: delay } },
});

const DSO_BARS = [
  { h: '80%', label: 'Feb', accent: false },
  { h: '66%', label: 'Mar', accent: false },
  { h: '50%', label: 'Apr', accent: false },
  { h: '60%', label: 'May', accent: false },
  { h: '44%', label: 'Jun', accent: true },
];

const AGING_BARS = [
  { h: '30%', accent: false },
  { h: '48%', accent: false },
  { h: '92%', accent: true },
];

export default function PreviewCards({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion();

  // Reduced motion: no scatter, no 3D — just a plain fade to the settled state.
  const v = (dx: number, dy: number, r?: string): Variants =>
    reduce
      ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } }
      : fragment(dx, dy, r);

  const shell = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } }
    : shellIn;

  const stagger = (d: number) =>
    reduce ? { hidden: {}, show: { transition: { delayChildren: 0 } } } : container(d);

  return (
    // Stacked vertically with a slight offset on the second card, echoing the
    // staggered floating-card look from the live landing page.
    <div className={`flex-col gap-4 ${className}`} style={{ perspective: 1200 }}>
      {/* ---------------- Card 1 — Days Sales Outstanding ---------------- */}
      <motion.div
        variants={stagger(0)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
        className="relative rounded-2xl p-5 w-[340px]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Shell fades in behind the fragments; never becomes solid. */}
        <motion.div variants={shell} className="absolute inset-0 rounded-2xl" style={GLASS} />

        <div className="relative">
          <motion.div
            variants={v(-70, -50, '6px')}
            style={FRAGMENT_GLASS}
            className="inline-block px-2 py-1 rounded-md"
          >
            <motion.span
              variants={textIn}
              style={{ textShadow: TEXT_SHADOW }}
              className="block text-[11px] font-bold uppercase tracking-wider text-white"
            >
              Days Sales Outstanding
            </motion.span>
          </motion.div>

          <div className="flex items-center gap-2 mt-2">
            <motion.div variants={v(-90, 60, '8px')} className="inline-block">
              <motion.span
                variants={textIn}
                style={{ textShadow: TEXT_SHADOW }}
                className="block text-[38px] leading-none font-extrabold text-white"
              >
                30 days
              </motion.span>
            </motion.div>

            <motion.div
              variants={v(85, -40, '9999px')}
              style={{
                ...FRAGMENT_GLASS,
                background: 'rgba(52,211,153,0.16)',
                border: '1px solid rgba(52,211,153,0.42)',
              }}
              className="px-2 py-0.5 rounded-full"
            >
              <motion.span
                variants={textIn}
                style={{ textShadow: TEXT_SHADOW }}
                className="block text-[11px] font-bold text-emerald-200 whitespace-nowrap"
              >
                ↘ -8 days
              </motion.span>
            </motion.div>
          </div>

          <div className="flex items-end gap-1.5 h-[72px] mt-4">
            {DSO_BARS.map((b, i) => (
              <motion.div
                key={b.label}
                variants={v(i % 2 ? 70 : -70, 70 + i * 8, '4px')}
                style={{
                  ...FRAGMENT_GLASS,
                  height: b.h,
                  ...(b.accent
                    ? { background: 'rgba(52,211,153,0.30)', border: '1px solid rgba(52,211,153,0.50)' }
                    : {}),
                }}
                className="flex-1 rounded-[4px]"
              />
            ))}
          </div>

          <motion.div variants={v(0, 55, '4px')} className="flex justify-between mt-1.5">
            {DSO_BARS.map((b) => (
              <motion.span
                key={b.label}
                variants={textIn}
                style={{ textShadow: TEXT_SHADOW }}
                className="text-[10px] font-mono text-white/80"
              >
                {b.label}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ---------------- Card 2 — Aging Balance (starts ~180ms later) ---------------- */}
      <motion.div
        variants={stagger(0.18)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
        className="relative rounded-2xl p-5 w-[320px] self-start"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div variants={shell} className="absolute inset-0 rounded-2xl" style={GLASS} />

        <div className="relative">
          <motion.div
            variants={v(75, -55, '6px')}
            style={FRAGMENT_GLASS}
            className="inline-block px-2 py-1 rounded-md"
          >
            <motion.span
              variants={textIn}
              style={{ textShadow: TEXT_SHADOW }}
              className="block text-[9px] font-bold uppercase tracking-wider text-white"
            >
              Aging Balance
            </motion.span>
          </motion.div>

          <div className="relative h-[104px] mt-4">
            {/* Value markers */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {['$400k', '$200k'].map((m, i) => (
                <motion.div key={m} variants={v(i ? -80 : 80, i ? 50 : -30, '4px')}>
                  <motion.span
                    variants={textIn}
                    style={{ textShadow: TEXT_SHADOW }}
                    className="text-[10px] font-mono text-white/75"
                  >
                    {m}
                  </motion.span>
                </motion.div>
              ))}
            </div>

            <div className="absolute inset-0 flex items-end justify-end gap-2.5 pl-12">
              {AGING_BARS.map((b, i) => (
                <motion.div
                  key={i}
                  variants={v(i % 2 ? -65 : 65, 75 + i * 10, '4px')}
                  style={{
                    ...FRAGMENT_GLASS,
                    height: b.h,
                    ...(b.accent
                      ? { background: 'rgba(96,165,250,0.32)', border: '1px solid rgba(96,165,250,0.52)' }
                      : {}),
                  }}
                  className="w-12 rounded-[5px] relative"
                >
                  {b.accent && (
                    <motion.span
                      variants={textIn}
                      style={{ textShadow: TEXT_SHADOW }}
                      className="absolute -top-4 left-1/2 -translate-x-1/2 text-[11px] font-bold text-blue-200"
                    >
                      Due
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
