'use client';

import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, Check } from 'lucide-react';

/**
 * Pre-billing checkout screen.
 *
 * Reads as a real checkout — order summary, total, secure-payment framing — so
 * the price registers and users understand Premium is paid. It deliberately has
 * NO card fields: nothing here is connected to a payment processor, and a
 * realistic card form that isn't wired up would collect real card numbers under
 * false pretenses (and put raw PAN through a stack with no PCI compliance).
 *
 * Swap this for a Stripe Checkout redirect once keys exist; the surrounding
 * flow does not change.
 */
export default function CheckoutPanel({
  featureLabel,
  onBack,
}: {
  featureLabel: string;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Enter a valid email.');
      return;
    }
    setError(null);
    setDone(true);
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="text-[11px] text-white/50 hover:text-white/85 transition-colors flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-3 h-3" /> Back
      </button>

      <h3 className="text-base font-bold text-white leading-snug">Confirm your upgrade</h3>
      <p className="text-[13px] text-white/65 mt-1.5 leading-relaxed">
        Premium unlocks {featureLabel} and everything else on the paid tier.
      </p>

      {/* Order summary — the part that makes the cost land. */}
      <div className="mt-4 rounded-xl border border-white/12 bg-white/[0.04] overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-white/8">
          <div>
            <span className="text-[13px] font-semibold text-white block">InvoNest Premium</span>
            <span className="text-[10px] font-mono text-white/45">Billed monthly · cancel anytime</span>
          </div>
          <span className="text-[13px] font-bold text-white">₹12,999</span>
        </div>
        <div className="flex justify-between items-center px-4 py-3 border-b border-white/8">
          <span className="text-[12px] text-white/60">GST (18%)</span>
          <span className="text-[12px] text-white/60">₹2,340</span>
        </div>
        <div className="flex justify-between items-center px-4 py-3 bg-white/[0.03]">
          <span className="text-[13px] font-bold text-white">Total due today</span>
          <span className="text-lg font-extrabold text-white">₹15,339</span>
        </div>
      </div>

      {/* Honest state. Saying this plainly is what separates a coming-soon
          checkout from a fake one. */}
      <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3">
        <p className="text-[12px] text-amber-200/90 leading-relaxed">
          <strong className="font-bold">Card payments aren&apos;t live yet.</strong> We&apos;re
          finishing our payment provider setup — leave your email and we&apos;ll send you a secure
          checkout link the moment billing opens. No card details are collected here.
        </p>
      </div>

      {done ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] px-4 py-3">
          <Check className="w-4 h-4 text-emerald-300 shrink-0" />
          <p className="text-[12px] text-emerald-200">
            You&apos;re on the list. We&apos;ll email <strong>{email}</strong> when checkout opens.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-4">
          <label htmlFor="checkout-email" className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1.5">
            Work email
          </label>
          <div className="flex gap-2">
            <input
              id="checkout-email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
              aria-invalid={!!error}
              placeholder="you@company.com"
              className="flex-1 text-[13px] rounded-xl px-3 py-2.5 bg-white/[0.06] border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50"
            />
            <button
              type="submit"
              className="rounded-xl px-4 text-[13px] font-bold text-[#05100e] transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #86efac 0%, #34d399 50%, #16a34a 100%)' }}
            >
              Notify me
            </button>
          </div>
          {error && (
            <span role="alert" className="text-[11px] font-semibold text-red-300 mt-1.5 block">
              {error}
            </span>
          )}
        </form>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-white/35">
        <ShieldCheck className="w-3 h-3" /> Payments will be processed by a PCI-compliant provider.
        InvoNest never stores card numbers.
      </p>
    </div>
  );
}
