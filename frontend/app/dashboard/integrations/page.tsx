'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import {
  Link2, RefreshCw, Unplug, ScrollText, CheckCircle2, AlertTriangle, Loader2, Plug, ShieldCheck, X,
} from 'lucide-react';

type Integration = {
  provider: string;
  name: string;
  category: 'ACCOUNTING' | 'CRM' | 'PAYMENTS' | 'COMMUNICATION';
  description: string;
  authType: 'oauth2' | 'apikey';
  brandColor: string;
  syncs: string[];
  supportsWebhooks: boolean;
  configured: boolean;
  missingEnv: string[];
  status: string;
  connectedAccount: string | null;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  error: string | null;
  integrationId: string | null;
};

const CATEGORY_ORDER = ['ACCOUNTING', 'CRM', 'PAYMENTS', 'COMMUNICATION'] as const;
const CATEGORY_LABEL: Record<string, string> = {
  ACCOUNTING: 'Accounting', CRM: 'CRM', PAYMENTS: 'Payments', COMMUNICATION: 'Communication',
};

const STATUS_META: Record<string, { label: string; color: string; pulse?: boolean }> = {
  NOT_CONNECTED: { label: 'Not Connected', color: '#9ca3af' },
  CONNECTING: { label: 'Connecting…', color: '#f59e0b', pulse: true },
  AUTHORIZING: { label: 'Authorizing…', color: '#f59e0b', pulse: true },
  CONNECTED: { label: 'Connected', color: '#16a34a' },
  SYNCING: { label: 'Syncing', color: '#2563eb', pulse: true },
  SYNC_FAILED: { label: 'Sync Failed', color: '#dc2626' },
  DISCONNECTED: { label: 'Disconnected', color: '#9ca3af' },
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function timeUntil(iso: string | null): string {
  if (!iso) return '—';
  const s = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (s <= 0) return 'due now';
  if (s < 3600) return `in ${Math.floor(s / 60)}m`;
  return `in ${Math.floor(s / 3600)}h`;
}

export default function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [logsFor, setLogsFor] = useState<Integration | null>(null);
  const [logs, setLogs] = useState<{ jobs: any[]; logs: any[] } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Integration[]>('/api/integrations');
      setItems(data);
    } catch {
      setToast({ kind: 'err', msg: 'Could not load integrations.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Handle the OAuth round-trip result (?connected= / ?error=).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('connected')) {
      setToast({ kind: 'ok', msg: `${q.get('connected')} connected — importing your data.` });
      window.history.replaceState({}, '', '/dashboard/integrations');
    } else if (q.get('error')) {
      setToast({ kind: 'err', msg: `Authorization failed: ${q.get('error')}` });
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const connect = async (it: Integration) => {
    setBusy(it.provider);
    try {
      const res: any = await api.post(`/api/integrations/${it.provider.toLowerCase()}/connect`);
      if (res.configured === false) {
        setToast({ kind: 'err', msg: `${it.name} needs credentials: set ${res.missingEnv.join(', ')}` });
      } else if (res.authorizeUrl) {
        window.location.href = res.authorizeUrl; // provider consent screen → callback
        return;
      } else {
        setToast({ kind: 'ok', msg: `${it.name} connected.` });
        await load();
      }
    } catch (e: any) {
      setToast({ kind: 'err', msg: e?.message || 'Connection failed.' });
    } finally {
      setBusy(null);
    }
  };

  const sync = async (it: Integration) => {
    setBusy(it.provider);
    try {
      await api.post(`/api/integrations/${it.provider.toLowerCase()}/sync`);
      setToast({ kind: 'ok', msg: `${it.name}: sync queued.` });
      setTimeout(load, 1500);
    } catch (e: any) {
      setToast({ kind: 'err', msg: e?.message || 'Sync failed to start.' });
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (it: Integration) => {
    setBusy(it.provider);
    try {
      await api.post(`/api/integrations/${it.provider.toLowerCase()}/disconnect`);
      setToast({ kind: 'ok', msg: `${it.name} disconnected.` });
      await load();
    } catch (e: any) {
      setToast({ kind: 'err', msg: e?.message || 'Disconnect failed.' });
    } finally {
      setBusy(null);
    }
  };

  const openLogs = async (it: Integration) => {
    setLogsFor(it);
    setLogs(null);
    try {
      setLogs(await api.get(`/api/integrations/${it.provider.toLowerCase()}/logs`));
    } catch {
      setLogs({ jobs: [], logs: [] });
    }
  };

  const connectedCount = items.filter((i) => i.status === 'CONNECTED' || i.status === 'SYNCING').length;

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono">Data Platform</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0d2227] mt-1">Integrations</h1>
          <p className="text-sm text-zinc-500 mt-1.5 max-w-xl">
            Securely connect your accounting, CRM, payment and communication tools. OAuth tokens are encrypted at rest and refreshed automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0d2227] bg-white border border-[#0d2227]/10 rounded-xl px-3.5 py-2 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          {connectedCount} of {items.length || 8} connected
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading providers…</div>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          const group = items.filter((i) => i.category === cat);
          if (!group.length) return null;
          return (
            <section key={cat} className="mb-9">
              <h2 className="text-[11px] uppercase font-bold tracking-widest text-zinc-400 font-mono mb-3">{CATEGORY_LABEL[cat]}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {group.map((it) => (
                  <Card
                    key={it.provider}
                    it={it}
                    busy={busy === it.provider}
                    onConnect={() => connect(it)}
                    onSync={() => sync(it)}
                    onDisconnect={() => disconnect(it)}
                    onLogs={() => openLogs(it)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* LOGS DRAWER */}
      <AnimatePresence>
        {logsFor && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLogsFor(null)} />
            <motion.div
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            >
              <div className="flex items-center justify-between p-5 border-b border-[#0d2227]/10">
                <div>
                  <div className="font-extrabold text-[#0d2227]">{logsFor.name}</div>
                  <div className="text-xs text-zinc-500">Sync jobs & activity</div>
                </div>
                <button onClick={() => setLogsFor(null)} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {!logs ? (
                  <div className="text-zinc-400 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                ) : (
                  <>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400 font-mono mb-2">Recent Jobs</div>
                      {logs.jobs.length === 0 ? <p className="text-xs text-zinc-400">No jobs yet.</p> : logs.jobs.map((j) => (
                        <div key={j.id} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-100">
                          <span className="font-mono text-zinc-600">{j.kind}</span>
                          <span className={`font-bold ${j.status === 'SUCCEEDED' ? 'text-green-600' : j.status === 'FAILED' ? 'text-red-600' : 'text-blue-600'}`}>{j.status} · {j.recordsSynced}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400 font-mono mb-2">Activity Log</div>
                      {logs.logs.length === 0 ? <p className="text-xs text-zinc-400">No activity yet.</p> : logs.logs.map((l) => (
                        <div key={l.id} className="text-[11px] py-1 flex gap-2">
                          <span className={`font-bold ${l.level === 'ERROR' ? 'text-red-600' : l.level === 'WARN' ? 'text-amber-600' : 'text-zinc-400'}`}>{l.level}</span>
                          <span className="text-zinc-600">{l.message}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xl"
            style={{ backgroundColor: toast.kind === 'ok' ? '#16a34a' : '#dc2626' }}
          >
            {toast.kind === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Card({ it, busy, onConnect, onSync, onDisconnect, onLogs }: {
  it: Integration; busy: boolean;
  onConnect: () => void; onSync: () => void; onDisconnect: () => void; onLogs: () => void;
}) {
  const st = STATUS_META[it.status] || STATUS_META.NOT_CONNECTED;
  const isConnected = it.status === 'CONNECTED' || it.status === 'SYNCING' || it.status === 'SYNC_FAILED';
  const initials = it.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="relative rounded-2xl p-5 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        border: '1px solid rgba(13,34,39,0.08)',
        boxShadow: '0 18px 40px -24px rgba(8,12,20,0.35), inset 0 1px 0 rgba(255,255,255,0.7)',
      }}
    >
      {/* brand glow */}
      <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-25" style={{ background: it.brandColor }} />

      <div className="relative flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm" style={{ background: it.brandColor }}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#0d2227] text-sm truncate">{it.name}</h3>
            {it.supportsWebhooks && <span className="text-[8px] font-bold uppercase text-zinc-400 border border-zinc-200 rounded px-1 py-0.5 font-mono">webhook</span>}
          </div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">{CATEGORY_LABEL[it.category]}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${st.pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: st.color }} />
          <span className="text-[11px] font-bold" style={{ color: st.color }}>{st.label}</span>
        </div>
      </div>

      <p className="relative text-xs text-zinc-500 leading-relaxed mt-3">{it.description}</p>

      <div className="relative flex flex-wrap gap-1 mt-3">
        {it.syncs.map((s) => (
          <span key={s} className="text-[9px] font-semibold text-[#0d2227]/70 bg-[#abc6d8]/15 border border-[#abc6d8]/25 rounded-full px-2 py-0.5">{s}</span>
        ))}
      </div>

      {isConnected && (
        <div className="relative flex items-center gap-4 mt-3 text-[10px] text-zinc-400 font-mono">
          <span>synced {timeAgo(it.lastSyncedAt)}</span>
          <span>next {timeUntil(it.nextSyncAt)}</span>
          {it.connectedAccount && <span className="truncate">· {it.connectedAccount}</span>}
        </div>
      )}
      {it.error && it.status === 'SYNC_FAILED' && (
        <p className="relative text-[10px] text-red-600 mt-2 font-medium truncate">{it.error}</p>
      )}
      {/* Configured-but-not-connected: show that the keys are in place. We don't
          surface the env-var names to end users. */}
      {it.configured && !isConnected && it.status !== 'AUTHORIZING' && (
        <p className="relative text-[10px] text-emerald-600 mt-2 font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Credentials added — ready to connect
        </p>
      )}
      {!it.configured && (
        <p className="relative text-[10px] text-zinc-400 mt-2 font-medium">Not configured yet</p>
      )}

      <div className="relative flex flex-wrap items-center gap-2 mt-4">
        {!isConnected ? (
          <button onClick={onConnect} disabled={busy} className="inline-flex items-center gap-1.5 bg-[#0d2227] hover:bg-black text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors disabled:opacity-60">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />} Connect
          </button>
        ) : (
          <>
            <button onClick={onSync} disabled={busy || it.status === 'SYNCING'} className="inline-flex items-center gap-1.5 bg-[#0d2227] hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-60">
              {busy || it.status === 'SYNCING' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync Now
            </button>
            {it.status === 'SYNC_FAILED' && (
              <button onClick={onConnect} disabled={busy} className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                <Link2 className="w-3.5 h-3.5" /> Reconnect
              </button>
            )}
            <button onClick={onLogs} className="inline-flex items-center gap-1.5 text-[#0d2227] hover:bg-[#0d2227]/5 text-xs font-bold px-3 py-2 rounded-lg transition-colors border border-[#0d2227]/10">
              <ScrollText className="w-3.5 h-3.5" /> View Logs
            </button>
            <button onClick={onDisconnect} disabled={busy} className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-red-600 text-xs font-bold px-2.5 py-2 rounded-lg transition-colors">
              <Unplug className="w-3.5 h-3.5" /> Disconnect
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
