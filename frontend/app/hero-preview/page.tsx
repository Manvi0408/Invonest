'use client';

/**
 * STANDALONE PREVIEW — not linked from anywhere and not part of the live site.
 * Exists so the hero can be reviewed before it replaces the real one in page.tsx.
 */

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { CheckCircle, ChevronDown } from 'lucide-react';
import VideoBackground from '../components/VideoBackground';
import PreviewCards from '../components/PreviewCards';
import QuickHelpChat from '../components/QuickHelpChat';

const NAV_ITEMS = ['Features', 'Product', 'Integrations', 'Pricing', 'About'] as const;

interface MenuEntry {
  initial: string;
  title: string;
  desc: string;
  tint: string; // icon chip colour, carried over from the live nav
}

/** Same content as the live landing-page nav, restyled for glass over video. */
const MENUS: Record<string, MenuEntry[]> = {
  Product: [
    { initial: 'C', title: 'AI CFO Advisor', desc: 'Check hiring & payroll limits', tint: '#c084fc' },
    { initial: 'S', title: 'Scenario Simulator', desc: 'Test operational changes', tint: '#60a5fa' },
    { initial: 'H', title: 'Client Health Score', desc: 'Track reliability ratings', tint: '#f472b6' },
    { initial: 'R', title: 'Risk Engine', desc: 'Payment curves & credits', tint: '#f87171' },
  ],
  Integrations: [
    { initial: 'N', title: 'Netsuite', desc: 'Your ERP data, actionable', tint: '#cbd5e1' },
    { initial: 'S', title: 'Sage Intacct', desc: 'Accelerate your cash collection', tint: '#4ade80' },
    { initial: 'S', title: 'Stripe Billing', desc: "When smart-retries won't cut it", tint: '#818cf8' },
    { initial: 'Z', title: 'Zuora', desc: 'Drive your cash collection', tint: '#2dd4bf' },
    { initial: 'C', title: 'Chargebee', desc: 'Deal with offline reminders', tint: '#fb923c' },
    { initial: 'Q', title: 'QuickBooks', desc: 'Maximize collection efficiency', tint: '#34d399' },
  ],
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** Free-mail providers we don't accept for a demo request. */
const PERSONAL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com',
  'hotmail.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com',
  'proton.me', 'protonmail.com', 'rediffmail.com', 'zoho.com', 'mail.com',
  'gmx.com', 'yandex.com',
];

/** Returns an error message, or null when the address is an acceptable work email. */
function validateWorkEmail(raw: string): string | null {
  const value = raw.trim();

  if (!value) return 'Please enter your email address.';

  // Missing "@" is its own, more useful message than a generic "invalid email".
  if (!value.includes('@')) {
    return `Please include an “@” in the email address. “${value}” is missing an “@”.`;
  }

  const parts = value.split('@');
  if (parts.length > 2) return 'An email address can only contain one “@”.';

  const [local, domain] = parts;
  if (!local) return 'Please enter the part before the “@”.';
  if (!domain) return 'Please enter your company domain after the “@”.';
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return `“${domain}” isn’t a valid domain — try something like yourcompany.com.`;
  }

  if (PERSONAL_DOMAINS.includes(domain.toLowerCase())) {
    return `That’s a personal address. Please use your company email — @${domain} isn’t a work domain.`;
  }

  return null;
}

export default function HeroPreview() {
  const heroRef = useRef<HTMLElement>(null);
  const [entranceDone, setEntranceDone] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const reduce = useReducedMotion();

  // With reduced motion we skip straight to the final state with a plain fade.
  const writeIn = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { clipPath: 'inset(0 100% 0 0)' },
          animate: { clipPath: 'inset(0 0% 0 0)' },
          transition: { delay, duration: 0.7, ease: EASE },
        };

  const blockReveal = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { filter: 'blur(12px)', opacity: 0 },
        animate: { filter: 'blur(0px)', opacity: 1 },
        transition: { delay: 0.9, duration: 0.7, ease: EASE },
      };

  const subtitle = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { y: 24, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { delay: 1.5, type: 'spring' as const, stiffness: 90, damping: 18 },
      };

  /* Liquid glass: the tint stays near-transparent and the *blur* does the work,
     so the footage reads through instead of sitting behind a grey slab. Legibility
     comes from saturation/brightness lift + text shadows, not opacity. */

  /* Contrast comes from `brightness(<1)` on the BACKDROP, not from an opaque fill.
     The video still shows through (low-alpha tint), but it's darkened enough behind
     the glass for white text to hold. Brightening it, as before, made white-on-fog
     unreadable. */

  const glass: React.CSSProperties = {
    backdropFilter: 'blur(24px) saturate(160%) brightness(0.62)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%) brightness(0.62)',
    background: 'rgba(18,20,24,0.18)',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow:
      '0 8px 28px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(255,255,255,0.08)',
  };

  const glassMenu: React.CSSProperties = {
    backdropFilter: 'blur(44px) saturate(170%) brightness(0.42)',
    WebkitBackdropFilter: 'blur(44px) saturate(170%) brightness(0.42)',
    background: 'rgba(14,16,20,0.28)',
    border: '1px solid rgba(255,255,255,0.30)',
    boxShadow:
      '0 24px 64px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(255,255,255,0.08)',
  };

  const glassPanel: React.CSSProperties = {
    backdropFilter: 'blur(30px) saturate(165%) brightness(0.60)',
    WebkitBackdropFilter: 'blur(30px) saturate(165%) brightness(0.60)',
    background: 'rgba(16,18,22,0.20)',
    border: '1px solid rgba(255,255,255,0.30)',
    boxShadow:
      '0 14px 40px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.36), inset 0 -1px 0 rgba(255,255,255,0.08)',
  };

  /** Inline background on purpose: the class `bg-white` is force-inverted to #121214
      by the `.dark` rules in globals.css, which turned this input into a black slab. */
  const glassField: React.CSSProperties = {
    backdropFilter: 'blur(22px) saturate(160%) brightness(0.62)',
    WebkitBackdropFilter: 'blur(22px) saturate(160%) brightness(0.62)',
    background: 'rgba(18,20,24,0.18)',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.32), 0 4px 16px rgba(0,0,0,0.22)',
    color: '#ffffff',
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      {/* ---------------- HERO (video confined to this 100vh block) ---------------- */}
      {/* h-screen (not min-h-screen) so the hero can never spill past one viewport. */}
      <section ref={heroRef} className="relative h-screen flex flex-col overflow-hidden">
        <VideoBackground src="/hero-video.mp4" poster="/hero-poster.jpg" targetRef={heroRef} />

        {/* NAV — logo left, links centered, Sign In right */}
        <header className="relative z-20 shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 md:px-14 py-5">
          <span className="font-editorial text-xl md:text-2xl font-bold text-white tracking-tight justify-self-start">
            InvoNest
          </span>

          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: entranceDone ? 1 : 0, y: entranceDone ? 0 : -8 }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ pointerEvents: entranceDone ? 'auto' : 'none' }}
            className="hidden md:flex flex-wrap items-center justify-center gap-2.5 justify-self-center"
          >
            {NAV_ITEMS.map((item) => {
              const entries = MENUS[item];
              const isOpen = openMenu === item;
              return (
                <div
                  key={item}
                  className="relative"
                  onMouseEnter={() => entries && setOpenMenu(item)}
                  onMouseLeave={() => entries && setOpenMenu(null)}
                >
                  <button
                    onClick={() => setOpenMenu(isOpen ? null : entries ? item : null)}
                    style={glass}
                    className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white hover:brightness-125 transition-all flex items-center gap-1.5"
                  >
                    <span style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{item}</span>
                    {entries && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  <AnimatePresence>
                    {entries && isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        style={glassMenu}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[320px] rounded-3xl p-2 z-50 text-left"
                      >
                        {entries.map((e) => (
                          <button
                            key={e.title}
                            className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-white/20 transition-colors text-left"
                          >
                            <span
                              className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0"
                              style={{
                                background: `${e.tint}3d`,
                                border: `1px solid ${e.tint}80`,
                                color: e.tint,
                                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                              }}
                            >
                              {e.initial}
                            </span>
                            {/* Text stays fully opaque — only the panel behind it is glass. */}
                            <span className="min-w-0">
                              <span
                                className="block text-[13px] font-bold truncate"
                                style={{
                                  color: '#ffffff',
                                  textShadow: '0 1px 4px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.5)',
                                }}
                              >
                                {e.title}
                              </span>
                              <span
                                className="block text-[11px] truncate"
                                style={{
                                  color: '#e9eaec',
                                  textShadow: '0 1px 4px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.5)',
                                }}
                              >
                                {e.desc}
                              </span>
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.nav>

          <Link
            href="/login"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            className="text-base md:text-lg font-semibold text-white/90 hover:text-white transition-colors justify-self-end mr-4 md:mr-12"
          >
            Sign In
          </Link>
        </header>

        {/* HEADLINE + FORM */}
        <div className="relative z-10 flex-1 min-h-0 flex items-center px-6 md:px-14">
          {/* Text left, preview cards right. */}
          <div className="w-full grid lg:grid-cols-[minmax(0,1fr)_auto] gap-10 xl:gap-16 items-center">
          <div className="max-w-3xl">
            <motion.div {...blockReveal}>
              {/* Sized against viewport HEIGHT so a short window shrinks the type
                  instead of pushing the form off-screen. */}
              <h1
                className="font-editorial uppercase text-white tracking-tight leading-[0.94]"
                style={{ fontSize: 'clamp(2.25rem, 8.6vh, 5.5rem)' }}
              >
                <motion.span className="block overflow-hidden" {...writeIn(0)}>
                  Faster payments
                </motion.span>
                <motion.span className="block overflow-hidden" {...writeIn(0.45)}>
                  Stronger relationships
                </motion.span>
              </h1>
            </motion.div>

            <motion.p
              {...subtitle}
              onAnimationComplete={() => setEntranceDone(true)}
              style={{
                textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                fontSize: 'clamp(0.9rem, 2.1vh, 1.2rem)',
                marginTop: 'clamp(0.75rem, 2.4vh, 1.5rem)',
              }}
              className="text-white/85 leading-relaxed max-w-2xl"
            >
              Track every invoice, automate every reminder, and let the AI copilot handle
              collections while you focus on the business.
            </motion.p>

            {/* Email + Request a demo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 1.8, duration: 0.5 }}
              style={{ marginTop: 'clamp(1rem, 3vh, 2rem)' }}
            >
              {demoSubmitted ? (
                <div
                  style={glassPanel}
                  className="rounded-2xl p-5 max-w-xl text-base font-bold text-white flex items-center gap-2.5"
                >
                  <CheckCircle className="w-5 h-5 shrink-0" /> Demo requested for {demoEmail}!
                  We&apos;ll contact you shortly.
                </div>
              ) : (
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    const err = validateWorkEmail(demoEmail);
                    setEmailError(err);
                    if (!err) setDemoSubmitted(true);
                  }}
                >
                  <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                    <input
                      type="text"
                      inputMode="email"
                      value={demoEmail}
                      onChange={(e) => {
                        setDemoEmail(e.target.value);
                        if (emailError) setEmailError(null); // clear as soon as they retype
                      }}
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? 'demo-email-error' : undefined}
                      placeholder="name@company.com"
                      style={{
                        ...glassField,
                        fontSize: 'clamp(0.85rem, 1.9vh, 1rem)',
                        ...(emailError ? { border: '1px solid rgba(248,113,113,0.75)' } : {}),
                      }}
                      className="rounded-2xl px-5 py-3.5 flex-1 focus:outline-none placeholder-white/65"
                    />
                    <button
                      type="submit"
                      style={{ ...glassPanel, fontSize: 'clamp(0.85rem, 1.9vh, 1rem)' }}
                      className="px-7 py-3.5 rounded-2xl font-bold text-white transition-all shrink-0 hover:brightness-125"
                    >
                      Request a demo
                    </button>
                  </div>

                  <AnimatePresence>
                    {emailError && (
                      <motion.p
                        id="demo-email-error"
                        role="alert"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
                        className="mt-2 text-[12px] font-semibold text-red-300 max-w-xl"
                      >
                        {emailError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </form>
              )}
            </motion.div>

          </div>

            {/* Dashboard preview cards — assemble from scattered glass fragments. */}
            <div className="hidden xl:flex items-center gap-4">
              <QuickHelpChat />
              <PreviewCards className="flex" />
            </div>
          </div>
        </div>

      </section>

      {/* ---------------- BELOW THE FOLD: plain static content, no video ---------------- */}
      <section className="px-6 md:px-10 py-24 max-w-5xl mx-auto text-[#0d2227]">
        <span className="text-[10px] uppercase font-mono font-bold tracking-[0.25em] text-[#0d2227]/50">
          Scroll check
        </span>
        <h2 className="font-editorial uppercase text-3xl md:text-5xl mt-3">
          The video pauses up there
        </h2>
        <p className="text-sm md:text-base text-zinc-600 mt-4 max-w-xl leading-relaxed">
          Once less than 20% of the hero is visible the element is genuinely paused and faded
          out, not merely hidden. Scroll back up and it resumes. Everything from here down is
          ordinary content on a plain background — no video, no carried-over blur.
        </p>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {['Outstanding Revenue', 'Recovery Rate', 'Expected Collections'].map((t) => (
            <div key={t} className="border border-[#0d2227]/15 rounded-2xl p-6 bg-white">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500">
                {t}
              </span>
              <div className="text-3xl font-extrabold mt-2 font-editorial">₹12.40L</div>
            </div>
          ))}
        </div>
        <div className="h-[60vh]" />
      </section>
    </div>
  );
}
