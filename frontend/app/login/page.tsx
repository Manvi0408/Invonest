'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, User, Copy, Check, X as XIcon } from 'lucide-react';

import { API_BASE } from '../lib/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const PERSONAL_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];

function isPersonalEmail(email: string) {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  return !domain || PERSONAL_EMAIL_DOMAINS.includes(domain);
}

function decodeJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

interface Toast {
  id: number;
  variant: 'error' | 'success';
  title: string;
  message: string;
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.5 34.9 26.9 36 24 36c-5.4 0-9.9-3.4-11.5-8.2l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.3-5.6 6.9l6.5 5.5C39.9 37.6 44 31.4 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('demo@invonest.ai');
  const [password, setPassword] = useState('Demo@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const hiddenGoogleDivRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);
  const rippleIdRef = useRef(0);

  const pushToast = useCallback((variant: Toast['variant'], title: string, message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, variant, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const completeAuth = useCallback(
    (data: { token: string; user: any; organization: any }) => {
      localStorage.setItem('invonest_token', data.token);
      localStorage.setItem('invonest_user', JSON.stringify(data.user));
      localStorage.setItem('invonest_org', JSON.stringify(data.organization));
      setTransitioning(true);
      setTimeout(() => router.push('/dashboard'), 300);
    },
    [router]
  );

  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      const payload = decodeJwtPayload(response.credential);
      if (payload?.email && (!payload.hd || isPersonalEmail(payload.email))) {
        pushToast(
          'error',
          'Not a company account.',
          "Please sign in using your organization's Google Workspace account."
        );
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) {
          pushToast(
            'error',
            res.status === 403 ? 'Not a company account.' : 'Sign-in failed',
            data?.message || "Please sign in using your organization's Google Workspace account."
          );
          return;
        }
        pushToast('success', 'Welcome back', 'Signed in with Google Workspace.');
        completeAuth(data);
      } catch {
        pushToast('error', 'Sign-in failed', 'Could not reach the InvoNest server. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [pushToast, completeAuth]
  );

  useEffect(() => {
    if (!scriptLoaded || !GOOGLE_CLIENT_ID) return;
    const google = (window as any).google;
    if (!google?.accounts?.id) return;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });

    if (hiddenGoogleDivRef.current) {
      google.accounts.id.renderButton(hiddenGoogleDivRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 300,
      });
    }
  }, [scriptLoaded, handleGoogleCredential]);

  function triggerGoogleSignIn() {
    if (!GOOGLE_CLIENT_ID) {
      pushToast(
        'error',
        'Google Sign-In not configured',
        'Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env.local with a Google Cloud OAuth Client ID.'
      );
      return;
    }
    const realBtn = hiddenGoogleDivRef.current?.querySelector('div[role="button"]') as HTMLElement | null;
    if (realBtn) {
      realBtn.click();
    } else {
      pushToast('error', 'Google Sign-In unavailable', 'Please try again in a moment.');
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();

    if (isPersonalEmail(email)) {
      pushToast(
        'error',
        'Not a company account.',
        "Please sign in using your organization's Google Workspace account."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast('error', 'Login failed', data?.message || 'Invalid credentials.');
        return;
      }
      pushToast('success', 'Welcome back', 'Signed in to your finance workspace.');
      completeAuth(data);
    } catch {
      pushToast('error', 'Login failed', 'Could not reach the InvoNest server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleLoginRipple(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++rippleIdRef.current;
    setRipples((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 650);
  }

  function copyToClipboard(field: 'email' | 'password', value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }

  const [particles, setParticles] = useState<
    { id: number; left: number; top: number; size: number; duration: number; delay: number }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 8 + Math.random() * 10,
        delay: Math.random() * 6,
      }))
    );
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-y-auto overflow-x-hidden"
      style={{ backgroundColor: '#3d4a3f' }}
      onMouseMove={(e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        setMouse({ x, y });
      }}
    >
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      {/* Hidden real Google button — proxies clicks from our custom-styled button */}
      <div ref={hiddenGoogleDivRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', top: -9999 }} />

      {/* Photographic background with subtle parallax; blur stays scoped to the card */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -inset-[7%] bg-cover bg-center"
          style={{ backgroundImage: "url('/login-bg.jpg')" }}
          animate={{ x: mouse.x * 16, y: mouse.y * 11 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        {/* Gentle scrim so the glass card stays legible over bright water */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(12,26,16,0.04) 0%, rgba(9,20,13,0.42) 100%)' }}
        />
      </div>

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="fixed rounded-full bg-sky-100/30 pointer-events-none"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -26, 0], opacity: [0.15, 0.6, 0.15] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Toasts */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[92%] max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              className={`backdrop-blur-xl border rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 ${
                t.variant === 'error'
                  ? 'bg-red-500/15 border-red-400/40'
                  : 'bg-emerald-500/15 border-emerald-400/40'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  t.variant === 'error' ? 'bg-red-500/25 text-red-200' : 'bg-emerald-500/25 text-emerald-200'
                }`}
              >
                {t.variant === 'error' ? <XIcon className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{t.title}</div>
                <div className="text-xs text-white/70 mt-0.5 leading-relaxed">{t.message}</div>
              </div>
              <button onClick={() => dismissToast(t.id)} className="text-white/40 hover:text-white/80 transition-colors">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Centered content that grows past the viewport and scrolls when the card is taller */}
      <div className="relative min-h-full w-full flex items-center justify-center px-4 py-10">
        {/* Login Card */}
        <AnimatePresence>
        {!transitioning && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative z-10 w-full max-w-[420px] rounded-[28px] border border-white/25 bg-white/[0.10] p-8"
            style={{
              backdropFilter: 'blur(34px) saturate(125%)',
              WebkitBackdropFilter: 'blur(34px) saturate(125%)',
              boxShadow:
                '0 28px 70px rgba(6,16,10,0.45), inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Header */}
            <div className="mb-7">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center font-extrabold text-[#05100e] text-sm">
                  N
                </div>
                <div>
                  <div className="font-editorial text-lg font-bold text-white tracking-tight leading-none">InvoNest</div>
                  <div
                    className="text-[10px] uppercase tracking-[0.15em] text-emerald-100 font-mono mt-0.5"
                    style={{ textShadow: '0 1px 3px rgba(6,16,10,0.65)' }}
                  >
                    AI Cash Flow Intelligence
                  </div>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white">Welcome back.</h1>
              <p className="text-sm text-white/60 mt-1">Sign in to your finance workspace.</p>
            </div>

            {/* Google Sign-In */}
            <motion.button
              type="button"
              onClick={triggerGoogleSignIn}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 bg-[#ffffff] hover:bg-[#f4f4f5] transition-colors text-[#1f1f1f] font-semibold text-sm rounded-2xl py-3.5 shadow-lg"
            >
              <GoogleLogo />
              Continue with Google
            </motion.button>
            <p
              className="text-[10px] text-white/70 text-center mt-2"
              style={{ textShadow: '0 1px 3px rgba(6,16,10,0.6)' }}
            >
              Google Workspace accounts only
            </p>

            {/* OR divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Or</span>
              <div className="flex-1 h-px bg-white/15" />
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Company Email"
                  className="w-full bg-white/[0.07] border border-white/25 focus:border-emerald-300/70 focus:bg-white/[0.11] rounded-2xl text-sm px-4 py-3.5 pr-11 text-white placeholder-white/50 focus:outline-none transition-colors"
                />
                <User className="w-4 h-4 text-white/40 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-white/[0.07] border border-white/25 focus:border-emerald-300/70 focus:bg-white/[0.11] rounded-2xl text-sm px-4 py-3.5 pr-11 text-white placeholder-white/50 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Demo Account Card */}
              <div className="bg-white/[0.07] border border-white/20 rounded-2xl p-3.5 space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-bold text-white/40 font-mono">Demo Account</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Email:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/85 font-mono">demo@invonest.ai</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('email', 'demo@invonest.ai')}
                      className="text-white/40 hover:text-emerald-300 transition-colors"
                    >
                      {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Password:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/85 font-mono">Demo@123</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('password', 'Demo@123')}
                      className="text-white/40 hover:text-emerald-300 transition-colors"
                    >
                      {copiedField === 'password' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Login Button with glow + ripple */}
              <motion.button
                type="submit"
                onMouseDown={handleLoginRipple}
                disabled={loading}
                whileHover={{ scale: 1.015, boxShadow: '0 0 52px rgba(74,222,128,0.65), 0 10px 30px rgba(6,16,10,0.45)' }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden w-full rounded-2xl py-3.5 font-bold text-sm text-[#05100e] disabled:opacity-60 mt-1"
                style={{
                  background: 'linear-gradient(135deg, #86efac 0%, #34d399 50%, #16a34a 100%)',
                  boxShadow: '0 0 26px rgba(74,222,128,0.34), 0 8px 24px rgba(6,16,10,0.38)',
                }}
              >
                {ripples.map((r) => (
                  <motion.span
                    key={r.id}
                    initial={{ width: 0, height: 0, opacity: 0.5 }}
                    animate={{ width: 260, height: 260, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      left: r.x,
                      top: r.y,
                      translateX: '-50%',
                      translateY: '-50%',
                      borderRadius: '9999px',
                      background: 'rgba(255,255,255,0.35)',
                      pointerEvents: 'none',
                    }}
                  />
                ))}
                <span className="relative z-10">{loading ? 'Signing in…' : 'Login to InvoNest'}</span>
              </motion.button>
            </form>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
