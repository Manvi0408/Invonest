'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  FileText, 
  Zap, 
  Activity, 
  HelpCircle, 
  User, 
  Send, 
  ArrowRight, 
  Plus, 
  UploadCloud, 
  Share2, 
  Slack, 
  Mail, 
  Briefcase, 
  DollarSign,
  Maximize2,
  Lock,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  MoreHorizontal,
  Pause,
  Play
} from 'lucide-react';
import Link from 'next/link';
import BookDemoModal from './components/BookDemoModal';
import VideoBackground from './components/VideoBackground';
import PreviewCards from './components/PreviewCards';
import QuickHelpChat from './components/QuickHelpChat';
import Testimonials from './components/Testimonials';
import ScrollReveal3D from './components/ScrollReveal3D';
import PlatformAnnotations from './components/PlatformAnnotations';
// Integrations section: a 3D floating icon cloud + a glass catalogue of the
// providers we support.
import IntegrationsCloud3D from './components/IntegrationsCloud3D';
import IntegrationsCatalog from './components/IntegrationsCatalog';

function MoneyDisplay({ value }: { value: string }) {
  const match = value.match(/^(.*?)(\.[0-9]+)$/);
  if (!match) {
    return <span className="text-[15px] font-semibold text-[var(--mc-text)] tabular-nums">{value}</span>;
  }
  return (
    <span className="text-[15px] font-semibold text-[var(--mc-text)] tabular-nums">
      {match[1]}<sup className="text-[10px] font-medium text-[var(--mc-text-muted)] ml-0.5">{match[2].slice(1)}</sup>
    </span>
  );
}

function parseMetric(value: string) {
  const match = value.match(/^([^0-9]*)([0-9,.]+)([^0-9]*)$/);
  if (!match) {
    return { prefix: '', numberStr: '', suffix: '', targetVal: NaN, decimalPlaces: 0 };
  }
  const prefix = match[1] || '';
  const numberStr = match[2] || '';
  const suffix = match[3] || '';
  const decimalIndex = numberStr.indexOf('.');
  const decimalPlaces = decimalIndex === -1 ? 0 : numberStr.length - decimalIndex - 1;
  const targetVal = parseFloat(numberStr.replace(/,/g, ''));
  return { prefix, numberStr, suffix, targetVal, decimalPlaces };
}

interface AnimatedCounterProps {
  value: string;
  duration?: number;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 2500 }) => {
  const { prefix, suffix, targetVal, decimalPlaces } = parseMetric(value);
  const [displayValue, setDisplayValue] = useState(() => {
    if (isNaN(targetVal)) return value;
    const zeroNum = (0).toFixed(decimalPlaces);
    return prefix + zeroNum + suffix;
  });
  
  const elementRef = useRef<HTMLSpanElement>(null);
  const animationStarted = useRef(false);

  useEffect(() => {
    if (isNaN(targetVal)) return;

    // easeInOutExpo curve: smoothly accelerates then decelerates, stopping at the final value.
    const easeInOutExpo = (t: number) => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      if (t < 0.5) {
        return Math.pow(2, 20 * t - 10) / 2;
      }
      return (2 - Math.pow(2, -20 * t + 10)) / 2;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !animationStarted.current) {
          animationStarted.current = true;
          let startTime: number | null = null;

          const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            const easedProgress = easeInOutExpo(progress);
            const currentVal = targetVal * easedProgress;

            const formattedNum = currentVal.toFixed(decimalPlaces);
            const parts = formattedNum.split('.');
            parts[0] = Number(parts[0]).toLocaleString('en-US');
            const newDisplay = prefix + parts.join('.') + suffix;

            setDisplayValue(newDisplay);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = elementRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [value, duration, prefix, suffix, targetVal, decimalPlaces]);

  return <span ref={elementRef}>{displayValue}</span>;
};


const HERO_EASE = [0.16, 1, 0.3, 1] as const;

/** Free-mail providers we don't accept for a demo request. */
const PERSONAL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com',
  'hotmail.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com',
  'proton.me', 'protonmail.com', 'rediffmail.com', 'zoho.com', 'mail.com',
  'gmx.com', 'yandex.com',
];

/** Returns an error message, or null when the address is an acceptable work email. */
function validateWorkEmail(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Please enter your email address.';
  if (!value.includes('@')) {
    return `Please include an “@” in the email address. “${value}” is missing an “@”.`;
  }
  const parts = value.split('@');
  if (parts.length > 2) return 'An email address can only contain one “@”.';
  const [local, domain] = parts;
  if (!local) return 'Please enter the part before the “@”.';
  if (!domain) return 'Please enter your company domain after the “@”.';
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return `“${domain}” isn’t a valid domain — try something like yourcompany.com.`;
  }
  if (PERSONAL_DOMAINS.includes(domain.toLowerCase())) {
    return `That’s a personal address. Please use your company email — @${domain} isn’t a work domain.`;
  }
  return null;
}

const heroGlassPanel: React.CSSProperties = {
  backdropFilter: 'blur(30px) saturate(165%) brightness(0.60)',
  WebkitBackdropFilter: 'blur(30px) saturate(165%) brightness(0.60)',
  background: 'rgba(16,18,22,0.20)',
  border: '1px solid rgba(255,255,255,0.30)',
  boxShadow: '0 14px 40px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.36)',
};

const heroGlassField: React.CSSProperties = {
  backdropFilter: 'blur(22px) saturate(160%) brightness(0.62)',
  WebkitBackdropFilter: 'blur(22px) saturate(160%) brightness(0.62)',
  background: 'rgba(18,20,24,0.18)',
  border: '1px solid rgba(255,255,255,0.28)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.32), 0 4px 16px rgba(0,0,0,0.22)',
  color: '#ffffff',
};

export default function LandingPage() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroReduce = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBookDemoOpen, setIsBookDemoOpen] = useState(false);
  const [bookDemoEmail, setBookDemoEmail] = useState('');
  const [isEnterpriseDemo, setIsEnterpriseDemo] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Autoplay slideshow state for the dashboard centerpiece
  const [activeTab, setActiveTab] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % 7);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // OCR upload simulation state
  const [ocrStep, setOcrStep] = useState(0);
  useEffect(() => {
    if (activeTab === 3) {
      const t1 = setTimeout(() => setOcrStep(1), 1000); // OCR active
      const t2 = setTimeout(() => setOcrStep(2), 2500); // AI Validate
      const t3 = setTimeout(() => setOcrStep(3), 4000); // Complete
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setOcrStep(0);
    }
  }, [activeTab]);

  return (
    <div ref={containerRef} className="relative bg-white text-[#0d2227] selection:bg-[#abc6d8]/50 overflow-x-clip">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#abc6d8]/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[120vh] right-1/4 w-[500px] h-[500px] bg-[#abc6d8]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[280vh] left-1/3 w-[600px] h-[600px] bg-[#abc6d8]/8 rounded-full blur-[160px] pointer-events-none" />

      {/* HEADER NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300 ${isScrolled ? 'bg-white/95 border-b border-[#0d2227]/10 text-[#0d2227] shadow-sm backdrop-blur' : 'bg-transparent border-b border-white/10 text-white'}`}>
        <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0d2227] to-[#abc6d8] flex items-center justify-center font-bold text-white shadow-lg">
            N
          </div>
          <span className="font-extrabold text-xl tracking-tight">InvoNest</span>
        </Link>

        <nav className={`hidden md:flex items-center gap-8 text-sm font-medium z-40 transition-colors duration-300 text-white/85`}>
          <a href="#hero" className="transition-colors hover:text-white font-semibold">Home</a>
          <a href="#features" className="transition-colors hover:text-white font-semibold">Features</a>
          
          {/* Product Dropdown Trigger */}
          <div 
            className="relative py-2 cursor-pointer flex items-center gap-1 transition-colors hover:text-white font-semibold"
            onMouseEnter={() => setOpenDropdown('product')}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <span>Product</span>
            <ChevronDown className="w-3.5 h-3.5" />
            
            <AnimatePresence>
              {openDropdown === 'product' && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[280px] bg-white border border-[#0d2227]/15 rounded-xl shadow-2xl p-2 z-50 text-left flex flex-col gap-1"
                >
                  <Link href="/dashboard/copilot" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center font-bold text-xs text-purple-700">C</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">AI CFO Advisor</span>
                      <span className="text-zinc-500 text-[10px] block">Check hiring & payroll limits</span>
                    </div>
                  </Link>

                  <Link href="/dashboard/simulator" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-700">S</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">Scenario Simulator</span>
                      <span className="text-zinc-500 text-[10px] block">Test operational changes</span>
                    </div>
                  </Link>

                  <Link href="/dashboard/clients" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-pink-100 flex items-center justify-center font-bold text-xs text-pink-700">H</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">Client Health Score</span>
                      <span className="text-zinc-500 text-[10px] block">Track reliability ratings</span>
                    </div>
                  </Link>

                  <Link href="/dashboard/clients" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center font-bold text-xs text-red-700">R</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">Risk Engine</span>
                      <span className="text-zinc-500 text-[10px] block">Payment curves & credits</span>
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Integrations Dropdown Trigger */}
          <div 
            className="relative py-2 cursor-pointer flex items-center gap-1 transition-colors hover:text-white font-semibold"
            onMouseEnter={() => setOpenDropdown('integrations')}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <span>Integrations</span>
            <ChevronDown className="w-3.5 h-3.5" />

            <AnimatePresence>
              {openDropdown === 'integrations' && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[310px] bg-white border border-[#0d2227]/15 rounded-xl shadow-2xl p-2.5 z-50 text-left flex flex-col gap-1"
                >
                  <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center font-extrabold text-[9px] text-[#0d2227]">N</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">Netsuite</span>
                      <span className="text-zinc-500 text-[10px] block">Your ERP data, actionable</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center font-bold text-[9px] text-green-700">S</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">Sage Intacct</span>
                      <span className="text-zinc-500 text-[10px] block">Accelerate your cash collection</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center font-bold text-[9px] text-indigo-700">S</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">Stripe Billing</span>
                      <span className="text-zinc-500 text-[10px] block">When smart-retries won't cut it</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-teal-100 flex items-center justify-center font-bold text-[9px] text-teal-700">Z</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">Zuora</span>
                      <span className="text-zinc-500 text-[10px] block">Drive your cash collection</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center font-bold text-[9px] text-orange-700">C</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">Chargebee</span>
                      <span className="text-zinc-500 text-[10px] block">Deal with offline reminders</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-[#abc6d8]/10 transition-all text-[#0d2227]">
                    <span className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center font-bold text-[9px] text-emerald-700">Q</span>
                    <div>
                      <span className="text-[#0d2227] text-xs font-bold block">QuickBooks</span>
                      <span className="text-zinc-500 text-[10px] block">Maximize collection efficiency</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a href="#pricing" className="transition-colors hover:text-white font-semibold">Pricing</a>
          <Link href="/about" className="transition-colors hover:text-white font-semibold">About</Link>
        </nav>

        <div className="flex items-center gap-4">

          <Link href="/login" className={`text-sm font-medium transition-colors duration-300 ${isScrolled ? 'text-zinc-400 hover:text-white' : 'text-white/85 hover:text-white'}`}>
            Sign In
          </Link>
          <Link href="/dashboard" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md duration-300 ${isScrolled ? 'bg-white text-black hover:bg-zinc-200 shadow-white/5' : 'bg-white/15 text-white hover:bg-white/25 border border-white/30 backdrop-blur-md shadow-black/20'}`}>
            Start Free Trial
          </Link>
        </div>
      </header>

      {/* HERO SECTION — video backdrop, one viewport tall */}
      <section id="hero" ref={heroRef} className="relative h-screen flex flex-col overflow-hidden">
        {/* The InvoNest product commercial, playing as the backdrop. The dark
            radial sits underneath so the first paint (before the clip decodes)
            matches the video's own letterbox rather than flashing white. */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(100% 80% at 50% 30%, #0a1119 0%, #04070b 60%, #010204 100%)' }} />
        <VideoBackground
          src="/hero/invonest-hero-v2.mp4"
          targetRef={heroRef}
          objectPosition="center"
        />

        <div className="relative z-10 flex-1 min-h-0 flex items-center px-6 md:px-14 pt-20">
          <div className="w-full grid lg:grid-cols-[minmax(0,1fr)_auto] gap-10 xl:gap-16 items-center">
            <div className="max-w-3xl">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
                className="inline-block text-[11px] uppercase font-extrabold tracking-[0.2em] text-white/80 font-mono"
              >
                Financial Relationship Management
              </motion.span>

              <motion.div
                initial={heroReduce ? { opacity: 0 } : { filter: 'blur(12px)', opacity: 0 }}
                animate={heroReduce ? { opacity: 1 } : { filter: 'blur(0px)', opacity: 1 }}
                transition={{ delay: heroReduce ? 0 : 0.9, duration: heroReduce ? 0.2 : 0.7, ease: HERO_EASE }}
                className="mt-4"
              >
                <h1
                  className="font-editorial uppercase text-white tracking-tight leading-[0.94]"
                  style={{ fontSize: 'clamp(2.25rem, 8.6vh, 5.5rem)' }}
                >
                  {/* Three lines, each wiping in 0.3s after the one above.
                      The stagger is tighter than the previous two-line version
                      so the whole headline still lands in about the same time
                      rather than dragging out by half a second. */}
                  <motion.span
                    className="block overflow-hidden"
                    initial={heroReduce ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }}
                    animate={heroReduce ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)' }}
                    transition={{ duration: 0.7, ease: HERO_EASE }}
                  >
                    Cash Flow,
                  </motion.span>
                  <motion.span
                    className="block overflow-hidden"
                    initial={heroReduce ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }}
                    animate={heroReduce ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)' }}
                    transition={{ delay: 0.3, duration: 0.7, ease: HERO_EASE }}
                  >
                    without the awkward
                  </motion.span>
                  <motion.span
                    className="block overflow-hidden"
                    initial={heroReduce ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }}
                    animate={heroReduce ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)' }}
                    transition={{ delay: 0.6, duration: 0.7, ease: HERO_EASE }}
                  >
                    follow-up
                  </motion.span>
                </h1>
              </motion.div>

              <motion.p
                initial={heroReduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
                animate={heroReduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
                transition={heroReduce ? { duration: 0.2 } : { delay: 1.5, type: 'spring', stiffness: 90, damping: 18 }}
                style={{
                  textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  fontSize: 'clamp(0.9rem, 2.1vh, 1.2rem)',
                  marginTop: 'clamp(0.75rem, 2.4vh, 1.5rem)',
                }}
                className="text-white/85 leading-relaxed max-w-2xl"
              >
                Track every invoice, automate every reminder, and let the AI copilot handle
                collections while you focus on the business.
              </motion.p>

              {/* Email + Request a demo — feeds the existing BookDemoModal */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: heroReduce ? 0 : 1.8, duration: 0.5 }}
                style={{ marginTop: 'clamp(1rem, 3vh, 2rem)' }}
              >
                {demoSubmitted ? (
                  <div style={heroGlassPanel} className="rounded-2xl p-5 max-w-xl text-base font-bold text-white flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 shrink-0" /> Demo requested for {demoEmail}! We&apos;ll contact you shortly.
                  </div>
                ) : (
                  <form
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      const err = validateWorkEmail(demoEmail);
                      setEmailError(err);
                      if (err) return;
                      setBookDemoEmail(demoEmail);
                      setIsEnterpriseDemo(false);
                      setIsBookDemoOpen(true);
                    }}
                  >
                    <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                      <input
                        type="text"
                        inputMode="email"
                        value={demoEmail}
                        onChange={(e) => {
                          setDemoEmail(e.target.value);
                          if (emailError) setEmailError(null);
                        }}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? 'demo-email-error' : undefined}
                        placeholder="name@company.com"
                        style={{
                          ...heroGlassField,
                          fontSize: 'clamp(0.85rem, 1.9vh, 1rem)',
                          ...(emailError ? { border: '1px solid rgba(248,113,113,0.75)' } : {}),
                        }}
                        className="rounded-2xl px-5 py-3.5 flex-1 focus:outline-none placeholder-white/65"
                      />
                      <button
                        type="submit"
                        style={{ ...heroGlassPanel, fontSize: 'clamp(0.85rem, 1.9vh, 1rem)' }}
                        className="px-7 py-3.5 rounded-2xl font-bold text-white transition-all shrink-0 hover:brightness-125"
                      >
                        Request a demo
                      </button>
                    </div>

                    <AnimatePresence>
                      {emailError && (
                        <motion.p
                          id="demo-email-error"
                          role="alert"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.25, ease: HERO_EASE }}
                          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
                          className="mt-2 text-[12px] font-semibold text-red-300 max-w-xl"
                        >
                          {emailError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </form>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: heroReduce ? 0 : 2.0, duration: 0.5 }}
                className="mt-5"
              >
                <a
                  href="#cashflow-overview"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
                  className="group inline-flex items-center gap-2.5 text-sm font-bold text-white/90 hover:text-white transition-colors"
                >
                  <span className="relative">
                    or explore InvoNest via our Virtual Product Tour
                    {/* Underline wipes in from the left on hover rather than
                        snapping, matching the clip-path reveals in the headline. */}
                    <span className="absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 bg-white/70 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  </span>

                  {/* Pre-empts the two questions that stop people clicking a tour
                      link: how long is this, and do I have to sign up first. */}
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm">
                    2 min
                    <span className="h-2.5 w-px bg-white/30" />
                    no signup
                  </span>

                  <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-1" />
                </a>

                {/* Direct entry into the live demo dashboard — no signup. Opens
                    the after-login workspace as a "Demo" account; only the
                    account page itself asks the visitor to log in. */}
                <div className="mt-3">
                  <Link
                    href="/dashboard"
                    className="group/explore inline-flex items-center gap-2 text-sm font-bold text-white transition-colors"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
                  >
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 backdrop-blur-sm hover:bg-white/20 transition-colors">
                      Explore InvoNest
                      <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover/explore:translate-x-1" />
                    </span>
                  </Link>
                </div>
              </motion.div>
            </div>

            {/* Quick Help + the two preview cards */}
            <div className="hidden xl:flex items-center gap-4">
              <QuickHelpChat />
              <PreviewCards className="flex" />
            </div>
          </div>
        </div>
      </section>

      {/* BRAND & METADATA GRID */}
      <section className="bg-white py-12 px-6 md:px-12 border-b border-kaiterra-dark/10 w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-left text-kaiterra-dark">
          <div className="border-l border-kaiterra-dark/20 pl-4 py-1">
            <span className="text-[10px] uppercase font-bold text-kaiterra-dark/50 block tracking-wider font-mono">Brand</span>
            <span className="text-xs font-extrabold font-editorial uppercase mt-1 block">InvoNest Core</span>
          </div>
          <div className="border-l border-kaiterra-dark/20 pl-4 py-1">
            <span className="text-[10px] uppercase font-bold text-kaiterra-dark/50 block tracking-wider font-mono">Client</span>
            <span className="text-xs font-extrabold font-editorial uppercase mt-1 block">Fintech Ventures</span>
          </div>
          <div className="border-l border-kaiterra-dark/20 pl-4 py-1">
            <span className="text-[10px] uppercase font-bold text-kaiterra-dark/50 block tracking-wider font-mono">Stack</span>
            <span className="text-xs font-extrabold font-editorial uppercase mt-1 block">Next.js + NestJS</span>
          </div>
          <div className="border-l border-kaiterra-dark/20 pl-4 py-1">
            <span className="text-[10px] uppercase font-bold text-kaiterra-dark/50 block tracking-wider font-mono">Scale</span>
            <span className="text-xs font-extrabold font-editorial uppercase mt-1 block">100K+ Businesses</span>
          </div>
        </div>
      </section>      {/* STORYTELLING INTERACTIVE SLIDESHOW CONTAINER (MATCHING ADCHITECTS CASE STUDY VIDEO SLIDER STYLE) */}
      <section className="py-24 px-6 md:px-12 max-w-5xl mx-auto border-t border-[#0d2227]/10 w-full text-center relative z-20">

        {/* Rainy-bookshop backdrop sitting behind the product tour. The section
            is max-w-5xl, so this breaks out to the full viewport width to avoid
            a letterboxed strip. `object-cover` fills without distorting. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen -z-10 overflow-hidden pointer-events-none"
        >
          <img
            src="/bg/dunes-night.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          {/* Much lighter scrim than the previous photo needed: these dunes are
              already near-black, so the old 55% wash would have crushed the one
              thing that makes the image read — the lit ridge line. */}
          <div className="absolute inset-0 bg-[#05060a]/25" />
        </div>

        {/* Slideshow Title Header */}
        <ScrollReveal3D>
        <div className="mb-10 text-center">
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-[0.25em] text-[#0d2227]/60 font-mono mb-2">
            Interactive Product Tour
          </span>
          <h2 className="text-3xl md:text-5xl font-normal text-[#0d2227] uppercase font-editorial tracking-tight leading-tight">
            See the Platform in Action
          </h2>
          <p className="text-zinc-600 text-sm md:text-base mt-4 max-w-xl mx-auto">
            Cycle through key functional panels automatically or pick a workspace feature from the timeline selector below.
          </p>
        </div>
        </ScrollReveal3D>

        {/* Feature Navigation Dots / Tabs Timeline */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-4xl mx-auto">
          {[
            "Overview",
            "AR Ledger",
            "AI Copilot Chat",
            "Invoice OCR",
            "Risk Engine",
            "Cash Forecast",
            "Automation"
          ].map((title, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveTab(idx);
                setIsPlaying(false); // pause on interaction
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${activeTab === idx ? 'bg-[#0d2227] text-white shadow-sm' : 'bg-[#abc6d8]/15 hover:bg-[#abc6d8]/30 text-[#0d2227]'}`}
            >
              {title}
            </button>
          ))}
        </div>

        {/* Relative, non-clipping shell so the floating annotations can sit at
            the frame edges (the frame itself is overflow-hidden). */}
        <div className="relative w-full max-w-5xl mx-auto">
        {/* Apple-style Liquid Glass feature cards, synced to the tour's activeTab. */}
        <PlatformAnnotations activeTab={activeTab} />

        {/* Outer Dashboard frame container */}
        <div className="mercury-card w-full min-h-[65vh] bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col text-left">
          {/* Card header row */}
          <div className="px-5 py-4 border-b border-[var(--mc-border)] flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[var(--mc-row-hover)] border border-[var(--mc-border)] flex items-center justify-center text-[var(--mc-text)]">
                <Activity className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-[var(--mc-text)]">Global Ledger</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--mc-text-muted)] hover:text-[var(--mc-text)] hover:bg-[var(--mc-row-hover)] transition-colors">
                <Plus className="w-4 h-4" />
              </button>
              <button className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--mc-text-muted)] hover:text-[var(--mc-text)] hover:bg-[var(--mc-row-hover)] transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sidebar + Main Screen Container */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-16 md:w-48 border-r border-[var(--mc-border)] p-3 flex flex-col gap-1 hidden sm:flex">
              <div 
                onClick={() => { setActiveTab(0); setIsPlaying(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeTab === 0 ? 'bg-[var(--mc-row-hover)] text-[var(--mc-text)]' : 'text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]'}`}
              >
                <Activity className="w-4 h-4" /> Overview
              </div>
              <div 
                onClick={() => { setActiveTab(1); setIsPlaying(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeTab === 1 ? 'bg-[var(--mc-row-hover)] text-[var(--mc-text)]' : 'text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]'}`}
              >
                <Briefcase className="w-4 h-4" /> Client Health
              </div>
              <div 
                onClick={() => { setActiveTab(2); setIsPlaying(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeTab === 2 ? 'bg-[var(--mc-row-hover)] text-[var(--mc-text)]' : 'text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]'}`}
              >
                <MessageSquare className="w-4 h-4" /> AI CFO Chat
              </div>
              <div 
                onClick={() => { setActiveTab(3); setIsPlaying(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeTab === 3 ? 'bg-[var(--mc-row-hover)] text-[var(--mc-text)]' : 'text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]'}`}
              >
                <UploadCloud className="w-4 h-4" /> Invoice OCR
              </div>
              <div 
                onClick={() => { setActiveTab(4); setIsPlaying(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeTab === 4 ? 'bg-[var(--mc-row-hover)] text-[var(--mc-text)]' : 'text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]'}`}
              >
                <ShieldAlert className="w-4 h-4" /> Risk Engine
              </div>
              <div 
                onClick={() => { setActiveTab(5); setIsPlaying(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeTab === 5 ? 'bg-[var(--mc-row-hover)] text-[var(--mc-text)]' : 'text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]'}`}
              >
                <TrendingUp className="w-4 h-4" /> Cash Forecast
              </div>
              <div 
                onClick={() => { setActiveTab(6); setIsPlaying(false); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeTab === 6 ? 'bg-[var(--mc-row-hover)] text-[var(--mc-text)]' : 'text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]'}`}
              >
                <Zap className="w-4 h-4" /> Automation
              </div>
            </div>

            {/* Main Workspace Frame */}
            <div className="flex-1 p-6 overflow-y-auto relative bg-[#f8fafc] min-w-0 min-h-[50vh]">
              <AnimatePresence mode="wait">
                
                {/* TAB 0: HERO OVERVIEW SCREEN */}
                {activeTab === 0 && (
                  <motion.div 
                    key="tab0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-none"
                  >
                    {/* Metric cards floating */}
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-4 text-[var(--mc-text)]">
                      <span className="text-[10px] text-[var(--mc-text-muted)] font-bold uppercase tracking-wider block mb-1 font-mono">Outstanding Revenue</span>
                      <div className="text-2xl font-extrabold text-[var(--mc-text)]">₹5.2L</div>
                      <span className="text-[10px] text-[var(--mc-text-muted)] mt-2 block">Pending settlement</span>
                    </motion.div>

                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }} className="bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-4 text-[var(--mc-text)]">
                      <span className="text-[10px] text-[var(--mc-text-muted)] font-bold uppercase tracking-wider block mb-1 font-mono">Recovery Rate</span>
                      <div className="text-2xl font-extrabold" style={{ color: 'var(--status-paid)' }}>87%</div>
                      <span className="text-[10px] text-[var(--mc-text-muted)] mt-2 block">+4% this month</span>
                    </motion.div>

                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }} className="bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-4 text-[var(--mc-text)]">
                      <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 font-mono" style={{ color: 'var(--status-overdue)' }}>At Risk Revenue</span>
                      <div className="text-2xl font-extrabold" style={{ color: 'var(--status-overdue)' }}>₹1.1L</div>
                      <span className="text-[10px] text-[var(--mc-text-muted)] mt-2 block">Critical overdue status</span>
                    </motion.div>

                    <motion.div animate={{ y: [0, -4.5, 0] }} transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }} className="bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-4 text-[var(--mc-text)]">
                      <span className="text-[10px] text-[var(--mc-text-muted)] font-bold uppercase tracking-wider block mb-1 font-mono">Expected Collections</span>
                      <div className="text-2xl font-extrabold text-[var(--mc-text)]">₹12.4L</div>
                      <span className="text-[10px] text-[var(--mc-text-muted)] mt-2 block">Next 30 days</span>
                    </motion.div>

                    {/* Forecast Trend Graph Mockup */}
                    <div className="col-span-1 md:col-span-4 bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-5 mt-4 text-[var(--mc-text)]">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-[var(--mc-text)]">Baseline Cash Flow Trend</span>
                        <span className="px-2 py-0.5 rounded bg-[var(--mc-row-hover)] border border-[var(--mc-border)] text-[10px] text-[var(--mc-text-muted)] font-mono">Confidence Level: 88%</span>
                      </div>
                      <div className="w-full h-32 flex items-end gap-1 px-2 border-b border-[var(--mc-border)] relative">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 text-[9px] font-mono text-[var(--mc-text-muted)] pt-2 pb-1">
                          <div>₹15L</div>
                          <div>₹10L</div>
                          <div>₹5L</div>
                        </div>

                        {/* Graph wave bars */}
                        <div className="h-[40%] bg-[var(--mc-row-hover)] hover:opacity-80 transition-all rounded-t-sm flex-1" />
                        <div className="h-[48%] bg-[var(--mc-row-hover)] hover:opacity-80 transition-all rounded-t-sm flex-1" />
                        <div className="h-[52%] bg-[var(--mc-row-hover)] hover:opacity-80 transition-all rounded-t-sm flex-1" />
                        <div className="h-[65%] bg-[var(--status-sent)]/20 border-t border-[var(--status-sent)] rounded-t-sm flex-1 relative group">
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[var(--mc-text)] text-[var(--mc-bg)] rounded px-1.5 py-0.5 text-[9px] shadow">₹12.4L</div>
                        </div>
                        <div className="h-[70%] bg-[var(--status-sent)]/20 border-t border-[var(--status-sent)] rounded-t-sm flex-1" />
                        <div className="h-[74%] bg-[var(--status-sent)]/20 border-t border-[var(--status-sent)] rounded-t-sm flex-1" />
                        <div className="h-[80%] bg-[var(--status-sent)]/20 border-t border-[var(--status-sent)] rounded-t-sm flex-1" />
                        <div className="h-[86%] bg-[var(--status-sent)]/30 border-t-2 border-[var(--status-sent)] rounded-t-sm flex-1" />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-[var(--mc-text-muted)] mt-2 px-1">
                        <span>Today</span>
                        <span>+10 Days</span>
                        <span>+20 Days</span>
                        <span>+30 Days</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 1: AI COLLECTIONS (ACCOUNTS RECEIVABLE WORKSPACE) */}
                {activeTab === 1 && (
                  <motion.div
                    key="tab1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-sm text-[var(--mc-text)]">Accounts Receivable</h3>
                      <span className="text-[10px] text-[var(--mc-text-muted)]">3 Delinquent Profiles</span>
                    </div>

                    <div className="rounded-xl border border-[var(--mc-border)] overflow-hidden">
                      {[
                        { name: 'ABC Corp', amount: '₹45,000', late: '15 Days', risk: '83% Critical', action: 'Send WhatsApp Reminder', riskVar: 'var(--status-overdue)' },
                        { name: 'XYZ Ltd', amount: '₹80,000', late: '26 Days', risk: '66% Monitor', action: 'Email Payment Link', riskVar: 'var(--status-sent)' },
                        { name: 'Acquirer Corp', amount: '₹4,00,000', late: '12 Days', risk: '84% Critical', action: 'Initiate Phone Escalation', riskVar: 'var(--status-overdue)' },
                      ].map((row, i) => (
                        <div key={row.name} className={`flex items-center justify-between px-4 py-3 hover:bg-[var(--mc-row-hover)] transition-colors ${i !== 0 ? 'border-t border-[var(--mc-border)]' : ''}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-full bg-[var(--mc-row-hover)] flex items-center justify-center text-[var(--mc-text)] text-[10px] font-bold shrink-0">
                              {row.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[var(--mc-text)] font-medium truncate">{row.name}</div>
                              <div className="text-[10px] font-mono truncate" style={{ color: row.riskVar }}>{row.risk} · {row.late} late · {row.action}</div>
                            </div>
                          </div>
                          <MoneyDisplay value={row.amount} />
                        </div>
                      ))}
                      <button className="w-full flex items-center justify-between px-4 py-3 border-t border-[var(--mc-border)] text-[var(--mc-text-muted)] hover:text-[var(--mc-text)] transition-colors">
                        View all invoices <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* AI Recommendation Notification Pill */}
                    <div className="mt-4 px-4 py-3 rounded-xl bg-[var(--mc-row-hover)] border border-[var(--mc-border)] flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--status-sent) 15%, transparent)' }}>
                        <Zap className="w-3.5 h-3.5" style={{ color: 'var(--status-sent)' }} />
                      </span>
                      <span className="text-xs text-[var(--mc-text)] flex-1">Send automated WhatsApp payment link to ABC Corp — 84% prompt recovery rate via text.</span>
                      <button className="text-xs font-semibold text-[var(--mc-text)] hover:underline flex items-center gap-1 shrink-0">
                        View <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                  )}

                  {/* TAB 2: AI COPILOT CHAT */}
                  {activeTab === 2 && (
                    <motion.div 
                      key="tab2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col h-full max-h-[48vh] justify-between animate-none"
                    >
                      {/* Chat log mock */}
                      <div className="space-y-4 overflow-y-auto pr-1">
                        <div className="flex gap-2.5 max-w-[85%]">
                          <div className="w-7 h-7 rounded-full bg-[var(--mc-row-hover)] flex items-center justify-center text-[10px] text-[var(--mc-text-muted)]">AP</div>
                          <div className="bg-[var(--mc-row-hover)] border border-[var(--mc-border)] p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed text-[var(--mc-text)]">
                            Which customers are most likely to pay late?
                          </div>
                        </div>

                        <div className="flex gap-2.5 max-w-[85%] ml-auto flex-row-reverse">
                          <div className="w-7 h-7 rounded-full bg-[var(--mc-text)] text-[var(--mc-bg)] font-bold flex items-center justify-center text-[10px]">CFO</div>
                          <div className="border border-[var(--mc-border)] p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed text-[var(--mc-text)]" style={{ backgroundColor: 'color-mix(in srgb, var(--status-sent) 12%, transparent)' }}>
                            Based on historical payments ledger, these accounts present high risk:
                            <div className="mt-2 space-y-1 font-mono text-[10px] text-[var(--mc-text)]">
                              <div>1. **Acquirer Corp** (₹4.0L overdue, 84% late risk)</div>
                              <div>2. **ABC Corp** (₹45K overdue, 83% late risk)</div>
                            </div>
                            <div className="mt-2 text-[var(--mc-text-muted)] text-[10px]">
                              **Potential Revenue At Risk:** ₹4.45L.<br />
                              **Suggested Actions:** Send reminder link, schedule WhatsApp follow-up.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chat Input */}
                      <div className="border border-[var(--mc-border)] bg-[var(--mc-row-hover)] rounded-xl p-2 mt-4 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ask AI CFO: 'Will I have enough cash for payroll?'..."
                          className="bg-transparent border-0 focus:outline-none focus:ring-0 text-xs px-2 py-1.5 flex-1 text-[var(--mc-text-muted)]"
                          disabled
                        />
                        <button className="w-8 h-8 rounded-lg bg-[var(--mc-text)] text-[var(--mc-bg)] flex items-center justify-center hover:opacity-90">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: OCR INVOICE EXTRACTION */}
                  {activeTab === 3 && (
                    <motion.div
                      key="tab3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center justify-center h-full min-h-[38vh] animate-none"
                    >
                      {ocrStep === 0 && (
                        <div className="border border-dashed border-[var(--mc-border)] rounded-2xl p-8 text-center max-w-sm flex flex-col items-center">
                          <UploadCloud className="w-10 h-10 text-[var(--mc-text-muted)] mb-3" />
                          <p className="text-xs font-bold text-[var(--mc-text)] mb-1">Drag and drop invoice PDF</p>
                          <p className="text-[10px] text-[var(--mc-text-muted)]">Files up to 10MB (PDF, PNG, JPG)</p>
                        </div>
                      )}

                      {ocrStep === 1 && (
                        <div className="w-full max-w-md bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-4 text-[var(--mc-text)]">
                          <div className="flex justify-between items-center text-xs mb-3">
                            <span className="font-mono text-[var(--mc-text-muted)]">Processing: standard_invoice.pdf</span>
                            <span className="text-[var(--mc-text)] font-bold">Scanning OCR layers...</span>
                          </div>
                          <div className="w-full bg-[var(--mc-row-hover)] h-1.5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: "65%" }} transition={{ duration: 1.5 }} className="bg-[var(--mc-text)] h-full" />
                          </div>
                        </div>
                      )}

                      {ocrStep >= 2 && (
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-4 text-[var(--mc-text)]">
                          <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--mc-border)] mb-3">
                            <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--status-paid)' }}>
                              <CheckCircle className="w-3.5 h-3.5" /> OCR Complete
                            </div>
                            <span className="text-[10px] text-[var(--mc-text)] bg-[var(--mc-row-hover)] px-2 py-0.5 rounded font-bold font-mono">97% AI Confidence Score</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3.5 text-[11px] font-mono">
                            <div>
                              <span className="text-[var(--mc-text-muted)] block text-[9px] uppercase font-bold">Client Name</span>
                              <span className="text-[var(--mc-text)] font-semibold">ABC Corp</span>
                            </div>
                            <div>
                              <span className="text-[var(--mc-text-muted)] block text-[9px] uppercase font-bold">Invoice Number</span>
                              <span className="text-[var(--mc-text)] font-semibold">INV-2041</span>
                            </div>
                            <div>
                              <span className="text-[var(--mc-text-muted)] block text-[9px] uppercase font-bold">Amount Extracted</span>
                              <MoneyDisplay value="₹45,000.00" />
                            </div>
                            <div>
                              <span className="text-[var(--mc-text-muted)] block text-[9px] uppercase font-bold">Due Date</span>
                              <span className="text-[var(--mc-text)] font-semibold">30 Days (Net 30)</span>
                            </div>
                          </div>

                          <div className="mt-3.5 pt-2 border-t border-[var(--mc-border)] flex justify-end">
                            <span className="text-[9px] text-[var(--mc-text-muted)] italic">Auto-validated & created ledger invoice</span>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB 4: PAYMENT RISK ENGINE */}
                  {activeTab === 4 && (
                    <motion.div
                      key="tab4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-none"
                    >
                      <div className="bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-4 flex flex-col justify-between text-[var(--mc-text)]">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-[var(--mc-text-muted)] font-bold uppercase">Low Risk</span>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--status-paid)' }} />
                          </div>
                          <div className="text-[var(--mc-text)] font-extrabold text-sm mb-1">XYZ Technologies</div>
                          <p className="text-[10px] text-[var(--mc-text-muted)] leading-relaxed">Historically settles invoices within 3 days. Strong liquidity credentials.</p>
                        </div>
                        <div className="mt-4 pt-2 border-t border-[var(--mc-border)] text-[9px] font-mono text-[var(--mc-text-muted)]">Risk Score: 18</div>
                      </div>

                      <div className="bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-4 flex flex-col justify-between text-[var(--mc-text)]">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-[var(--mc-text-muted)] font-bold uppercase">Medium Risk</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                          </div>
                          <div className="text-[var(--mc-text)] font-extrabold text-sm mb-1">Stripe billing Inc</div>
                          <p className="text-[10px] text-[var(--mc-text-muted)] leading-relaxed">Minor late payment history on Q1 services (+6 days). Credit limit at ₹5L.</p>
                        </div>
                        <div className="mt-4 pt-2 border-t border-[var(--mc-border)] text-[9px] font-mono text-[var(--mc-text-muted)]">Risk Score: 42</div>
                      </div>

                      <div className="bg-[var(--mc-bg)] border rounded-xl p-4 flex flex-col justify-between text-[var(--mc-text)]" style={{ borderColor: 'var(--status-overdue)' }}>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--status-overdue)' }}>High Risk</span>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--status-overdue)' }} />
                          </div>
                          <div className="text-[var(--mc-text)] font-extrabold text-sm mb-1">ABC Corp</div>
                          <p className="text-[10px] text-[var(--mc-text-muted)] leading-relaxed">Historically pays 23 days late. Has 2 overdue invoices. Balance exceeds creditworthiness limit.</p>
                        </div>
                        <div className="mt-4 pt-2 border-t border-[var(--mc-border)] text-[9px] font-mono font-bold" style={{ color: 'var(--status-overdue)' }}>Risk Score: 84</div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 5: CASH FLOW FORECASTING */}
                  {activeTab === 5 && (
                    <motion.div
                      key="tab5"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col h-full animate-none"
                    >
                      <div className="flex justify-between items-center mb-3 text-[var(--mc-text)]">
                        <div>
                          <h4 className="text-sm font-bold">30-60-90 Day Liquidity Projections</h4>
                          <span className="text-[9px] text-[var(--mc-text-muted)]">Model includes seasonal billing cycles</span>
                        </div>
                        <div className="flex gap-1">
                          <span className="px-2 py-0.5 rounded bg-[var(--mc-row-hover)] border border-[var(--mc-border)] text-[9px] font-semibold font-mono" style={{ color: 'var(--status-paid)' }}>Best Case</span>
                          <span className="px-2 py-0.5 rounded bg-[var(--mc-row-hover)] border border-[var(--mc-border)] text-[9px] font-semibold text-[var(--mc-text)] font-mono">Expected</span>
                          <span className="px-2 py-0.5 rounded bg-[var(--mc-row-hover)] border border-[var(--mc-border)] text-[9px] font-semibold font-mono" style={{ color: 'var(--status-overdue)' }}>Worst Case</span>
                        </div>
                      </div>

                      {/* Forecasting Chart Area */}
                      <div className="bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl p-4 flex-1 flex flex-col justify-end relative h-36">
                        {/* Background mesh grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 p-4">
                          <hr className="border-[var(--mc-border)]" />
                          <hr className="border-[var(--mc-border)]" />
                          <hr className="border-[var(--mc-border)]" />
                        </div>

                        {/* Interactive confidence band paths inside SVG */}
                        <svg className="w-full h-24 overflow-visible" viewBox="0 0 400 100">
                          {/* Confidence Band shading */}
                          <polygon
                            points="0,60 100,50 200,38 300,30 400,20 400,90 300,85 200,80 100,75 0,70"
                            fill="rgba(59, 130, 246, 0.15)"
                          />

                          {/* Upper curve (Best) */}
                          <path d="M 0,60 Q 100,45 200,30 T 400,10" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 3" />

                          {/* Middle curve (Expected) */}
                          <path d="M 0,65 Q 100,55 200,45 T 400,30" fill="none" stroke="#f4f4f5" strokeWidth="2" />

                          {/* Lower curve (Worst) */}
                          <path d="M 0,70 Q 100,68 200,65 T 400,60" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                        </svg>

                        <div className="flex justify-between text-[9px] font-mono text-[var(--mc-text-muted)] mt-2 px-1">
                          <span>Today</span>
                          <span>30 Days</span>
                          <span>60 Days</span>
                          <span>90 Days</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 6: AUTOMATION WORKFLOW BUILDER */}
                  {activeTab === 6 && (
                    <motion.div
                      key="tab6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center justify-center h-full min-h-[38vh] animate-none"
                    >
                      {/* Workflow Nodes */}
                      <div className="flex flex-col items-center gap-3.5 w-full max-w-sm">
                        <div className="rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2" style={{ backgroundColor: 'color-mix(in srgb, var(--status-paid) 12%, transparent)', borderWidth: 1, borderColor: 'var(--status-paid)', color: 'var(--status-paid)' }}>
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--status-paid)' }} /> Invoice Created
                        </div>
                        <div className="w-0.5 h-4" style={{ backgroundColor: 'var(--mc-border)' }} />

                        <div className="bg-[var(--mc-bg)] border border-[var(--mc-border)] rounded-xl px-4 py-2 text-xs font-semibold text-[var(--mc-text)] flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[var(--mc-text-muted)]" /> Send Soft Email Reminder
                        </div>
                        <div className="w-0.5 h-4" style={{ backgroundColor: 'var(--mc-border)' }} />

                        <div className="rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 relative" style={{ backgroundColor: 'color-mix(in srgb, var(--status-sent) 15%, transparent)', borderWidth: 1, borderColor: 'var(--status-sent)', color: 'var(--mc-text)' }}>
                          <MessageSquare className="w-3.5 h-3.5 animate-pulse" style={{ color: 'var(--status-sent)' }} /> Trigger WhatsApp Link (Overdue +3d)
                        </div>
                        <div className="w-0.5 h-4" style={{ backgroundColor: 'var(--mc-border)' }} />

                        <div className="rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2" style={{ backgroundColor: 'color-mix(in srgb, var(--status-paid) 12%, transparent)', borderWidth: 1, borderColor: 'var(--status-paid)', color: 'var(--status-paid)' }}>
                          <CheckCircle className="w-3.5 h-3.5" /> Payment Received (Auto reconcile)
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div> {/* main workspace frame */}
            </div> {/* sidebar + main screen container */}

            {/* Pause/Play control, overlapping the card's bottom-left edge */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause Tour" : "Play Tour"}
              className="absolute -bottom-3 -left-3 z-30 w-9 h-9 rounded-full bg-[var(--mc-bg)] border border-[var(--mc-border)] shadow-lg flex items-center justify-center text-[var(--mc-text)] hover:bg-[var(--mc-row-hover)] transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div> {/* outer dashboard frame container */}
        </div> {/* relative annotation shell */}

          {/* Dots Indicator for slideshow progress */}
          <div className="flex justify-center items-center gap-2 mt-6">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveTab(i);
                  setIsPlaying(false);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeTab ? 'bg-[#0d2227] w-5' : 'bg-zinc-200 hover:bg-[#0d2227]/30'}`}
              />
            ))}
          </div>
        </section>

      {/* SECTION: CASH FLOW OVERVIEW */}
      <section id="cashflow-overview" className="py-20 px-6 md:px-12 max-w-5xl mx-auto border-t border-zinc-200 relative">
        {/* Night-mountain backdrop. Breaks out of the max-w-5xl container to full
            viewport width so it sits behind the whole band, not just the cards. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen -z-10 overflow-hidden pointer-events-none"
        >
          <img src="/bg/dune-cashflow.jpg" alt="" className="w-full h-full object-cover object-center" />
          {/* This dune photo is near-black across most of the frame, so a light
              scrim is enough — but the left dune ridge catches highlight, so hold
              ~48% to keep the white metric cards' edges from dissolving into it. */}
          <div className="absolute inset-0 bg-[#08090c]/48" />
        </div>

        <ScrollReveal3D className="relative z-10">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-extrabold tracking-widest text-white/60 font-mono">Liquidity Pulse</span>
          <h2 className="text-3xl md:text-5xl font-normal mt-2 text-white uppercase font-editorial">Cash Flow Overview</h2>
          <p className="text-zinc-200 text-sm md:text-base mt-4 max-w-xl mx-auto">
            Keep track of incoming collections, forecast runways, and accounts receivable efficiency metrics.
          </p>
        </div>
        </ScrollReveal3D>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-[#0d2227] relative z-10">
          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 hover:border-[#abc6d8] transition-all duration-300 shadow-sm">
            <span className="text-zinc-500 font-semibold text-xs block mb-1">Forecast Runway</span>
            <div className="text-3xl font-extrabold text-[#0d2227] mt-1 font-editorial">9.4 Months</div>
            <span className="text-[10px] text-zinc-500 font-mono mt-3 block">Based on ₹12.4L baseline position</span>
          </div>

          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 hover:border-[#abc6d8] transition-all duration-300 shadow-sm">
            <span className="text-zinc-500 font-semibold text-xs block mb-1">Bad Debt Write-off Risk</span>
            <div className="text-3xl font-extrabold text-red-600 mt-1 font-editorial">1.8%</div>
            <span className="text-[10px] text-zinc-500 font-mono mt-3 block">Well below industry threshold of 5%</span>
          </div>

          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 hover:border-[#abc6d8] transition-all duration-300 shadow-sm">
            <span className="text-zinc-500 font-semibold text-xs block mb-1">Average Collection Speed</span>
            <div className="text-3xl font-extrabold text-green-700 mt-1 font-editorial">14.2 Days</div>
            <span className="text-[10px] text-zinc-500 font-mono mt-3 block">Improved from 22 days last quarter</span>
          </div>
        </div>
      </section>

      {/* SECTION: AUTOMATED FOLLOW-UP (MATCHING SCREENSHOT) */}
      <section id="automated-follow-up" className="py-24 px-6 md:px-12 max-w-5xl mx-auto border-t border-zinc-200 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT COLUMN: RENDERED AUTOMATION TIMELINE (Invoice #1042 mockup) */}
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative"
          >
            <img
              src="/automation-timeline.jpeg"
              alt="Invoice #1042 automation timeline — reminder scheduled, email sent, and a WhatsApp message with an embedded payment link."
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
          </motion.div>

          {/* RIGHT COLUMN: TEXT INSIGHTS */}
          <div className="space-y-6 text-left">
            <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#0d2227]/60 uppercase font-mono">— AUTOMATED FOLLOW-UP</span>
            <h2 className="text-3xl md:text-4xl font-normal text-[#0d2227] leading-tight uppercase font-editorial">
              Collections that<br />run themselves.
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[#abc6d8]/20 border border-[#abc6d8]/40 flex items-center justify-center text-[#0d2227] shrink-0 text-[10px] font-bold">✓</span>
                <p className="text-zinc-600 text-xs leading-relaxed">Every overdue invoice gets a reminder — automatically, on schedule</p>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[#abc6d8]/20 border border-[#abc6d8]/40 flex items-center justify-center text-[#0d2227] shrink-0 text-[10px] font-bold">✓</span>
                <p className="text-zinc-600 text-xs leading-relaxed">Escalates from email to WhatsApp when a client goes quiet</p>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[#abc6d8]/20 border border-[#abc6d8]/40 flex items-center justify-center text-[#0d2227] shrink-0 text-[10px] font-bold">✓</span>
                <p className="text-zinc-600 text-xs leading-relaxed">Payment link embedded in every message, no back-and-forth</p>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/dashboard/documentation#automation-workflow" className="text-xs font-bold text-[#0d2227] hover:underline flex items-center gap-1 group transition-colors">
                See how automation works <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 9: INTERACTIVE INTEGRATIONS (10-NODE SVG HUBSPOT REAL-TIME SYNC) */}
      <section id="integrations" className="py-24 px-6 md:px-12 border-t border-white/10 relative overflow-hidden w-full text-center" style={{ backgroundColor: '#05060a' }}>
        {/* Pure-black backdrop with a soft ambient glow behind the icon cloud. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div
            className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[60%] h-[45%] rounded-full blur-[100px]"
            style={{ background: 'radial-gradient(ellipse, rgba(70,110,190,0.16), transparent 70%)' }}
          />
        </div>

        <ScrollReveal3D>
        <div className="text-center mb-16 relative z-10">
          <span className="text-xs uppercase font-extrabold tracking-widest text-white/60 font-mono">Universal Ledgers</span>
          <h2 className="text-3xl md:text-5xl font-normal mt-2 text-white uppercase font-editorial">Your Accounting Stack. Seamlessly Synced.</h2>
          <p className="text-zinc-200 text-sm md:text-base mt-4 max-w-xl mx-auto font-medium">No tedious configuration. Connect InvoNest to your standard financial databases in one click.</p>
        </div>
        </ScrollReveal3D>

        {/* 3D floating integrations cloud — only the providers we support */}
        <div className="relative z-10"><IntegrationsCloud3D /></div>

        {/* Catalogue: filter + search + transparent glass provider cards */}
        <IntegrationsCatalog />

        {/* Live sync stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-10">
          <div className="bg-white border border-[#0d2227]/10 rounded-2xl p-5 shadow-sm text-center">
            <div className="text-2xl font-extrabold text-[#0d2227] font-editorial">8</div>
            <div className="text-[10px] uppercase font-bold text-zinc-500 mt-1 font-mono">Integrations</div>
          </div>
          <div className="bg-white border border-[#0d2227]/10 rounded-2xl p-5 shadow-sm text-center">
            <div className="text-2xl font-extrabold text-green-700 font-editorial">99.9%</div>
            <div className="text-[10px] uppercase font-bold text-zinc-500 mt-1 font-mono">Sync Reliability</div>
          </div>
          <div className="bg-white border border-[#0d2227]/10 rounded-2xl p-5 shadow-sm text-center">
            <div className="text-2xl font-extrabold text-[#0d2227] font-editorial">Real-Time</div>
            <div className="text-[10px] uppercase font-bold text-zinc-500 mt-1 font-mono">Data Updates</div>
          </div>
          <div className="bg-white border border-[#0d2227]/10 rounded-2xl p-5 shadow-sm text-center">
            <div className="text-2xl font-extrabold text-[#0d2227] font-editorial">&lt; 2 Min</div>
            <div className="text-[10px] uppercase font-bold text-zinc-500 mt-1 font-mono">Average Setup Time</div>
          </div>
        </div>
      </section>

      {/* SECTION 10: EXECUTIVE INSIGHTS ANALYTICS */}
      <section id="features" className="py-24 px-6 md:px-12 max-w-5xl mx-auto border-t border-zinc-200">
        <div className="text-center mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#0d2227]/60 font-mono">Decision Analytics</span>
          <h2 className="text-3xl md:text-5xl font-normal mt-2 text-[#0d2227] uppercase font-editorial">Full-Spectrum Financial Command</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 hover:border-[#abc6d8] transition-all duration-300 shadow-sm text-[#0d2227]">
            <TrendingUp className="w-7 h-7 text-[#0d2227] mb-4" />
            <h3 className="font-bold text-lg mb-2 text-[#0d2227]">Scenario Simulators</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">Model payment delay hypotheses instantly (e.g. client default, payroll hikes) to analyze runway cash position outcomes.</p>
          </div>

          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 hover:border-[#abc6d8] transition-all duration-300 shadow-sm text-[#0d2227]">
            <ShieldAlert className="w-7 h-7 text-[#0d2227] mb-4" />
            <h3 className="font-bold text-lg mb-2 text-[#0d2227]">AI Creditworthiness Index</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">Assess safe credit ceilings for new customers automatically using historical behavior patterns and risk exposures.</p>
          </div>

          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 hover:border-[#abc6d8] transition-all duration-300 shadow-sm text-[#0d2227]">
            <Clock className="w-7 h-7 text-[#0d2227] mb-4" />
            <h3 className="font-bold text-lg mb-2 text-[#0d2227]">AR Timeline Audits</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">Audit the complete accounts receivable cycle (sent, viewed, reminder open, and processed payment dates) in real-time.</p>
          </div>
        </div>
      </section>

      {/* SECTION 11: SOCIAL PROOF COUNTERS */}
      <section className="py-20 bg-[#abc6d8]/10 border-y border-[#0d2227]/10 text-center text-[#0d2227] w-full">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6">
          <div>
            <div className="text-3xl md:text-5xl font-black text-[#0d2227] font-editorial">
              <AnimatedCounter value="₹12Cr+" />
            </div>
            <div className="text-xs uppercase font-semibold text-[#0d2227]/70 tracking-wider mt-2">Recovered Cash Flow</div>
          </div>
          <div>
            <div className="text-3xl md:text-5xl font-black text-[#0d2227] font-editorial">
              <AnimatedCounter value="120K+" />
            </div>
            <div className="text-xs uppercase font-semibold text-[#0d2227]/70 tracking-wider mt-2">Invoices Processed</div>
          </div>
          <div>
            <div className="text-3xl md:text-5xl font-black text-[#0d2227] font-editorial">
              <AnimatedCounter value="38%" />
            </div>
            <div className="text-xs uppercase font-semibold text-[#0d2227]/70 tracking-wider mt-2">Faster Invoice Recovery</div>
          </div>
          <div>
            <div className="text-3xl md:text-5xl font-black text-[#0d2227] font-editorial">
              <AnimatedCounter value="95%" />
            </div>
            <div className="text-xs uppercase font-semibold text-[#0d2227]/70 tracking-wider mt-2">OCR Document Confidence</div>
          </div>
        </div>
      </section>

      {/* SECTION: CLIENT TESTIMONIALS — two-row marquee, opposite directions */}
      <section
        className="py-24 border-t border-b border-white/10 w-full overflow-hidden"
        style={{ backgroundColor: '#000000' }}
      >
        <div className="text-center mb-12 px-6">
          <span className="text-[10px] uppercase font-bold text-white/45 tracking-wider block mb-2 font-mono">Client Testimony</span>
          <h2 className="text-3xl md:text-5xl font-normal text-white uppercase font-editorial">What Finance Teams Say</h2>
        </div>
        <Testimonials />
      </section>

      {/* SECTION: PRICING CARD MATRIX */}
      <section id="pricing" className="py-24 px-6 md:px-12 max-w-5xl mx-auto border-t border-white/10 relative">
        {/* Ambient backdrop. Breaks out of the max-w-5xl container to full
            viewport width, otherwise it would sit as a letterboxed strip behind
            the cards instead of behind the section. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen -z-10 overflow-hidden pointer-events-none"
        >
          <video
            src="/pricing/pricing.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          {/* Near-black scrim: dark glass card matrix with the pricing video
              kept subtly visible behind it. */}
          <div className="absolute inset-0 bg-[#08080b]/90" />
        </div>

        <ScrollReveal3D>
        <div className="text-center mb-16 relative z-10">
          <span className="text-xs uppercase font-extrabold tracking-widest font-mono text-white/45">Flexible Tiers</span>
          <h2 className="text-4xl md:text-6xl font-normal mt-2 uppercase font-editorial text-white">Pragmatic Plans for Growing Ledgers</h2>
        </div>
        </ScrollReveal3D>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {/* Starter Plan */}
          <div className="relative rounded-3xl p-7 flex flex-col justify-between overflow-hidden" style={{ background: 'rgba(18,18,20,0.72)', backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.9)' }}>
            <div aria-hidden="true" className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-60 h-36 rounded-full blur-3xl" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.32), transparent)' }} />
            <div className="relative">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">Starter</span>
              <div className="mt-4 text-4xl font-extrabold text-white font-editorial">₹0<span className="text-sm font-medium text-white/45"> / month</span></div>
              <p className="text-[11px] text-white/45 mt-3 leading-relaxed">For startups and boutique organizations ready to automate collections.</p>
              <div className="h-px bg-white/10 my-6" />
              <ul className="space-y-3.5 text-xs text-white/65">
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> Up to 50 active client ledgers</li>
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> OCR parsing (97% accuracy)</li>
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> Stripe and QuickBooks integrations</li>
              </ul>
            </div>
            <Link href="/dashboard" className="relative mt-8 block text-center font-bold text-xs py-3.5 rounded-xl transition-transform hover:scale-[1.01]" style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.14)' }}>
              Start Free Trial
            </Link>
          </div>

          {/* Growth Plan */}
          <div className="relative rounded-3xl p-7 flex flex-col justify-between overflow-hidden" style={{ background: 'rgba(28,28,32,0.82)', backdropFilter: 'blur(16px) saturate(150%)', WebkitBackdropFilter: 'blur(16px) saturate(150%)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 36px 70px -28px rgba(0,0,0,0.95)' }}>
            <span className="absolute top-5 right-5 z-10 text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider text-black" style={{ backgroundColor: '#ffffff' }}>Most Popular</span>
            <div aria-hidden="true" className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full blur-3xl" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.42), transparent)' }} />
            <div className="relative">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">Growth</span>
              <div className="mt-4 text-4xl font-extrabold text-white font-editorial">₹12,999<span className="text-sm font-medium text-white/45"> / month</span></div>
              <p className="text-[11px] text-white/45 mt-3 leading-relaxed">For high-throughput SaaS companies looking to optimize cash runways.</p>
              <div className="h-px bg-white/10 my-6" />
              <ul className="space-y-3.5 text-xs text-white/70">
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> Unlimited active client profiles</li>
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> AI CFO copilot chat assistant</li>
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> 30-60-90 Day forecasting models</li>
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> Visual reminder workflows builder</li>
              </ul>
            </div>
            <Link href="/dashboard" className="relative mt-8 block text-center font-bold text-xs py-3.5 rounded-xl transition-transform hover:scale-[1.01]" style={{ background: '#ffffff', color: '#0d1117' }}>
              Pay Now
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="relative rounded-3xl p-7 flex flex-col justify-between overflow-hidden" style={{ background: 'rgba(18,18,20,0.72)', backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.9)' }}>
            <div aria-hidden="true" className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-60 h-36 rounded-full blur-3xl" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.32), transparent)' }} />
            <div className="relative">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">Enterprise</span>
              <div className="mt-4 text-4xl font-extrabold text-white font-editorial">Custom pricing</div>
              <p className="text-[11px] text-white/45 mt-3 leading-relaxed">For massive finance divisions needing dedicated Digital Twin sims.</p>
              <div className="h-px bg-white/10 my-6" />
              <ul className="space-y-3.5 text-xs text-white/65">
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> Dedicated database cluster isolation</li>
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> Custom Financial Digital Twin API</li>
                <li className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span> SLA support agreements</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setBookDemoEmail('');
                setIsEnterpriseDemo(true);
                setIsBookDemoOpen(true);
              }}
              className="relative w-full mt-8 block text-center font-bold text-xs py-3.5 rounded-xl transition-transform hover:scale-[1.01]"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 13: FINAL CTA */}
      {/* Jet black. Set inline rather than via a bg-* utility: the dark-mode
          rules remap those classes sitewide, so a Tailwind class here would be
          overridden back to something else. */}
      <section
        className="py-28 px-6 text-center final-cta relative overflow-hidden border-t border-white/10"
        style={{ backgroundColor: '#000000' }}
      >
        
        <ScrollReveal3D className="max-w-3xl mx-auto relative z-10">
        <div className="flex flex-col items-center">
          <h2 className="text-3xl md:text-5xl font-normal text-white leading-tight mb-6 uppercase font-editorial">
            Every Unpaid Invoice Is A Cash Flow Problem Waiting To Happen.
          </h2>
          <p className="text-zinc-300 text-base max-w-xl mb-10 leading-relaxed font-semibold">
            Let AI predict payment risk, automate collections outreach, and help your finance team secure receivables faster.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard" className="px-8 py-3.5 rounded-xl font-bold transition-transform hover:scale-[1.03] shadow-lg shadow-black/40"
              style={{ backgroundColor: '#ffffff', color: '#0a0a0a', WebkitTextFillColor: '#0a0a0a' }}>
              Start Free Trial
            </Link>
            <button 
              onClick={() => {
                setBookDemoEmail('');
                setIsEnterpriseDemo(false);
                setIsBookDemoOpen(true);
              }}
              className="border border-white/25 text-white px-8 py-3.5 rounded-xl font-bold transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
            >
              Book Demo
            </button>
          </div>
        </div>
        </ScrollReveal3D>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#0d2227]/10 py-12 px-6 md:px-12 text-center text-xs text-zinc-600 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-[#0d2227]">InvoNest Technologies</span>
          </div>
          <div>© {new Date().getFullYear()} InvoNest Inc. All rights reserved.</div>
        </div>
      </footer>

      <BookDemoModal 
        isOpen={isBookDemoOpen}
        onClose={() => setIsBookDemoOpen(false)}
        initialEmail={bookDemoEmail}
        isEnterprise={isEnterpriseDemo}
        onSuccess={(email) => {
          setDemoEmail(email);
          setDemoSubmitted(true);
        }}
      />

    </div>
  );
}
