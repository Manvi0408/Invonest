'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api, getToken, QuotaError, API_BASE } from '../lib/api';
import { usePlan } from '../lib/usePlan';
import type { UpgradeTrigger } from '../components/UpgradePrompt';

/**
 * Dashboard state lives here rather than in a single page component, so the
 * Overview / Client Ledger / Invoice Upload / Copilot / Simulator routes can each
 * render one feature while still sharing invoices, the selected invoice, plan
 * limits and the upgrade prompt.
 */

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'DUE' | 'OVERDUE' | 'PAID';
  dueDate: string;
  /* Both are already returned by /api/invoices — they were simply dropped in
     the mapping below. Optional so older callers and the seed still typecheck. */
  issueDate?: string;
  paidAt?: string | null;
  riskScore: number;
  timeline: Array<{ status: string; date: string; description: string }>;
  comments: Array<{ userName: string; text: string; date: string }>;
}

export interface SimResult {
  originalCash: number;
  simulatedCash: number;
  delta: number;
  explanation: string;
}

export interface UpgradeState {
  trigger: UpgradeTrigger;
  quota?: { used: number; limit: number | null; remaining: number | null };
  resetAt?: string;
}

interface Ctx {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  selectedInvoiceId: string;
  setSelectedInvoiceId: (id: string) => void;
  selectedInvoice: Invoice;

  totalOutstanding: number;
  totalOverdue: number;
  recoveryRate: number;
  clients: Array<{ id: string; name: string; outstandingBalance: number }>;
  kpiBreakdown: {
    invoiceUnpaid: number;
    invoiceOverdue: number;
    clientOutstanding: number;
    manualExtra: number;
    paidCount: number;
    invoiceCount: number;
  };

  newComment: string;
  setNewComment: (v: string) => void;
  handleAddComment: (e: React.FormEvent) => void;

  query: string;
  setQuery: (v: string) => void;
  chatLog: Array<{ role: 'user' | 'assistant'; text: string; category?: string }>;
  isTyping: boolean;
  handleAskCFO: (customQuery?: string) => void;

  selectedScenario: string;
  simResults: SimResult | null;
  handleRunSimulation: (scenario: string) => void;

  isUploading: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleOcrUploadClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (v: boolean) => void;
  isPaying: boolean;
  handleMockPay: () => void;

  orgId: string;
  plan: ReturnType<typeof usePlan>['plan'];
  planLoading: boolean;
  planError: string | null;
  hasFeature: ReturnType<typeof usePlan>['hasFeature'];
  refreshPlan: () => void;

  upgrade: UpgradeState | null;
  setUpgrade: (u: UpgradeState | null) => void;
}

const DashboardContext = createContext<Ctx | null>(null);

export function useDashboard(): Ctx {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside <DashboardProvider>');
  return ctx;
}

const SEED_INVOICES: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-1001',
    clientName: 'ABC Corp',
    amount: 45000,
    status: 'OVERDUE',
    dueDate: '2026-07-07',
    issueDate: '2026-06-07',
    paidAt: null,
    riskScore: 83,
    timeline: [
      { status: 'DRAFT', date: '2026-06-07', description: 'Invoice initialized via OCR scan.' },
      { status: 'SENT', date: '2026-06-07', description: 'Emailed PDF to billing@abccorp.com.' },
      { status: 'VIEWED', date: '2026-06-09', description: 'Invoice opened by client accounts payable.' },
      { status: 'REMINDER_SENT', date: '2026-07-08', description: 'Soft reminder email triggered.' },
    ],
    comments: [
      {
        userName: 'Sarah Jenkins',
        text: 'Spoke with ABC AP coordinator. They are pushing invoice processing to next Tuesday.',
        date: '2026-07-19',
      },
    ],
  },
];

export default function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { plan, loading: planLoading, error: planError, hasFeature, refresh: refreshPlan } = usePlan();

  const [invoices, setInvoices] = useState<Invoice[]>(SEED_INVOICES);
  // Client balances are what the add / archive / edit flow directly moves, so
  // the KPIs read from here — otherwise adding a client changed nothing on the
  // Overview. The backend keeps outstandingBalance in sync with invoices, so
  // summing it double-counts nothing.
  const [clients, setClients] = useState<Array<{ id: string; name: string; outstandingBalance: number }>>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('1');
  const [newComment, setNewComment] = useState('');
  const [upgrade, setUpgrade] = useState<UpgradeState | null>(null);

  const [query, setQuery] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ role: 'user' | 'assistant'; text: string; category?: string }>>([
    {
      role: 'assistant',
      text: '### InvoNest Financial Advisor Active\n\nI am connected to your live QuickBooks ledger, Stripe billing feed, and accounts receivable pipeline.\n\n* Try asking me:\n  * *"Will we have enough cash for payroll?"*\n  * *"Can we afford to hire two software designers?"*\n  * *"Which customers are threatening our cash flow?"*\n  * *"What if our primary client defaults?"* (Digital Twin simulation)',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const [selectedScenario, setSelectedScenario] = useState('NONE');
  const [simResults, setSimResults] = useState<SimResult | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [orgId, setOrgId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null!) as React.RefObject<HTMLInputElement>;

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) || invoices[0];

  useEffect(() => {
    async function init() {
      // Demo bootstrap. The whole workspace is a public demo — no login wall.
      // With no session we quietly sign in as the shared demo account so the
      // backend calls below carry a valid token and the visitor can add/remove
      // freely. We store ONLY the token + org, never `invonest_user`: that
      // absence is what tells the account card/page this is a demo and to ask
      // for a real login when the visitor opens their account.
      if (!getToken()) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'demo@invonest.ai', pass: 'Demo@123' }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.token) localStorage.setItem('invonest_token', data.token);
            if (data?.organization) localStorage.setItem('invonest_org', JSON.stringify(data.organization));
          }
        } catch {
          // Backend unreachable — the page still renders in an empty demo state.
        }
      }

      try {
        const orgs = await api.get<any[]>('/api/organizations');
        if (orgs && orgs.length > 0) setOrgId(orgs[0].id);

        const invsData = await api.get<any[]>('/api/invoices');
        if (invsData && invsData.length > 0) {
          const mapped: Invoice[] = invsData.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.client?.name || 'Unknown Client',
            amount: Number(inv.amount),
            status: inv.status,
            dueDate: new Date(inv.dueDate).toISOString().split('T')[0],
            issueDate: inv.issueDate
              ? new Date(inv.issueDate).toISOString().split('T')[0]
              : undefined,
            paidAt: inv.paidAt ? new Date(inv.paidAt).toISOString().split('T')[0] : null,
            riskScore: inv.riskPrediction?.riskScore || 30,
            timeline: inv.timeline || [],
            comments: inv.comments || [],
          }));
          setInvoices(mapped);
          setSelectedInvoiceId(mapped[0].id);
        }

        // Clients drive the portfolio KPIs. A client carries its own
        // outstandingBalance and — for manually-added clients with no invoices —
        // that's the "overdue amount" entered on the Add-client form.
        const clientData = await api.get<any[]>('/api/clients');
        if (Array.isArray(clientData)) {
          setClients(
            clientData.map((c: any) => ({
              id: c.id,
              name: c.name,
              outstandingBalance: Number(c.outstandingBalance) || 0,
            })),
          );
        }
      } catch (err) {
        // A 401 has already redirected to /login inside apiFetch.
        console.error('Failed to load dashboard live data:', err);
      }
    }
    init();
  }, []);

  // Invoice-derived figures — the base the KPIs fall back to before clients load.
  const invoiceUnpaid = invoices.reduce((s, i) => (i.status !== 'PAID' ? s + i.amount : s), 0);
  const invoiceOverdue = invoices.reduce((s, i) => (i.status === 'OVERDUE' ? s + i.amount : s), 0);
  const clientOutstanding = clients.reduce((s, c) => s + c.outstandingBalance, 0);

  // Outstanding = every client's live balance. The backend keeps this equal to
  // the sum of unpaid invoices for invoiced clients, plus the manual amount for
  // clients with none — so add/remove/edit shows up here with no double count.
  const totalOutstanding = clients.length > 0 ? clientOutstanding : invoiceUnpaid;

  // At-risk = overdue invoices + the extra balance carried by manually-added
  // clients (clientOutstanding − invoiceUnpaid is exactly the non-invoiced
  // clients' entered "overdue amount"). Clamped so it never dips below the
  // invoice figure.
  const manualExtra = Math.max(0, clientOutstanding - invoiceUnpaid);
  const totalOverdue = clients.length > 0 ? invoiceOverdue + manualExtra : invoiceOverdue;

  const paidCount = invoices.filter((i) => i.status === 'PAID').length;
  const recoveryRate = invoices.length > 0 ? Math.round((paidCount / invoices.length) * 100) : 0;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === selectedInvoice.id
          ? {
              ...inv,
              comments: [
                ...inv.comments,
                { userName: 'Sarah Jenkins (Finance)', text: newComment, date: new Date().toISOString() },
              ],
            }
          : inv,
      ),
    );
    setNewComment('');
  };

  /**
   * Hits the real endpoint rather than replying from hardcoded strings, so the
   * answer reflects the actual forecast AND the query is charged against the
   * organisation's credit balance (PlanService.consumeCredits).
   */
  const handleAskCFO = async (customQuery?: string) => {
    const askQuery = customQuery || query;
    if (!askQuery.trim()) return;

    setChatLog((prev) => [...prev, { role: 'user', text: askQuery }]);
    setQuery('');
    setIsTyping(true);

    try {
      const res = await api.post<any>('/api/ai-copilot/ask', { query: askQuery });
      const text = res?.answer ?? res?.response ?? res?.message ?? 'No response returned.';
      setChatLog((prev) => [...prev, { role: 'assistant', text }]);
      refreshPlan(); // the credit was just spent — repaint the counter
    } catch (err) {
      if (err instanceof QuotaError) {
        setUpgrade({
          trigger: (err.body?.trigger ?? 'credits_exhausted') as UpgradeTrigger,
          quota: err.body?.quota,
          resetAt: err.body?.resetAt,
        });
        refreshPlan();
      } else {
        console.error('Copilot request failed:', err);
        setChatLog((prev) => [
          ...prev,
          { role: 'assistant', text: 'I could not reach the ledger service just now. Please try again.' },
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleRunSimulation = (scenario: string) => {
    setSelectedScenario(scenario);
    const base = 1240000;
    const res: SimResult = { originalCash: base, simulatedCash: base, delta: 0, explanation: '' };

    if (scenario === 'XYZ_LATE') {
      res.delta = -80000;
      res.explanation =
        'XYZ Ltd overdue balance of ₹80,000 shifts past the 30-day forecast horizon, dropping immediate liquidity projections.';
    } else if (scenario === 'IMPROVE_AR') {
      res.delta = 78750;
      res.explanation =
        'Improving collections collection efficiency by 15% recovers ₹78,750 of overdue receivables, boosting cash levels.';
    } else if (scenario === 'ACQUIRER_DEFAULT') {
      res.delta = -520000;
      res.explanation =
        'Acquirer Corp defaults on entire ₹5.2L active balances. Immediate bad-debt adjustment forced, cash drops by 41%.';
    } else if (scenario === 'SALES_DROP') {
      res.delta = -46500;
      res.explanation =
        'A 15% drop in new invoiced bookings reduces cash reserves by ₹46,500 over the next 30 days.';
    } else if (scenario === 'PAYROLL_UP') {
      res.delta = -80000;
      res.explanation =
        'Adding ₹80,000 in monthly salary overhead shifts baseline operating expenditures up immediately.';
    }
    res.simulatedCash = base + res.delta;
    setSimResults(res);
  };

  const handleMockPay = async () => {
    setIsPaying(true);
    try {
      await api.post(`/api/invoices/${selectedInvoice.id}/payments`, {
        amount: Number(selectedInvoice.amount),
        method: 'STRIPE',
        transactionId: `ch_${Math.random().toString(36).substring(2, 11)}`,
      });

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === selectedInvoice.id
            ? {
                ...inv,
                status: 'PAID' as const,
                timeline: [
                  ...inv.timeline,
                  {
                    status: 'PAID',
                    date: new Date().toISOString(),
                    description:
                      'Payment of ₹' +
                      Number(inv.amount).toLocaleString('en-IN') +
                      ' processed via Stripe Checkout.',
                  },
                ],
              }
            : inv,
        ),
      );
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error('Payment execution failed:', err);
      alert(`Payment Processing Failed: ${(err as any).message}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleOcrUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        setUploadProgress(45);
        const base64Data = reader.result as string;
        try {
          const responseData = await api.post<any>('/api/ocr/upload', { base64Data, fileName: file.name });
          setUploadProgress(100);

          const data = responseData.extractedData || responseData;
          const newInv: Invoice = {
            id: data.invoiceId || data.id,
            invoiceNumber: data.invoiceNumber,
            clientName: data.clientName || data.client?.name || 'Unknown Client',
            amount: Number(data.amount),
            status: data.status || 'DRAFT',
            dueDate: data.dueDate
              ? new Date(data.dueDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            riskScore: data.riskPrediction?.riskScore || 30,
            timeline: data.timeline || [
              { status: 'DRAFT', date: new Date().toISOString(), description: 'Invoice parsed via OCR system.' },
            ],
            comments: data.comments || [],
          };

          setInvoices((prev) => [newInv, ...prev]);
          setSelectedInvoiceId(newInv.id);
          refreshPlan(); // upload consumed a slot — repaint the quota bar
        } catch (err) {
          // 402 = free plan's upload cap. Show the contextual prompt with real usage.
          if (err instanceof QuotaError) {
            setUpgrade({
              trigger: (err.body?.trigger ?? 'invoice_limit') as UpgradeTrigger,
              quota: err.body?.quota,
              resetAt: err.body?.resetAt,
            });
          } else {
            console.error('OCR Upload Error:', err);
            alert(`OCR Scan failed: ${(err as any).message}`);
          }
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        alert('Could not read the selected file.');
        setIsUploading(false);
        setUploadProgress(0);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('FileReader initialization failed:', err);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        invoices, setInvoices,
        selectedInvoiceId, setSelectedInvoiceId, selectedInvoice,
        totalOutstanding, totalOverdue, recoveryRate,
        clients,
        kpiBreakdown: {
          invoiceUnpaid, invoiceOverdue, clientOutstanding, manualExtra,
          paidCount, invoiceCount: invoices.length,
        },
        newComment, setNewComment, handleAddComment,
        query, setQuery, chatLog, isTyping, handleAskCFO,
        selectedScenario, simResults, handleRunSimulation,
        isUploading, uploadProgress, fileInputRef, handleOcrUploadClick, handleFileChange,
        isPaymentModalOpen, setIsPaymentModalOpen, isPaying, handleMockPay,
        orgId, plan, planLoading, planError, hasFeature, refreshPlan,
        upgrade, setUpgrade,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
