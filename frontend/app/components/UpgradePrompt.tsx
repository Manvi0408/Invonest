'use client';

import React from 'react';
import Link from 'next/link';
import CheckoutPanel from './CheckoutPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Zap, Users, FileText, MessageSquare, TrendingUp, ArrowRight } from 'lucide-react';

/**
 * One prompt, many contexts. The copy, icon and preview all change with `trigger`
 * so the user is told exactly what they hit — never a generic "upgrade" wall.
 *
 * Triggers mirror UpgradeTrigger in backend/src/billing/plan-limit.exception.ts,
 * so a 402 payload can be handed straight to this component.
 */

export type UpgradeTrigger =
  | 'credits_exhausted'
  | 'invoice_limit'
  | 'whatsapp_locked'
  | 'sms_locked'
  | 'scenario_simulator_locked'
  | 'seat_limit';

export interface UpgradePromptProps {
  trigger: UpgradeTrigger;
  open?: boolean;
  onClose?: () => void;
  /** From the 402 payload. */
  quota?: { used: number; limit: number | null; remaining: number | null };
  resetAt?: string | Date | null;
  /** Render inline (e.g. under a locked field) rather than as a modal. */
  inline?: boolean;
  className?: string;
}

interface Variant {
  icon: React.ReactNode;
  title: string;
  body: (ctx: { quota?: UpgradePromptProps['quota']; resetAt?: string }) => React.ReactNode;
  cta: string;
  accent: string;
  /** Static preview shown for locked features, so the value is visible before paying. */
  preview?: { src?: string; alt: string; caption: string };
}

function formatResetDate(resetAt?: string | Date | null): string {
  if (!resetAt) return 'your next billing date';
  const d = typeof resetAt === 'string' ? new Date(resetAt) : resetAt;
  if (Number.isNaN(d.getTime())) return 'your next billing date';
  const next = new Date(d);
  next.setMonth(next.getMonth() + 1);
  return next.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const VARIANTS: Record<UpgradeTrigger, Variant> = {
  credits_exhausted: {
    icon: <Zap className="w-5 h-5" />,
    title: "You're out of credits for this month.",
    accent: '#f59e0b',
    cta: 'Upgrade for 3,000/month',
    body: ({ resetAt }) => (
      <>
        Upgrade for <strong className="text-white">3,000 credits/month</strong>, or wait until{' '}
        <strong className="text-white">{formatResetDate(resetAt)}</strong> when your free credits reset.
      </>
    ),
  },
  invoice_limit: {
    icon: <FileText className="w-5 h-5" />,
    title: "You've hit your free plan's invoice limit.",
    accent: '#60a5fa',
    cta: 'Upgrade for unlimited uploads',
    body: ({ quota }) => (
      <>
        {quota
          ? <>You've used <strong className="text-white">{quota.used}/{quota.limit}</strong> invoice uploads this month. </>
          : null}
        Upgrade for <strong className="text-white">unlimited uploads</strong>.
      </>
    ),
  },
  whatsapp_locked: {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'WhatsApp escalation is a Premium feature.',
    accent: '#34d399',
    cta: 'Unlock WhatsApp escalation',
    body: () => (
      <>
        When an invoice goes unpaid, Premium automatically escalates from email to WhatsApp with a
        one-tap payment link — the channel clients actually answer.
      </>
    ),
    preview: {
      alt: 'WhatsApp reminder escalation',
      caption:
        'Day −7 email → day 0 email → day +7 WhatsApp, each carrying a payment link. No manual chasing.',
    },
  },
  sms_locked: {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'SMS reminders are a Premium feature.',
    accent: '#34d399',
    cta: 'Unlock SMS reminders',
    body: () => <>Add SMS alongside email and WhatsApp so a reminder always lands somewhere read.</>,
  },
  scenario_simulator_locked: {
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'The Scenario Simulator is a Premium feature.',
    accent: '#a78bfa',
    cta: 'Unlock Scenario Simulator',
    body: () => (
      <>
        Model a client defaulting, a payment slipping 20 days, or payroll rising — and see the
        runway impact before it happens.
      </>
    ),
    preview: {
      src: '/scenario-simulator-preview.png',
      alt: 'Scenario Simulator modelling a client default',
      caption: '"What if Acquirer Corp defaults?" — runway recalculated instantly across 30/60/90 days.',
    },
  },
  seat_limit: {
    icon: <Users className="w-5 h-5" />,
    title: "You've reached your team seat limit.",
    accent: '#f472b6',
    cta: 'Upgrade for 5 seats',
    body: ({ quota }) => (
      <>
        {quota ? (
          <>
            You're using <strong className="text-white">{quota.used}/{quota.limit}</strong>{' '}
            {quota.limit === 1 ? 'seat' : 'seats'}.{' '}
          </>
        ) : null}
        Premium includes <strong className="text-white">5 team seats</strong>.
      </>
    ),
  },
};

export default function UpgradePrompt({
  trigger,
  open = true,
  onClose,
  quota,
  resetAt,
  inline = false,
  className = '',
}: UpgradePromptProps) {
  const variant = VARIANTS[trigger];

  /* Short name for the capability that was blocked, used on both plan cards. */
  const LOCKED_LABELS: Partial<Record<UpgradeTrigger, string>> = {
    whatsapp_locked: 'WhatsApp escalation',
    sms_locked: 'SMS reminders',
    scenario_simulator_locked: 'Scenario Simulator',
    credits_exhausted: '3,000 credits',
    invoice_limit: 'Unlimited uploads',
    seat_limit: '5 team seats',
  };
  const lockedLabel = LOCKED_LABELS[trigger] ?? 'This feature';
  const [showCheckout, setShowCheckout] = React.useState(false);
  const href = `/pricing?highlight=growth&reason=${trigger}`;
  const resetStr = resetAt ? (typeof resetAt === 'string' ? resetAt : resetAt.toISOString()) : undefined;

  const content = showCheckout ? (
    <div className={inline ? '' : 'p-6'}>
      <CheckoutPanel featureLabel={lockedLabel} onBack={() => setShowCheckout(false)} />
    </div>
  ) : (
    <div className={inline ? '' : 'p-6'}>
      <div className="flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${variant.accent}1f`, color: variant.accent }}
        >
          {variant.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white leading-snug">{variant.title}</h3>
          <p className="text-sm text-white/65 mt-1.5 leading-relaxed">
            {variant.body({ quota, resetAt: resetStr })}
          </p>
        </div>
        {!inline && onClose && (
          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="text-white/40 hover:text-white/80 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quota progress bar — numeric caps only; feature locks show the preview instead. */}
      {quota && quota.limit !== null && (
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (quota.used / Math.max(1, quota.limit)) * 100)}%`,
                backgroundColor: variant.accent,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-white/45 mt-1.5">
            <span>{quota.used} used</span>
            <span>{quota.limit} on Free</span>
          </div>
        </div>
      )}

      {variant.preview && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
          {variant.preview.src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={variant.preview.src}
              alt={variant.preview.alt}
              className="w-full block"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          <p className="text-[11px] text-white/55 leading-relaxed p-3">{variant.preview.caption}</p>
        </div>
      )}

      {/* Side-by-side plans. The locked feature is what the user just tried to
          use, so it is called out explicitly on each side - the difference
          between the tiers should be legible without reading a pricing page. */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {/* Current plan. Deliberately not clickable: they already have it. */}
        <div className="rounded-xl border border-white/12 bg-white/[0.04] p-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Free</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Current</span>
          </div>
          <div className="mt-1.5 text-xl font-extrabold text-white/85">
            ₹0<span className="text-[11px] font-medium text-white/40"> / month</span>
          </div>
          <ul className="mt-2.5 space-y-1 text-[11px] text-white/55 leading-snug">
            <li>6 invoice uploads / month</li>
            <li>50 Copilot credits</li>
            <li>Email reminders only</li>
            <li className="text-white/35">{lockedLabel} not included</li>
          </ul>
        </div>

        {/* Premium. Bordered and tinted so the eye lands here first. */}
        <div className="rounded-xl border border-emerald-400/45 bg-emerald-400/[0.07] p-3.5 relative">
          <span className="absolute -top-2 right-3 rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-extrabold text-[#05100e]">
            UNLOCKS THIS
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">Premium</span>
          </div>
          <div className="mt-1.5 text-xl font-extrabold text-white">
            ₹12,999<span className="text-[11px] font-medium text-white/45"> / month</span>
          </div>
          <ul className="mt-2.5 space-y-1 text-[11px] text-white/75 leading-snug">
            <li>Unlimited invoice uploads</li>
            <li>3,000 Copilot credits</li>
            <li>WhatsApp + SMS escalation</li>
            <li className="text-emerald-300 font-semibold">{lockedLabel} included</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setShowCheckout(true)}
          className="flex-1 text-center rounded-xl py-2.5 text-sm font-bold text-[#05100e] transition-transform hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #86efac 0%, #34d399 50%, #16a34a 100%)' }}
        >
          Buy Premium — ₹12,999/mo
        </button>
        {!inline && onClose && (
          <button onClick={onClose} className="text-sm text-white/55 hover:text-white/85 transition-colors">
            Not now
          </button>
        )}
      </div>
    </div>
  );

  if (inline) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${className}`}
        role="status"
      >
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border border-white/15 bg-[#0d0d0f] shadow-2xl ${className}`}
          >
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small inline lock badge for disabled controls (WhatsApp/SMS channel options). */
export function FeatureLock({ label = 'Premium' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30">
      <Lock className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
