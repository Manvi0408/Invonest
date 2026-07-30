'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';

/**
 * "Quick Help" — a public, pre-auth assistant for landing-page visitors.
 *
 * NOTE ON "AI": this answers from the local knowledge base below, not an LLM.
 * The repo has no model credentials, and /api/ai-copilot/ask is (a) keyword
 * matching rather than a model and (b) behind the JWT guard, so an anonymous
 * visitor can't reach it. `answer()` is the single swap point — replace its body
 * with a fetch to a real model endpoint and the rest of this component is unchanged.
 */

interface Msg {
  role: 'user' | 'bot';
  text: string;
}

interface Entry {
  keys: string[];
  answer: string;
}

const KB: Entry[] = [
  {
    keys: ['price', 'pricing', 'cost', 'plan', 'how much', 'free', 'premium', 'subscription'],
    answer:
      'Free covers 6 invoice uploads/month, 50 chatbot credits, email reminders, 1 seat and 90-day history. Premium (₹12,999/mo) adds unlimited uploads, 3,000 credits, WhatsApp + SMS with auto-escalation, the Scenario Simulator, nightly risk scoring and 5 seats.',
  },
  {
    keys: ['whatsapp', 'sms', 'reminder', 'escalation', 'follow up', 'chase', 'dunning'],
    answer:
      'Reminders escalate on a schedule: email 7 days before due, again on the due date, then WhatsApp 7 days overdue — each carrying a one-tap payment link. Email is on every plan; WhatsApp and SMS are Premium.',
  },
  {
    keys: ['scenario', 'simulator', 'what if', 'forecast', 'runway', 'model', 'predict cash'],
    answer:
      'The Scenario Simulator models "what if" cases — a client defaulting, payment slipping 20 days, payroll rising — and recalculates your runway across 30/60/90 days instantly. It is a Premium feature.',
  },
  {
    keys: ['ocr', 'upload', 'scan', 'pdf', 'invoice upload', 'extract'],
    answer:
      'Drop in an invoice PDF or image and OCR extracts the client, invoice number, amount and due date in seconds — typically ~97% confidence — then opens the ledger entry for you. No manual data entry.',
  },
  {
    keys: ['risk', 'score', 'delay', 'late', 'default', 'health'],
    answer:
      'Every client is scored on payment history, outstanding exposure and credit limit, so you see which invoices are likely to run late before the due date. Premium recalculates nightly; Free updates weekly.',
  },
  {
    keys: ['integration', 'quickbooks', 'stripe', 'netsuite', 'xero', 'zoho', 'sage', 'connect', 'sync'],
    answer:
      'InvoNest syncs with QuickBooks, Netsuite, Sage Intacct, Xero, Zoho Books, Stripe, Razorpay, Chargebee and Zuora, plus Slack and Gmail/Outlook for notifications. Setup is one-click and takes under two minutes.',
  },
  {
    keys: ['security', 'safe', 'secure', 'data', 'gdpr', 'encrypt', 'privacy'],
    answer:
      'Data is encrypted in transit and at rest, each organisation is isolated at the database layer, and every API request is authenticated and scoped to your own organisation.',
  },
  {
    keys: ['seat', 'team', 'invite', 'user', 'member'],
    answer:
      'Free includes 1 seat. Premium includes 5. Admins can invite teammates from Setup, and each member gets their own login scoped to your organisation.',
  },
  {
    keys: ['credit', 'chatbot credit', 'top up', 'topup'],
    answer:
      'Chatbot credits cover AI copilot queries — 500/month on Free, 3,000/month on Premium. Purchased top-ups carry over and are not wiped by the monthly reset.',
  },
  {
    keys: ['demo', 'trial', 'start', 'sign up', 'signup', 'get started', 'try'],
    answer:
      'Enter your work email in the box on the left and hit "Request a demo" — or start a free trial straight away. The demo account is demo@invonest.ai / Demo@123 if you just want a look around.',
  },
  {
    // Deliberately no bare "what is" / "do you do": those are generic enough to
    // hijack specific questions like "what is your pricing?".
    keys: ['who are you', 'about invonest', 'what is invonest', 'invonest'],
    answer:
      'InvoNest is AI cash flow intelligence for finance teams. It tracks every invoice, automates the reminder ladder, predicts which clients will pay late, and lets an AI copilot handle collections while you focus on the business.',
  },
  {
    keys: ['dashboard', 'ledger', 'feature', 'what can'],
    answer:
      'The dashboard gives you Outstanding Revenue, Recovery Rate, At-Risk Revenue and Expected Collections at a glance, plus the A/R ledger, Client Health Scoreboard, AI CFO Copilot and Scenario Simulator.',
  },
];

const GREETING =
  "Hi — I'm Quick Help. Ask me about pricing, reminders, integrations, security, or how InvoNest works.";

/** Scores each entry by how many of its keys appear in the question. */
function answer(qRaw: string): string {
  const q = qRaw.toLowerCase().trim();
  if (!q) return GREETING;

  // Score by matched key LENGTH, so a specific term beats a short generic one.
  let best: { score: number; entry: Entry | null } = { score: 0, entry: null };
  for (const entry of KB) {
    let score = 0;
    for (const k of entry.keys) if (q.includes(k)) score = Math.max(score, k.length);
    if (score > best.score) best = { score, entry };
  }

  if (best.entry) return best.entry.answer;

  return "I don't have a canned answer for that one yet. I can help with pricing, invoice uploads, reminders and escalation, the Scenario Simulator, risk scoring, integrations, team seats, credits or security — or hit \"Request a demo\" and a human will pick it up.";
}

const GLASS: React.CSSProperties = {
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const BUBBLE_USER: React.CSSProperties = {
  backdropFilter: 'blur(12px) saturate(150%)',
  WebkitBackdropFilter: 'blur(12px) saturate(150%)',
  background: 'rgba(52,211,153,0.16)',
  border: '1px solid rgba(52,211,153,0.38)',
};

const BUBBLE_BOT: React.CSSProperties = {
  backdropFilter: 'blur(12px) saturate(150%)',
  WebkitBackdropFilter: 'blur(12px) saturate(150%)',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.13)',
};

const TEXT_SHADOW = '0 1px 4px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.45)';

const SUGGESTIONS = ['Pricing?', 'How do reminders work?', 'Integrations?'];

export default function QuickHelpChat({ className = '' }: { className?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: GREETING }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, thinking]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setThinking(true);
    // Brief pause so the reply doesn't appear instantaneously.
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'bot', text: answer(q) }]);
      setThinking(false);
    }, 420);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      style={GLASS}
      className={`rounded-2xl p-4 w-[280px] flex flex-col ${className}`}
    >
      <div className="flex items-center gap-2 pb-2.5 border-b border-white/10">
        <span
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(52,211,153,0.20)', border: '1px solid rgba(52,211,153,0.40)' }}
        >
          <Sparkles className="w-3 h-3 text-emerald-200" />
        </span>
        <span
          className="text-[11px] font-bold uppercase tracking-wider text-white"
          style={{ textShadow: TEXT_SHADOW }}
        >
          Quick Help
        </span>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      <div ref={listRef} className="flex-1 min-h-0 max-h-[168px] overflow-y-auto py-2.5 space-y-2 pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              style={m.role === 'user' ? BUBBLE_USER : BUBBLE_BOT}
              className="max-w-[88%] rounded-xl px-2.5 py-1.5"
            >
              <span
                className="block text-[11px] leading-snug text-white"
                style={{ textShadow: TEXT_SHADOW }}
              >
                {m.text}
              </span>
            </div>
          </div>
        ))}

        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div style={BUBBLE_BOT} className="rounded-xl px-3 py-2 flex gap-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="w-1 h-1 rounded-full bg-white/70"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {msgs.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              style={BUBBLE_BOT}
              className="rounded-full px-2 py-1 text-[9px] font-semibold text-white/90 hover:brightness-125 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-1.5 pt-2 border-t border-white/10"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          aria-label="Ask Quick Help a question"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#fff',
          }}
          className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-[11px] placeholder-white/50 focus:outline-none focus:border-emerald-300/60"
        />
        <button
          type="submit"
          aria-label="Send"
          style={{
            background: 'rgba(52,211,153,0.22)',
            border: '1px solid rgba(52,211,153,0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 hover:brightness-125 transition-all"
        >
          <Send className="w-3 h-3 text-emerald-100" />
        </button>
      </form>
    </motion.div>
  );
}
