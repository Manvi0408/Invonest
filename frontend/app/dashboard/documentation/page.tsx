'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  BookOpen, 
  Terminal, 
  MessageCircle, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Code,
  ShieldCheck,
  Zap,
  TrendingUp,
  Cpu,
  Database,
  Lock,
  Mail,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import { usePlan, type FeatureKey } from '../../lib/usePlan';
import UpgradePrompt, { FeatureLock, type UpgradeTrigger } from '../../components/UpgradePrompt';

/** Email is on every plan; WhatsApp and SMS are Premium-gated. */
const CHANNELS: Array<{
  id: 'EMAIL' | 'WHATSAPP' | 'SMS';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: FeatureKey;
  trigger?: UpgradeTrigger;
}> = [
  { id: 'EMAIL', label: 'Email reminder', icon: Mail },
  { id: 'WHATSAPP', label: 'WhatsApp escalation', icon: MessageSquare, feature: 'whatsapp_reminders', trigger: 'whatsapp_locked' },
  { id: 'SMS', label: 'SMS reminder', icon: Smartphone, feature: 'sms_reminders', trigger: 'sms_locked' },
];

interface CodeSnippet {
  language: 'bash' | 'javascript' | 'python';
  code: string;
}

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestBody?: string;
  response: string;
  snippets: Record<'bash' | 'javascript' | 'python', string>;
}

export default function DocumentationPage() {
  const [activeTab, setActiveTab] = useState<'guide' | 'api' | 'faq'>('guide');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Reminder Builder channel selection + plan gating
  const { plan, loading: planLoading, hasFeature } = usePlan();
  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP' | 'SMS'>('EMAIL');
  const [upgrade, setUpgrade] = useState<UpgradeTrigger | null>(null);
  
  // API Reference state
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<'bash' | 'javascript' | 'python'>('bash');

  // FAQ collapse state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Copy code helper
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Mock API Endpoints Data
  const endpoints: Endpoint[] = [
    {
      method: 'GET',
      path: '/api/reports/aging/:orgId',
      description: 'Retrieve accounts receivable aging reports by organization. Computes dynamic buckets (0-30, 31-60, 61-90, 90+ days outstanding).',
      response: `{
  "organizationId": "org-8f9a2",
  "currency": "INR",
  "buckets": {
    "current": 1250000.00,
    "30_days": 420000.00,
    "60_days": 85000.00,
    "90_days": 310000.00
  },
  "totalOutstanding": 2065000.00
}`,
      snippets: {
        bash: `curl -X GET "https://api.invonest.com/api/reports/aging/org-8f9a2" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
        javascript: `const response = await fetch('https://api.invonest.com/api/reports/aging/org-8f9a2', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const data = await response.json();
console.log(data);`,
        python: `import requests

url = "https://api.invonest.com/api/reports/aging/org-8f9a2"
headers = {"Authorization": "Bearer YOUR_API_KEY"}

response = requests.get(url, headers=headers)
print(response.json())`
      }
    },
    {
      method: 'POST',
      path: '/api/risk-engine/invoice/:invoiceId/predict',
      description: 'Run machine learning classification modeling on a specific invoice to predict payment delay risk. Analyzes historic dunning behavior, payment latency, and buyer credit risk profile.',
      requestBody: `{
  "simulateDigitalTwin": false,
  "additionalInvoicesCount": 0
}`,
      response: `{
  "invoiceId": "inv-9021",
  "predictedDelayDays": 12.4,
  "riskScore": 83,
  "riskLevel": "RISKY",
  "riskFactors": [
    "Client outstanding balance exceeds historical threshold by 34%",
    "Previous 2 reminders left unacknowledged on WhatsApp"
  ],
  "confidenceScore": 0.91
}`,
      snippets: {
        bash: `curl -X POST "https://api.invonest.com/api/risk-engine/invoice/inv-9021/predict" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"simulateDigitalTwin": false}'`,
        javascript: `const response = await fetch('https://api.invonest.com/api/risk-engine/invoice/inv-9021/predict', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ simulateDigitalTwin: false })
});
const data = await response.json();`,
        python: `import requests

url = "https://api.invonest.com/api/risk-engine/invoice/inv-9021/predict"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {"simulateDigitalTwin": False}

response = requests.post(url, headers=headers, json=data)
print(response.json())`
      }
    },
    {
      method: 'POST',
      path: '/api/automation/reminder/:id/execute',
      description: 'Force-execute a dunning reminder schedule event. Delivers templated alerts containing direct secure payment links via chosen gateway channels.',
      requestBody: `{
  "forceChannel": "WHATSAPP"
}`,
      response: `{
  "reminderId": "rem-4412",
  "status": "SENT",
  "channel": "WHATSAPP",
  "recipient": "+919876543210",
  "timestamp": "2026-07-23T02:40:00Z"
}`,
      snippets: {
        bash: `curl -X POST "https://api.invonest.com/api/automation/reminder/rem-4412/execute" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"forceChannel": "WHATSAPP"}'`,
        javascript: `await fetch('https://api.invonest.com/api/automation/reminder/rem-4412/execute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ forceChannel: 'WHATSAPP' })
});`,
        python: `import requests

url = "https://api.invonest.com/api/automation/reminder/rem-4412/execute"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {"forceChannel": "WHATSAPP"}

response = requests.post(url, headers=headers, json=data)
print(response.json())`
      }
    }
  ];

  // FAQs Data
  const faqs = [
    {
      q: 'How does the AI risk engine calculate invoice risk scores?',
      a: 'The InvoNest risk classifier runs an ensemble machine learning model. It evaluates parameters from three tiers: 1) Client behavior (e.g. historical payment delays, outstanding balances), 2) Inherent invoice details (e.g. amount, due date proximity), and 3) Dunning interactions (e.g. reminder email read-rates, WhatsApp delivery statuses). A risk score (0-100) is outputted, classifying invoices from Low to Critical risk levels.'
    },
    {
      q: 'Is there support for real-time live ledger syncing?',
      a: 'Yes. Once connected via the Setup & Ledgers portal, webhooks are established for Stripe and QuickBooks. This enables immediate sync on event modifications (invoice creation, payment confirmation). We also run a periodic fallback job every 2 hours to ensure full ledger reconciliation and cache consistency.'
    },
    {
      q: 'How are secure payment links generated?',
      a: 'When an invoice is scanned or imported, our gateway automatically registers a secure checkout mapping. InvoNest generates a unique payment URL linked with Stripe or Razorpay. When this link is delivered through our automated WhatsApp/Email reminders, clients can pay instantly, and the system reconciles the transaction ledger immediately.'
    },
    {
      q: 'Can we configure custom reminder templates?',
      a: 'Absolutely. Using the Reminder Builder on the dashboard, you can design message text containing dynamic placeholders (e.g., {{clientName}}, {{invoiceNumber}}, {{dueDate}}). You can preview the layout and map specific reminder events to fire 7 days before, on the due date, or 3 days overdue.'
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0d2227]/10 pb-6">
        <div>
          <h1 className="text-3xl font-normal text-[#0d2227] uppercase font-editorial tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#0d2227]/80" /> Documentation Hub
          </h1>
          <p className="text-zinc-500 text-xs mt-1 font-mono">
            Get started with InvoNest, explore developer API endpoints, or review platform FAQs.
          </p>
        </div>
      </div>

      {/* CORE 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* LEFT COLUMN - SIDEBAR NAVIGATION */}
        <div className="lg:col-span-1 space-y-2 bg-[#abc6d8]/10 border border-[#0d2227]/10 rounded-2xl p-4">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono px-3 mb-2">Sections</div>
          <button 
            onClick={() => setActiveTab('guide')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'guide' 
                ? 'bg-[#0d2227] text-white' 
                : 'text-[#0d2227] hover:bg-[#abc6d8]/20'
            }`}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> Platform Guide
            </span>
            <ChevronRight className="w-3 h-3" />
          </button>

          <button 
            onClick={() => setActiveTab('api')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'api' 
                ? 'bg-[#0d2227] text-white' 
                : 'text-[#0d2227] hover:bg-[#abc6d8]/20'
            }`}
          >
            <span className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" /> API Reference
            </span>
            <ChevronRight className="w-3 h-3" />
          </button>

          <button 
            onClick={() => setActiveTab('faq')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'faq' 
                ? 'bg-[#0d2227] text-white' 
                : 'text-[#0d2227] hover:bg-[#abc6d8]/20'
            }`}
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5" /> FAQs & Security
            </span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* RIGHT COLUMN - CONTENT REGION */}
        <div className="lg:col-span-3">
          
          {/* TAB 1: GUIDE */}
          {activeTab === 'guide' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="glass rounded-2xl p-6 md:p-8 space-y-6 shadow-sm border border-[#0d2227]/10">
                <h3 className="font-extrabold text-sm text-[#0d2227] uppercase tracking-wider font-mono border-b border-zinc-100 pb-3">
                  Quickstart Guide
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#abc6d8]/30 flex items-center justify-center font-extrabold text-[#0d2227] text-xs font-mono">1</div>
                    <h4 className="font-bold text-xs text-[#0d2227] flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-zinc-500" /> Connect Ledgers</h4>
                    <p className="text-zinc-500 text-[11px] leading-relaxed">
                      Link your billing applications (Stripe, QuickBooks) to sync outstanding invoices directly into our central system.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#abc6d8]/30 flex items-center justify-center font-extrabold text-[#0d2227] text-xs font-mono">2</div>
                    <h4 className="font-bold text-xs text-[#0d2227] flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-zinc-500" /> Analyze Risk Profiles</h4>
                    <p className="text-zinc-500 text-[11px] leading-relaxed">
                      Our ML engine processes OCR layouts & payment patterns, assigning an AI risk score highlighting delinquent accounts.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#abc6d8]/30 flex items-center justify-center font-extrabold text-[#0d2227] text-xs font-mono">3</div>
                    <h4 className="font-bold text-xs text-[#0d2227] flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-zinc-500" /> Trigger Reminders</h4>
                    <p className="text-zinc-500 text-[11px] leading-relaxed">
                      Deliver automated dunning alerts via Email and WhatsApp templates containing payment gateways options.
                    </p>
                  </div>

                </div>

                <div className="bg-white border border-[#0d2227]/10 p-5 rounded-xl space-y-3 mt-6">
                  <h4 className="font-bold text-xs text-[#0d2227] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-zinc-500" /> Scenario Simulator (Digital Twin)
                  </h4>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Under the <strong>Scenario Simulator</strong> section of the main panel, you can run forecast stress tests. This tool simulates cashflow impact if your highest-paying clients default or delay invoices. This prediction utilizes dynamic probability curves based on client behavior.
                  </p>
                </div>
              </div>

              {/* SEE HOW AUTOMATION WORKS */}
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

              <div className="glass rounded-2xl p-6 md:p-8 space-y-4 shadow-sm border border-[#0d2227]/10">
                <h3 className="font-extrabold text-sm text-[#0d2227] uppercase tracking-wider font-mono border-b border-zinc-100 pb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-500" /> Data Security & Compliance
                </h3>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  InvoNest does not store your core bank credentials or write transaction modifications to Stripe. All API communication runs over HTTPS TLS 1.3 with standard JWT encryption. Our mock PGlite database isolates ledger logs, maintaining compliant isolation.
                </p>
              </div>
            </motion.div>
          )}

          {/* TAB 2: API REFERENCE */}
          {activeTab === 'api' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start"
            >
              {/* Endpoint selection */}
              <div className="xl:col-span-2 space-y-2">
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Endpoints</div>
                {endpoints.map((ep, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEndpointIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      selectedEndpointIndex === idx
                        ? 'border-[#0d2227] bg-[#0d2227]/5 shadow-sm'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
                        ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-[9px] text-zinc-500 truncate max-w-[120px]">{ep.path}</span>
                    </div>
                    <p className="text-zinc-500 text-[10px] line-clamp-2 leading-relaxed">{ep.description}</p>
                  </button>
                ))}
              </div>

              {/* Console & Code snippets */}
              <div className="xl:col-span-3 space-y-4">
                <div className="glass rounded-2xl p-5 shadow-sm border border-[#0d2227]/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <span className="font-extrabold text-xs text-[#0d2227] uppercase tracking-wider font-mono">Request Snippet</span>
                    
                    {/* Language selector */}
                    <div className="flex gap-1.5 bg-zinc-100 border border-zinc-200 rounded-lg p-0.5 text-[9px] font-bold font-mono">
                      {(['bash', 'javascript', 'python'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setSelectedLanguage(lang)}
                          className={`px-2 py-0.5 rounded-md transition-colors ${
                            selectedLanguage === lang ? 'bg-[#0d2227] text-white' : 'text-zinc-500 hover:text-zinc-700'
                          }`}
                        >
                          {lang === 'bash' ? 'cURL' : lang === 'javascript' ? 'JS' : 'Python'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code block */}
                  <div className="relative bg-zinc-950 text-zinc-100 font-mono text-[10px] p-4 rounded-xl overflow-x-auto shadow-inner min-h-[120px]">
                    <button
                      onClick={() => handleCopyCode(endpoints[selectedEndpointIndex].snippets[selectedLanguage], 'req')}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors"
                    >
                      {copiedSnippet === 'req' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {endpoints[selectedEndpointIndex].snippets[selectedLanguage]}
                    </pre>
                  </div>

                  {/* Response JSON */}
                  <div className="border-t border-zinc-100 pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs text-[#0d2227] uppercase tracking-wider font-mono">Response Payload</span>
                      <span className="font-mono text-[9px] font-bold text-green-600">200 OK</span>
                    </div>
                    <div className="relative bg-zinc-950 text-zinc-100 font-mono text-[10px] p-4 rounded-xl overflow-x-auto shadow-inner max-h-60 overflow-y-auto">
                      <button
                        onClick={() => handleCopyCode(endpoints[selectedEndpointIndex].response, 'res')}
                        className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors"
                      >
                        {copiedSnippet === 'res' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <pre className="whitespace-pre-wrap leading-relaxed">
                        {endpoints[selectedEndpointIndex].response}
                      </pre>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: FAQ */}
          {activeTab === 'faq' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="glass rounded-xl p-4 shadow-sm border border-[#0d2227]/10 transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full flex items-center justify-between text-left text-xs font-bold text-[#0d2227] focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    {openFaqIndex === idx ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                  </button>
                  
                  <AnimatePresence>
                    {openFaqIndex === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-zinc-500 text-[11px] leading-relaxed pt-3 border-t border-zinc-100 mt-2.5">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}

        </div>

      </div>

      {upgrade && <UpgradePrompt trigger={upgrade} onClose={() => setUpgrade(null)} />}

    </div>
  );
}
