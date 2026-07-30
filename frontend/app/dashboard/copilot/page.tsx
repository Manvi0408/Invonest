'use client';

/* Extracted from the old single-page dashboard so each sidebar item opens its own
   route. Shared state comes from <DashboardProvider> in layout.tsx. */

import React, { useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useDashboard } from '../DashboardProvider';
import UpgradePrompt from '../../components/UpgradePrompt';
import CreditsCounter from '../../components/CreditsCounter';

export default function CopilotPage() {
  const { query, setQuery, chatLog, isTyping, handleAskCFO, plan, planLoading, planError, upgrade, setUpgrade } = useDashboard();

  // Auto-scroll the transcript to the newest message. Without this the answer
  // renders below the fold and the user has to scroll to find it — the exact
  // complaint. Runs on every new message and while the AI is "typing".
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Scroll the container itself rather than scrollIntoView, so it never drags
    // the whole page — only the chat pane moves.
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatLog, isTyping]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="mb-2">
        <h1 className="text-lg font-extrabold text-[#0d2227]">AI CFO Copilot</h1>
        <p className="text-[11px] text-zinc-500 font-mono">Real-time ledger audit chat assistant</p>
      </header>

      <div className="max-w-4xl">
        {/* AI CFO CO-PILOT (1 COL) */}
        <div id="ai-cfo" className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 flex flex-col h-[640px] justify-between shadow-sm text-[#0d2227]">
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-[#0d2227]">AI CFO Advisor</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Real-time ledger audit chat assistant</p>
              </div>
              <MessageSquare className="w-4 h-4 text-[#0d2227]" />
            </div>

            {/* Chat Box */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs scroll-smooth">
              {chatLog.map((chat, idx) => (
                <div key={idx} className={`flex gap-2 ${chat.role === 'user' ? 'justify-end' : ''}`}>
                  {chat.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-[#0d2227] text-white flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                  )}
                  
                  <div className={`p-3 rounded-2xl max-w-[85%] ${chat.role === 'user' ? 'bg-[#abc6d8]/35 border border-[#abc6d8]/50 text-[#0d2227] font-semibold rounded-tr-none' : 'bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-tl-none'}`}>
                    {/* Render basic custom markdown structures for clean visual formatting */}
                    <div className="space-y-1.5 leading-relaxed">
                      {chat.text.split('\n').map((line, lIdx) => {
                        if (line.startsWith('###')) {
                          return <div key={lIdx} className="font-bold text-[#0d2227] text-[11px] mt-2 mb-1">{line.replace('###', '')}</div>;
                        }
                        if (line.startsWith('*')) {
                          return <div key={lIdx} className="pl-2 border-l border-[#0d2227]/30 my-1">{line.replace('*', '')}</div>;
                        }
                        return <div key={lIdx}>{line}</div>;
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#0d2227] text-white flex items-center justify-center text-[10px] font-bold">AI</div>
                  <div className="bg-zinc-100 border border-zinc-200 p-3 rounded-2xl rounded-tl-none text-[11px] text-zinc-500 font-mono">
                    Synthesizing forecast models...
                  </div>
                </div>
              )}
              {/* Scroll target — the effect keeps this in view. */}
              <div ref={endRef} />
            </div>
          </div>

          {/* Quick templates input buttons */}
          <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2 shrink-0">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1 font-mono">CFO Queries</div>
            <div className="flex flex-wrap gap-1.5">
              <button 
                onClick={() => handleAskCFO('Can we afford to hire two software designers?')}
                className="bg-[#abc6d8]/15 border border-[#abc6d8]/30 hover:bg-[#abc6d8]/30 text-[#0d2227] px-2 py-1 rounded text-[10px] font-semibold transition-all"
              >
                Can we afford to hire?
              </button>
              <button 
                onClick={() => handleAskCFO('Will we have enough cash for payroll?')}
                className="bg-[#abc6d8]/15 border border-[#abc6d8]/30 hover:bg-[#abc6d8]/30 text-[#0d2227] px-2 py-1 rounded text-[10px] font-semibold transition-all"
              >
                 Solvency runway check
              </button>
              <button 
                onClick={() => handleAskCFO('Which customers present high accounts receivable risk?')}
                className="bg-[#abc6d8]/15 border border-[#abc6d8]/30 hover:bg-[#abc6d8]/30 text-[#0d2227] px-2 py-1 rounded text-[10px] font-semibold transition-all"
              >
                 Accounts receivable risks
              </button>
            </div>

            {/* Custom Input — larger and higher-contrast so it reads clearly as
                the place to type. Explicit white fill + dark text so it can't be
                lightened by the dark-mode input rule. */}
            <div className="flex gap-2 mt-3.5">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskCFO()}
                placeholder="Ask a question about your ledger…"
                aria-label="Ask the AI CFO a question"
                className="rounded-xl text-sm px-4 py-3 flex-1 focus:outline-none focus:ring-2 focus:ring-[#0d2227]/30 shadow-sm"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1c1c1c',
                  WebkitTextFillColor: '#1c1c1c',
                  border: '1.5px solid rgba(28,28,28,0.22)',
                }}
              />
              <button
                onClick={() => handleAskCFO()}
                aria-label="Send"
                className="bg-[#0d2227] text-white hover:bg-[#1a3339] px-4 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> Ask
              </button>
            </div>

            {/* Chatbot credit meter — sits directly under the ask box. */}
            <div className="mt-2.5 pt-2.5 border-t border-zinc-100">
              <CreditsCounter plan={plan} loading={planLoading} error={planError} />
            </div>
          </div>
        </div>
      </div>
      {upgrade && (
        <UpgradePrompt
          trigger={upgrade.trigger}
          quota={upgrade.quota}
          resetAt={upgrade.resetAt}
          onClose={() => setUpgrade(null)}
        />
      )}
    </div>
  );
}
