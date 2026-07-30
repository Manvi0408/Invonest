'use client';

import React from 'react';

/**
 * Two-row testimonial marquee. The top row drifts left, the bottom row drifts
 * right, so the section reads as a living wall of quotes rather than one static
 * card.
 *
 * The scroll is pure CSS (`@keyframes marquee-*` in globals.css) on a track that
 * holds the list twice — translating exactly -50% lands the copy back on an
 * identical frame, so the loop is seamless with no per-frame JS. Hovering a row
 * pauses it (`:hover { animation-play-state: paused }`) so a quote can be read.
 *
 * Avatars are initials in tinted circles, not photographs: these are
 * illustrative testimonials for a demo, and inventing faces of real-looking
 * people would misrepresent them.
 */

interface Quote {
  text: string;
  name: string;
  role: string;
  tint: string;
}

const QUOTES: Quote[] = [
  { text: 'The AI CFO runway projections completely redefined our fundraising cycle. Best team we’ve worked with.', name: 'Laura L.', role: 'CMO, Fintech Ventures', tint: '#6366f1' },
  { text: 'We cut our average collection time from 41 days to 19. The escalation ladder just works.', name: 'Devan R.', role: 'Head of Finance, Nimbus SaaS', tint: '#10b981' },
  { text: 'The overdue-risk scoring flagged our biggest default three weeks before it happened.', name: 'Priya S.', role: 'Controller, Meridian Textiles', tint: '#f59e0b' },
  { text: 'Cash-flow forecasting that actually reflects reality. Our board reviews start here now.', name: 'Marcus T.', role: 'CEO, Harbor Logistics', tint: '#ec4899' },
  { text: 'Onboarding took an afternoon. The ledger sync was live before our first standup ended.', name: 'Ana G.', role: 'Ops Lead, Brightline', tint: '#0ea5e9' },
  { text: 'The Copilot answers ledger questions faster than I can open the spreadsheet.', name: 'Tom W.', role: 'Founder, Cedar & Co', tint: '#8b5cf6' },
  { text: 'WhatsApp escalation lifted our reminder response rate by nearly 40%. Clients actually reply.', name: 'Sofia M.', role: 'AR Manager, Volt Retail', tint: '#ef4444' },
  { text: 'We finally have one honest number for runway instead of five people’s guesses.', name: 'Kenji A.', role: 'CFO, Northwind', tint: '#14b8a6' },
];

function Card({ q }: { q: Quote }) {
  return (
    <div
      className="w-[320px] md:w-[380px] shrink-0 rounded-2xl p-6 mx-3 flex flex-col justify-between border"
      style={{
        // No backdrop-filter: these 16 cards scroll continuously on a jet-black
        // section, so a blur has nothing to blur — it was pure GPU cost per frame.
        // A flat translucent fill looks identical over black.
        background: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.1)',
        boxShadow: '0 16px 40px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <p className="text-sm text-white/85 leading-relaxed">“{q.text}”</p>
      <div className="flex items-center gap-3 mt-5">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0"
          style={{ backgroundColor: q.tint }}
        >
          {q.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
        </span>
        <div className="min-w-0">
          <div className="font-extrabold text-xs uppercase text-white truncate">{q.name}</div>
          <div className="text-[10px] text-white/50 font-bold uppercase truncate">{q.role}</div>
        </div>
      </div>
    </div>
  );
}

/** One row. `dir` picks which keyframe (and therefore direction) it runs. */
function Row({ quotes, dir }: { quotes: Quote[]; dir: 'left' | 'right' }) {
  return (
    <div className="marquee-row group overflow-hidden">
      {/* The list is rendered twice; -50% translate loops seamlessly. */}
      <div
        className="flex w-max"
        style={{
          animation: `marquee-${dir} 46s linear infinite`,
        }}
      >
        {[...quotes, ...quotes].map((q, i) => (
          <Card key={`${dir}-${i}`} q={q} />
        ))}
      </div>
    </div>
  );
}

export default function Testimonials() {
  const top = QUOTES.slice(0, 4);
  const bottom = QUOTES.slice(4);
  return (
    <div className="space-y-6">
      <Row quotes={top} dir="left" />
      <Row quotes={bottom} dir="right" />
    </div>
  );
}
