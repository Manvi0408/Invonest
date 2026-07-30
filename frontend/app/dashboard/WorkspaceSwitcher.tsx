'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { api, setSession } from '../lib/api';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

/**
 * Workspace switcher.
 *
 * The org id lives inside the JWT and the backend guard reads it from there, so
 * switching cannot be done client-side: POST /api/auth/switch-company verifies
 * membership server-side and returns a fresh token. We store that, then do a
 * full reload so every cached query re-fetches against the new tenant — a
 * partial refresh would leave stale rows from the previous org on screen.
 */
export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const org = JSON.parse(localStorage.getItem('invonest_org') || 'null');
      if (org?.id) setActiveId(org.id);
    } catch {
      /* malformed storage is not worth failing the switcher over */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setWorkspaces(await api.get<Workspace[]>('/api/auth/workspaces'));
    } catch (err: any) {
      setError(err?.message || 'Could not load workspaces.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function pick(ws: Workspace) {
    if (ws.id === activeId) { setOpen(false); return; }
    setSwitching(ws.id);
    setError(null);
    try {
      const res = await api.post<{ token: string; user: unknown; organization: unknown }>(
        '/api/auth/switch-company',
        { organizationId: ws.id },
      );
      setSession(res.token, res.user, res.organization);
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || 'Could not switch workspace.');
      setSwitching(null);
    }
  }

  const active = workspaces.find((w) => w.id === activeId);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between text-xs text-white/85 bg-white/8 border border-white/12 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/12 transition-all"
      >
        <span className="font-semibold truncate max-w-[140px] text-left">
          {loading ? 'Loading…' : active?.name ?? 'Select workspace'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="liquid absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-white/15 shadow-2xl overflow-hidden"
        >
          {/* Bounded height with internal scroll — an unbounded list would run
              off the bottom of the rail once a user joins enough workspaces.
              ~6 rows at 44px before it starts scrolling. */}
          <div className="max-h-[264px] overflow-y-auto py-1">
            {loading ? (
              <p className="px-3 py-2.5 text-[10px] font-mono text-white/50">Loading…</p>
            ) : workspaces.length === 0 ? (
              <p className="px-3 py-2.5 text-[10px] font-mono text-white/50">No workspaces found.</p>
            ) : (
              workspaces.map((ws) => {
                const isActive = ws.id === activeId;
                return (
                  <button
                    key={ws.id}
                    role="option"
                    aria-selected={isActive}
                    disabled={switching !== null}
                    onClick={() => pick(ws)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors disabled:opacity-60 ${
                      isActive ? 'bg-white/12' : 'hover:bg-white/8'
                    }`}
                  >
                    <span className="w-6 h-6 shrink-0 rounded-md bg-white/15 flex items-center justify-center text-[10px] font-extrabold text-white">
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-white truncate">{ws.name}</span>
                      <span className="block text-[9px] font-mono text-white/45">
                        {ws.role} · {ws.plan}
                      </span>
                    </span>
                    {switching === ws.id ? (
                      <span className="text-[9px] font-mono text-white/60">…</span>
                    ) : isActive ? (
                      <Check className="w-3.5 h-3.5 text-white shrink-0" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {error && (
            <p className="px-3 py-2 text-[10px] font-semibold text-red-300 border-t border-white/10">
              {error}
            </p>
          )}

          {/* No "+ Create workspace": there is no org-creation endpoint, and a
              button that cannot do anything is worse than its absence. */}
        </div>
      )}
    </div>
  );
}
