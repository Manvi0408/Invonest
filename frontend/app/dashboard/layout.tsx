'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardProvider from './DashboardProvider';
import ContentVideo from './ContentVideo';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import RailVideo from './RailVideo';
import AccountCard from './AccountCard';
import { 
  Activity, 
  Briefcase, 
  MessageSquare, 
  UploadCloud, 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  Bell, 
  User, 
  Settings,
  HelpCircle,
  Menu,
  ChevronDown,
  Wallet,
  Blocks
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;
  const [unreadNotifications, setUnreadNotifications] = useState([
    { id: 1, title: 'High Risk Exposure Alert', message: 'Delinquent accounts exceed ₹5L. Collect now.', type: 'WARNING', time: '10m ago' },
    { id: 2, title: 'Invoice OCR Complete', message: 'Invoice INV-2041 parsed with 97% confidence.', type: 'SUCCESS', time: '1h ago' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="zarss flex h-screen overflow-hidden text-[#1c1c1c] gap-4 p-4">
      
      {/* SIDEBAR */}
      <aside className="z-rail w-64 shrink-0 flex-col justify-between hidden md:flex relative overflow-hidden">
        {/* Rail backdrop — the attached ambient video, behind the whole rail. */}
        <RailVideo />

        <div className="relative z-10 overflow-y-auto">
          {/* Logo and Tenant Selector */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#0d2227] to-[#abc6d8] flex items-center justify-center font-bold text-white text-xs">
                N
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white uppercase">InvoNest</span>
            </Link>
            <span className="text-[10px] text-white/45 font-mono border border-white/15 px-2 py-0.5 rounded uppercase">v2.0</span>
          </div>

          <div className="p-4 border-b border-white/10">
            <WorkspaceSwitcher />
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 text-xs font-semibold">
            <Link 
              href="/dashboard" 
              data-active={pathname === '/dashboard'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
            >
              <Activity className="w-4 h-4 opacity-90" /> Overview Panel
            </Link>
            <div className="px-3 py-2.5 text-[10px] uppercase font-bold text-white/35 tracking-wider font-mono">A/R Ledger</div>
                        <Link
              href="/dashboard/clients"
              data-active={pathname === '/dashboard/clients'}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                ''
              }`}
            >
              <Briefcase className="w-4 h-4 opacity-70" /> Client Ledger
            </Link>
                        <Link
              href="/dashboard/upload"
              data-active={pathname === '/dashboard/upload'}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                ''
              }`}
            >
              <UploadCloud className="w-4 h-4 opacity-70" /> Invoice Upload
            </Link>
            <Link
              href="/dashboard/expenses"
              data-active={pathname === '/dashboard/expenses'}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                ''
              }`}
            >
              <Wallet className="w-4 h-4 opacity-70" /> Expenses &amp; Cash
            </Link>
            <div className="px-3 py-2.5 text-[10px] uppercase font-bold text-white/35 tracking-wider font-mono">AI Intelligence</div>
                        <Link
              href="/dashboard/copilot"
              data-active={pathname === '/dashboard/copilot'}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                ''
              }`}
            >
              <MessageSquare className="w-4 h-4 opacity-70" /> AI CFO Copilot
            </Link>
                        <Link
              href="/dashboard/simulator"
              data-active={pathname === '/dashboard/simulator'}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                ''
              }`}
            >
              <TrendingUp className="w-4 h-4 opacity-70" /> Scenario Simulator
            </Link>

            <Link
              href="/dashboard/reminders"
              data-active={pathname === '/dashboard/reminders'}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
            >
              <Zap className="w-4 h-4 opacity-70" /> Reminder Builder
            </Link>
            <div className="px-3 py-2.5 text-[10px] uppercase font-bold text-white/35 tracking-wider font-mono">Data Platform</div>
            <Link
              href="/dashboard/integrations"
              data-active={pathname === '/dashboard/integrations'}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
            >
              <Blocks className="w-4 h-4 opacity-70" /> Integrations
            </Link>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="relative z-10 p-4 border-t border-white/10 space-y-1 text-xs font-medium">
          <Link 
            href="/dashboard/setup" 
            data-active={pathname === '/dashboard/setup'}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
              ''
            }`}
          >
            <Settings className="w-4 h-4" /> Setup & Ledgers
          </Link>
          <Link 
            href="/dashboard/documentation" 
            data-active={pathname === '/dashboard/documentation'}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
              ''
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Documentation
          </Link>
          <AccountCard />
        </div>
      </aside>

      {/* MAIN SCREEN AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <ContentVideo />
        
        {/* HEADER TOOLBAR */}
        <header className="relative z-30 h-16 px-2 flex justify-between items-center shrink-0 mb-1">
          <button className="md:hidden text-zinc-600 hover:text-[#0d2227]">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="font-extrabold text-sm text-[#0d2227] hidden md:block">Financial Command Center</div>
          
          <div className="flex items-center gap-4 relative">
            
            {/* Notifications Dropdown Toggle */}
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 rounded-lg bg-[#abc6d8]/10 border border-[#abc6d8]/20 flex items-center justify-center text-[#0d2227] hover:bg-[#abc6d8]/20 relative transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-11 w-80 bg-white border border-[#0d2227]/15 rounded-xl p-4 shadow-xl z-50 text-xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-[#0d2227]">System Notifications</span>
                  <button onClick={() => setUnreadNotifications([])} className="text-[10px] text-[#0d2227] hover:underline font-bold">Clear all</button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {unreadNotifications.length === 0 ? (
                    <div className="text-zinc-500 text-center py-4 font-mono text-[10px]">No new alerts.</div>
                  ) : (
                    unreadNotifications.map((n) => (
                      <div key={n.id} className="pb-2.5 border-b border-zinc-100 last:border-b-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className={`font-bold ${n.type === 'WARNING' ? 'text-red-600' : 'text-green-600'}`}>{n.title}</span>
                          <span className="text-[9px] text-zinc-400">{n.time}</span>
                        </div>
                        <p className="text-zinc-500 text-[10px] leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <button className="flex items-center gap-2 bg-[#0d2227] hover:bg-[#1a3339] px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors">
              <Zap className="w-3.5 h-3.5 fill-white/10" /> Sync Ledger
            </button>
          </div>
        </header>

        {/* WORKSPACE CONTENT BODY */}
        {/* Content tone is applied to the shell only. Cards inside keep the
            existing --lg-* glass tokens, so we don't stack glass on glass. */}
        <main className="relative z-10 flex-1 overflow-y-auto rounded-[22px]">
          <DashboardProvider>{children}</DashboardProvider>
        </main>
      </div>

    </div>
  );
}
