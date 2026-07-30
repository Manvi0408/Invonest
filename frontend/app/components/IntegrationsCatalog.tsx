'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PROVIDERS, CATEGORIES } from './integrationsData';

/**
 * Clay-style integrations catalogue: a category filter bar + search over
 * transparent-glass cards, one per provider we support. Filtering is real —
 * pills scope by category, the search box matches name/description.
 */
export default function IntegrationsCatalog() {
  const [active, setActive] = useState<'All' | string>('All');
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROVIDERS.filter((p) => (active === 'All' || p.category === active))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [active, query]);

  return (
    <div className="relative z-10 max-w-5xl mx-auto mt-12">
      {/* Filter + search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div
          className="flex flex-wrap items-center gap-1 p-1 rounded-full self-start"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          {CATEGORIES.map((c) => {
            const on = active === c;
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors"
                style={on
                  ? { background: '#ffffff', color: '#0b0b0f' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.55)' }}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div
          className="flex items-center gap-2 px-3.5 py-2 rounded-full min-w-[200px]"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <Search className="w-4 h-4 text-white/40 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="bg-transparent outline-none text-sm text-white placeholder-white/35 w-full"
            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          />
        </div>
      </div>

      {/* Glass cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {results.map((p) => (
          <div
            key={p.name}
            className="rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5"
            style={{
              background: 'rgba(255,255,255,0.045)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(14px) saturate(140%)',
              WebkitBackdropFilter: 'blur(14px) saturate(140%)',
              boxShadow: '0 16px 36px -22px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(160deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 45%), ${p.color}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}
              >
                {p.icon ? (
                  <svg viewBox="0 0 24 24" width={17} height={17} fill="#ffffff" aria-hidden="true"><path d={p.icon} /></svg>
                ) : (
                  <span className="text-white text-[11px] font-extrabold">{p.mono}</span>
                )}
              </span>
              <div className="min-w-0">
                <div className="text-white font-bold text-sm truncate">{p.name}</div>
                <div className="text-[9px] uppercase font-bold tracking-wider text-white/40 font-mono">{p.category}</div>
              </div>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed mt-3">{p.description}</p>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <p className="text-center text-white/40 text-sm py-8">No integrations match “{query}”.</p>
      )}
    </div>
  );
}
