'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Sidebar account chip.
 *
 * Reads the session that `/login` writes to localStorage. With no session the
 * workspace is a public DEMO (fully usable — the account page is the only thing
 * gated behind login). Once signed in, the chip shows the person's own name,
 * preferring the profile they filled in over their raw email handle.
 *
 * localStorage is read in an effect (not during render) so the server and first
 * client paint agree — otherwise React throws a hydration mismatch.
 */
export default function AccountCard() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<{ firstName?: string; lastName?: string; email?: string } | null>(null);

  useEffect(() => {
    const sync = () => {
      try {
        const u = localStorage.getItem('invonest_user');
        setUser(u ? JSON.parse(u) : null);
        const p = localStorage.getItem('invonest_profile');
        setProfile(p ? JSON.parse(p) : null);
      } catch {
        setUser(null);
      }
    };
    sync();
    // Reflect login / profile changes made in this or another tab.
    window.addEventListener('storage', sync);
    window.addEventListener('invonest-auth', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('invonest-auth', sync as EventListener);
    };
  }, []);

  const isDemo = !user;
  const fullName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName ?? ''}`.trim()
    : user?.name || user?.email?.split('@')[0] || 'Demo';

  const displayName = isDemo ? 'Demo Account' : fullName;
  const sub = isDemo ? 'DEMO · TAP TO LOG IN' : (profile?.email || user?.email || 'FINANCE ADMIN');
  const initials = isDemo
    ? 'D'
    : (fullName.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase() || 'U');

  return (
    <Link
      href="/dashboard/account"
      className="flex items-center gap-3 px-3 py-2.5 bg-white/8 border border-white/12 rounded-xl mt-2 hover:bg-white/[0.14] transition-colors"
    >
      <div className="w-8 h-8 rounded-full bg-white text-[#232323] flex items-center justify-center font-extrabold text-xs shrink-0">
        {initials}
      </div>
      <div className="min-w-0">
        <div className="font-bold text-white text-[11px] leading-none truncate">{displayName}</div>
        <span className="text-[10px] text-white/45 font-bold font-mono truncate block mt-0.5">{sub}</span>
      </div>
    </Link>
  );
}
