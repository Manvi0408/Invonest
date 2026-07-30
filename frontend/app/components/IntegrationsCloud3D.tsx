'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PROVIDERS } from './integrationsData';

/**
 * Clay-style 3D floating integrations cloud.
 *
 * Only the providers InvoNest actually integrates (the 8 Phase-1 providers)
 * appear, as glossy liquid-glass tiles floating at varied depths with a soft
 * ambient glow and a mirrored reflection under each. Logos are the real brand
 * marks (simple-icons); Salesforce falls back to a monogram. Sizes convey
 * depth; a gentle, staggered float keeps it alive without a heavy 3D engine.
 */

const LAYOUT: Record<string, { x: number; y: number; size: number; delay: number }> = {
  QuickBooks: { x: 7, y: 56, size: 56, delay: 0.0 },
  Xero: { x: 21, y: 32, size: 72, delay: 0.5 },
  'Zoho Books': { x: 34, y: 58, size: 58, delay: 0.9 },
  Salesforce: { x: 48, y: 24, size: 88, delay: 0.2 },
  Stripe: { x: 61, y: 54, size: 66, delay: 0.7 },
  Gmail: { x: 74, y: 31, size: 76, delay: 0.35 },
  Razorpay: { x: 86, y: 56, size: 58, delay: 0.6 },
  WhatsApp: { x: 93, y: 42, size: 52, delay: 0.15 },
};

const TILES = PROVIDERS.map((p) => ({ ...p, ...LAYOUT[p.name] }));

export default function IntegrationsCloud3D() {
  const reduce = useReducedMotion();

  return (
    <div className="relative w-full max-w-4xl mx-auto h-[300px] md:h-[380px]" style={{ perspective: 1000 }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[65%] h-[55%] rounded-full blur-[90px]"
        style={{ background: 'radial-gradient(ellipse, rgba(80,120,210,0.22), transparent 70%)' }}
      />

      {TILES.map((t) => (
        <motion.div
          key={t.name}
          className="absolute will-change-transform"
          style={{ left: `${t.x}%`, top: `${t.y}%`, width: t.size, height: t.size, marginLeft: -t.size / 2, marginTop: -t.size / 2 }}
          animate={reduce ? {} : { y: [0, -12, 0] }}
          transition={reduce ? {} : { duration: 4.4 + t.delay, repeat: Infinity, ease: 'easeInOut', delay: t.delay }}
        >
          {/* Glass tile */}
          <div
            role="img"
            aria-label={t.name}
            className="relative w-full h-full rounded-[26%] flex items-center justify-center text-white overflow-hidden"
            style={{
              background: `linear-gradient(160deg, rgba(255,255,255,0.28), rgba(255,255,255,0) 42%), ${t.color}`,
              boxShadow: `0 20px 34px -12px ${t.color}66, 0 10px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -6px 14px rgba(0,0,0,0.28)`,
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[26%]"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.32), transparent)' }}
            />
            {t.icon ? (
              <svg viewBox="0 0 24 24" width={t.size * 0.5} height={t.size * 0.5} fill="#ffffff" className="relative drop-shadow" aria-hidden="true">
                <path d={t.icon} />
              </svg>
            ) : (
              <span className="relative font-extrabold tracking-tight" style={{ fontSize: t.size * 0.34 }}>{t.mono}</span>
            )}
          </div>

          {/* Mirrored reflection (glass-floor look) */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-[110%] w-full h-full rounded-[26%]"
            style={{
              background: `${t.color}`,
              transform: 'scaleY(-1)',
              opacity: 0.16,
              filter: 'blur(1px)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 72%)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 72%)',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
