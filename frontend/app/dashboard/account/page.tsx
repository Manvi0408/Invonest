'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogIn, User, ShieldCheck, LogOut, Sparkles } from 'lucide-react';

type Profile = { firstName: string; lastName: string; mobile: string; email: string };

/**
 * Account page.
 *
 * The rest of the dashboard is a fully-usable public demo. This page is the one
 * spot that cares who you are:
 *   1. No session  -> demo gate: a message asking you to log in, linking to the
 *      full /login page. (Everything else in the demo keeps working.)
 *   2. Signed in, profile not yet filled -> a short form (name, mobile, email).
 *   3. Signed in, profile complete -> your account, shown under your own name.
 *
 * "Session" is whatever /login persisted to localStorage (invonest_user). The
 * profile is stored separately (invonest_profile) so it survives across visits.
 */
export default function AccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile>({ firstName: '', lastName: '', mobile: '', email: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('invonest_user');
      const parsed = u ? JSON.parse(u) : null;
      setUser(parsed);
      const p = localStorage.getItem('invonest_profile');
      setProfile(p ? JSON.parse(p) : null);
      if (parsed?.email) setForm((f) => ({ ...f, email: parsed.email }));
    } catch {
      setUser(null);
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  // ---- STATE 1: demo, not logged in ---------------------------------------
  if (!user) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full bg-white border border-[#0d2227]/10 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#0d2227] text-white flex items-center justify-center mx-auto mb-5">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-[#0d2227] mb-2">You're in the demo workspace</h1>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            Explore everything — add clients, send reminders, run the simulator. When
            you're ready to make it yours, log in and your account lives here.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#0d2227] hover:bg-black text-white font-bold text-sm py-3 rounded-xl transition-colors"
          >
            <LogIn className="w-4 h-4" /> Log in to continue
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full mt-2.5 text-xs font-semibold text-zinc-500 hover:text-[#0d2227] py-2 transition-colors"
          >
            Keep exploring the demo
          </button>
        </div>
      </div>
    );
  }

  // ---- STATE 2: logged in, profile not filled -----------------------------
  if (!profile) {
    const submit = () => {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setError('Please enter your first and last name.');
        return;
      }
      if (!form.email.trim()) {
        setError('Please enter an email.');
        return;
      }
      const clean: Profile = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
      };
      localStorage.setItem('invonest_profile', JSON.stringify(clean));
      setProfile(clean);
      setError(null);
      // Nudge the sidebar chip to re-read the new name.
      window.dispatchEvent(new Event('invonest-auth'));
    };

    const field = (label: string, key: keyof Profile, type = 'text', placeholder = '') => (
      <div>
        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide font-mono block mb-1.5">{label}</label>
        <input
          type={type}
          value={form[key]}
          placeholder={placeholder}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full rounded-xl border border-[#0d2227]/15 px-3.5 py-2.5 text-sm outline-none focus:border-[#0d2227]/40 transition-colors"
          style={{ backgroundColor: '#ffffff', color: '#1c1c1c', WebkitTextFillColor: '#1c1c1c' }}
        />
      </div>
    );

    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-lg w-full bg-white border border-[#0d2227]/10 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#abc6d8]/20 text-[#0d2227] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0d2227] leading-tight">Set up your account</h1>
              <p className="text-xs text-zinc-500">Signed in as {user.email || 'your account'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {field('First name', 'firstName', 'text', 'Manvi')}
            {field('Last name', 'lastName', 'text', 'Yadav')}
            {field('Mobile number', 'mobile', 'tel', '+91 98765 43210')}
            {field('Email', 'email', 'email', 'you@company.com')}
          </div>

          {error && <p className="text-xs text-red-600 font-semibold mt-4">{error}</p>}

          <button
            onClick={submit}
            className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-[#0d2227] hover:bg-black text-white font-bold text-sm py-3 rounded-xl transition-colors"
          >
            Save and open my account
          </button>
        </div>
      </div>
    );
  }

  // ---- STATE 3: logged in, profile complete -------------------------------
  const signOut = () => {
    ['invonest_token', 'invonest_user', 'invonest_org', 'invonest_profile'].forEach((k) =>
      localStorage.removeItem(k),
    );
    window.dispatchEvent(new Event('invonest-auth'));
    router.push('/');
  };

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = fullName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <div className="bg-white border border-[#0d2227]/10 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0d2227] to-[#abc6d8] text-white flex items-center justify-center font-extrabold text-xl shrink-0">
            {initials || 'U'}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-[#0d2227] truncate">{fullName}</h1>
            <p className="text-sm text-zinc-500 truncate">{profile.email}</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {[
            ['First name', profile.firstName],
            ['Last name', profile.lastName],
            ['Mobile', profile.mobile || '—'],
            ['Email', profile.email],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[#0d2227]/10 p-4">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide font-mono">{label}</div>
              <div className="text-sm font-semibold text-[#0d2227] mt-1 break-words">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-8">
          <button
            onClick={() => setProfile(null)}
            className="inline-flex items-center gap-2 bg-[#abc6d8]/20 hover:bg-[#abc6d8]/30 text-[#0d2227] font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
          >
            <User className="w-3.5 h-3.5" /> Edit details
          </button>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-red-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-5 px-1">
        <Sparkles className="w-3.5 h-3.5" />
        Everything in this workspace is yours now — clients, reminders and forecasts are saved to your ledger.
      </div>
    </div>
  );
}
