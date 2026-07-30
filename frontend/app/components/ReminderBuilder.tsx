'use client';

/* The Reminder Builder / automation workflow.
   Extracted from the documentation page so the sidebar item can open it as its
   own route: it used to deep-link to #automation-workflow, which dropped the
   user halfway down a 613-line docs page under an unrelated header. */

import React, { useState } from 'react';
import { Zap, Mail, MessageSquare, Smartphone, Lock, CheckCircle } from 'lucide-react';
import { usePlan } from '../lib/usePlan';
import type { FeatureKey } from '../lib/usePlan';
import UpgradePrompt, { FeatureLock } from './UpgradePrompt';
import type { UpgradeTrigger } from './UpgradePrompt';

export const CHANNELS = [
  { id: 'EMAIL', label: 'Email reminder', icon: Mail, feature: null as FeatureKey | null, trigger: null as UpgradeTrigger | null },
  { id: 'WHATSAPP', label: 'WhatsApp escalation', icon: MessageSquare, feature: 'whatsapp_reminders' as FeatureKey, trigger: 'whatsapp_locked' as UpgradeTrigger },
  { id: 'SMS', label: 'SMS reminder', icon: Smartphone, feature: 'sms_reminders' as FeatureKey, trigger: 'sms_locked' as UpgradeTrigger },
];

export default function ReminderBuilder() {
  const [channel, setChannel] = useState('EMAIL');
  const [upgrade, setUpgrade] = useState<UpgradeTrigger | null>(null);
  const { plan, loading: planLoading, hasFeature } = usePlan();

  return (
    <>
      <div id="automation-workflow" className="glass rounded-2xl p-6 md:p-8 space-y-6 shadow-sm border border-[#0d2227]/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-100 dark:border-zinc-800 pb-3 gap-2">
          <h3 className="font-extrabold text-sm text-[#0d2227] uppercase tracking-wider font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> See How Automation Works
          </h3>
          <span className="text-[9px] bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded font-mono font-bold">
            Collections Engine Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: The Timeline Visualizer */}
          <div className="bg-zinc-50 dark:bg-[#121214] border border-[#0d2227]/10 rounded-xl p-5 space-y-5">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div>
                <span className="text-[9px] text-zinc-400 font-mono block">TIMELINE</span>
                <span className="font-bold text-xs text-[#0d2227]">Invoice #1042 · Meridian Textiles</span>
              </div>
              <span className="font-bold text-xs text-[#0d2227]">₹1,20,000</span>
            </div>

            <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-4 ml-2 space-y-4">
              {/* Event 1 */}
              <div className="relative text-[11px]">
                <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-green-500 flex items-center justify-center text-[7px] text-white">✓</span>
                <div className="font-bold text-[#0d2227] mb-0.5">Reminder Scheduled</div>
                <p className="text-zinc-500 text-[10px]">Auto-queued 7 days before due date</p>
              </div>

              {/* Event 2 */}
              <div className="relative text-[11px]">
                <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-green-500 flex items-center justify-center text-[7px] text-white">✓</span>
                <div className="font-bold text-[#0d2227] mb-0.5">Email Sent to Manvi</div>
                <p className="text-zinc-500 text-[10px]">Delivered initial invoice details and portal credentials.</p>
              </div>

              {/* Event 3 */}
              <div className="relative text-[11px]">
                <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-green-500 flex items-center justify-center text-[7px] text-white">✓</span>
                <div className="font-bold text-[#0d2227] mb-0.5">WhatsApp Escalation (7 days overdue)</div>
                <div className="mt-2 bg-[#abc6d8]/10 dark:bg-zinc-900 border border-[#0d2227]/10 p-3 rounded-lg font-mono text-[10px] space-y-1.5 text-zinc-600 dark:text-zinc-400">
                  <div className="font-bold text-[8px] text-zinc-400 uppercase tracking-wider mb-1">WhatsApp Reminder Preview</div>
                  <p>Hi Manvi, your invoice #1042 for ₹1,20,000 is 7 days overdue.</p>
                  <p>Here's your payment link — takes less than a minute:</p>
                  <p className="text-blue-600 dark:text-blue-400 font-bold underline">pay.invonest.com/1042</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Channel picker + explanatory details */}
          <div className="space-y-4 flex flex-col justify-center">
            {/* Reminder Builder channel selection. Premium-only channels are
                disabled with a lock; the API rejects them regardless. */}
            <div className="bg-zinc-50 dark:bg-[#121214] border border-[#0d2227]/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                  Delivery channels
                </h4>
                {planLoading ? null : (
                  <span className="text-[9px] font-mono text-zinc-400">
                    {plan?.plan === 'FREE' ? 'Free plan' : 'Premium'}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {CHANNELS.map((ch) => {
                  const locked = ch.feature ? !hasFeature(ch.feature) : false;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      // aria-disabled, not `disabled`: a natively disabled button
                      // swallows the click, which would make the upgrade path
                      // unreachable. It still reads as unavailable to AT.
                      aria-disabled={locked}
                      onClick={() => (locked ? setUpgrade(ch.trigger!) : setChannel(ch.id))}
                      title={
                        locked
                          ? `${ch.label} is a Premium feature — click to see what it does`
                          : `Send reminders via ${ch.label}`
                      }
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-[11px] font-semibold transition-all text-left ${
                        locked
                          ? 'border-amber-300/60 bg-amber-50/60 text-[#5a4a1f] hover:border-amber-400 hover:bg-amber-50 cursor-pointer'
                          : channel === ch.id
                            ? 'border-green-500/50 bg-green-500/10 text-[#0d2227] dark:text-green-300'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-green-500/40'
                      }`}
                    >
                      {locked ? <Lock className="w-3.5 h-3.5 shrink-0" /> : <ch.icon className="w-3.5 h-3.5 shrink-0" />}
                      <span className="flex-1">{ch.label}</span>
                      {locked && <FeatureLock />}
                      {!locked && channel === ch.id && (
                        <span className="text-[9px] font-mono text-green-500">SELECTED</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <h4 className="font-bold text-[10px] uppercase font-mono tracking-wider text-zinc-400">Collections that run themselves</h4>

            <div className="space-y-3.5 text-[11px] leading-relaxed text-zinc-500">
              <div className="flex gap-2">
                <span className="text-green-500 font-bold text-xs">✓</span>
                <p><strong>Automated follow-up:</strong> Every overdue invoice gets a reminder — automatically, on schedule.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-green-500 font-bold text-xs">✓</span>
                <p><strong>Channel escalation:</strong> Escalates from email to WhatsApp when a client goes quiet, boosting responses.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-green-500 font-bold text-xs">✓</span>
                <p><strong>Embedded checkout:</strong> Payment link embedded in every message, ensuring no back-and-forth negotiation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {upgrade && (
        <UpgradePrompt trigger={upgrade} onClose={() => setUpgrade(null)} />
      )}
    </>
  );
}
