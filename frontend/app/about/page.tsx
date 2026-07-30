'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Zap, 
  Activity, 
  ArrowRight, 
  ChevronDown, 
  Sun, 
  Moon, 
  UploadCloud, 
  HelpCircle, 
  Check, 
  BookOpen, 
  Users, 
  DollarSign, 
  ArrowUpRight, 
  Briefcase, 
  Lock 
} from 'lucide-react';
import Link from 'next/link';
import BookDemoModal from '../components/BookDemoModal';

export default function AboutPage() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isBookDemoOpen, setIsBookDemoOpen] = useState(false);

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

  // AI CFO chat simulation state
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'assistant'; text: string; chartType?: 'runway' | 'clients' }>>([
    { sender: 'assistant', text: 'Hello, I am your AI CFO. Ask me anything about your cash flow or operational hiring budgets.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Quick questions for AI CFO
  const quickQuestions = [
    { q: 'Can we hire next quarter?', response: 'Yes. Based on current projections, you can comfortably hire next quarter. Projected cash runway: 14.5 months.', type: 'runway' },
    { q: 'Which clients are risky?', response: '3 clients are high risk of late payment. Total at risk: ₹3,24,000.', type: 'clients' }
  ];

  const handleAskCfo = (q: string, response: string, type: 'runway' | 'clients') => {
    if (isTyping) return;
    
    // Add user question
    setChatHistory(prev => [...prev, { sender: 'user', text: q }]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setChatHistory(prev => [...prev, { sender: 'assistant', text: response, chartType: type }]);
    }, 1200);
  };

  return (
    <div
      className="relative bg-white dark:bg-black text-[#0d2227] dark:text-zinc-100 selection:bg-[#abc6d8]/50 overflow-x-hidden min-h-screen transition-colors duration-300"
      style={{ backgroundColor: isDarkMode ? '#000000' : undefined }}
    >
      
      {/* HEADER NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300 ${isScrolled ? 'bg-white/95 dark:bg-black/95 border-b border-[#0d2227]/10 dark:border-white/10 shadow-sm backdrop-blur' : 'bg-transparent border-b border-transparent'}`}>
        <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0d2227] to-[#abc6d8] flex items-center justify-center font-bold text-white shadow-lg">
            N
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#0d2227] dark:text-white">InvoNest</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium z-40 text-[#0d2227]/80 dark:text-zinc-300">
          <a href="/#hero" className="transition-colors hover:text-black dark:hover:text-white font-semibold">Home</a>
          <a href="/#features" className="transition-colors hover:text-black dark:hover:text-white font-semibold">Features</a>
          
          {/* Product Dropdown */}
          <div 
            className="relative py-2 cursor-pointer flex items-center gap-1 transition-colors hover:text-black dark:hover:text-white font-semibold"
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
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[280px] bg-white dark:bg-[#121214] border border-[#0d2227]/15 dark:border-white/10 rounded-xl shadow-2xl p-2 z-50 text-left flex flex-col gap-1"
                >
                  <Link href="/dashboard/copilot" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#abc6d8]/10 text-[#0d2227] dark:text-zinc-200">
                    <span className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center font-bold text-xs text-purple-700 dark:text-purple-400">C</span>
                    <div>
                      <span className="text-[#0d2227] dark:text-zinc-100 text-xs font-bold block">AI CFO Advisor</span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[10px] block">Check hiring & payroll limits</span>
                    </div>
                  </Link>
                  <Link href="/dashboard/simulator" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#abc6d8]/10 text-[#0d2227] dark:text-zinc-200">
                    <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center font-bold text-xs text-blue-700 dark:text-blue-400">S</span>
                    <div>
                      <span className="text-[#0d2227] dark:text-zinc-100 text-xs font-bold block">Scenario Simulator</span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[10px] block">Test operational changes</span>
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Integrations Dropdown */}
          <div 
            className="relative py-2 cursor-pointer flex items-center gap-1 transition-colors hover:text-black dark:hover:text-white font-semibold"
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
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[310px] bg-white dark:bg-[#121214] border border-[#0d2227]/15 dark:border-white/10 rounded-xl shadow-2xl p-2.5 z-50 text-left flex flex-col gap-1"
                >
                  <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-[#abc6d8]/10 text-[#0d2227] dark:text-zinc-200">
                    <span className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-extrabold text-[9px] text-[#0d2227] dark:text-zinc-300">N</span>
                    <div>
                      <span className="text-[#0d2227] dark:text-zinc-100 text-xs font-bold block">Netsuite</span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[10px] block">Your ERP data, actionable</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-[#abc6d8]/10 text-[#0d2227] dark:text-zinc-200">
                    <span className="w-6 h-6 rounded-md bg-green-100 dark:bg-green-900/20 flex items-center justify-center font-bold text-[9px] text-green-700 dark:text-green-400">S</span>
                    <div>
                      <span className="text-[#0d2227] dark:text-zinc-100 text-xs font-bold block">Sage Intacct</span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[10px] block">Accelerate your cash collection</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a href="/#pricing" className="transition-colors hover:text-black dark:hover:text-white font-semibold">Pricing</a>
          
          <Link href="/about" className="relative transition-colors hover:text-black dark:hover:text-white font-semibold text-[#0d2227] dark:text-white">
            <span>About</span>
            <div className="w-full h-0.5 bg-[#0d2227] dark:bg-white absolute bottom-0 left-0" />
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium text-[#0d2227]/80 dark:text-zinc-300 hover:text-black dark:hover:text-white">
            Log In
          </Link>
          <button 
            onClick={() => setIsBookDemoOpen(true)}
            className="bg-[#0d2227] dark:bg-zinc-100 text-white dark:text-[#09090b] hover:bg-black dark:hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            Book a Demo
          </button>
        </div>
      </header>

      {/* SECTION 1: HERO - ABOUT INVO-NEST */}
      <section className="relative pt-40 pb-24 px-6 md:px-12 w-full overflow-hidden bg-gradient-to-b from-[#abc6d8]/10 dark:from-transparent via-transparent to-transparent">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 text-left space-y-6">
            <span className="inline-block text-[11px] uppercase font-extrabold tracking-[0.2em] text-[#0d2227]/70 dark:text-zinc-400 font-mono">
              ABOUT INVO-NEST
            </span>
            <h1 className="text-4xl md:text-6xl font-normal leading-[1.05] tracking-tight uppercase font-editorial text-gradient dark:text-white">
              We believe<br />
              cash flow should<br />
              be predictable.
            </h1>
          </div>
          <div className="lg:col-span-4 text-left space-y-6 lg:pt-14">
            <p className="text-zinc-600 dark:text-zinc-400 text-xs md:text-sm leading-relaxed font-semibold">
              InvoNest is the AI-powered cash flow intelligence platform that helps businesses predict risk, automate collections, and make confident financial decisions.
            </p>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsBookDemoOpen(true)}
                className="bg-[#0d2227] dark:bg-white text-white dark:text-[#09090b] px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black dark:hover:bg-zinc-200 transition-all shadow-md font-mono"
              >
                Book a Demo
              </button>
              <Link href="/dashboard" className="border border-[#0d2227]/25 dark:border-white/20 text-[#0d2227] dark:text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#abc6d8]/10 transition-all font-mono">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE PROBLEM */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto border-t border-[#0d2227]/10 dark:border-white/10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Text & Bullets */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] text-[#0d2227]/60 dark:text-zinc-400 font-mono">
                THE PROBLEM
              </span>
              <h2 className="text-3xl md:text-4.5xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial mt-2 leading-tight">
                Most businesses don't fail because they aren't profitable. <span className="text-blue-600 dark:text-[#abc6d8]">They fail because they run out of cash.</span>
              </h2>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 flex items-center justify-center text-red-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#0d2227] dark:text-white">Late payments</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed mt-0.5">Customers pay late. Cash gets stuck in unpaid invoices.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center text-amber-600 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#0d2227] dark:text-white">No visibility</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed mt-0.5">You can't predict when money is coming in. Hiring and expansion become a guessing game.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#0d2227] dark:text-white">Manual & time-consuming</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed mt-0.5">Your finance team spends hours sending manual reminders instead of driving strategic growth.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Photo with Overlaid Cards */}
          <div className="lg:col-span-6 relative flex items-center justify-center h-[460px] w-full bg-zinc-50 dark:bg-[#121214] rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/80">
            {/* The generated finance manager background photo */}
            <img 
              src="/stressed_finance_manager.png" 
              alt="Stressed Finance Manager" 
              className="absolute inset-0 w-full h-full object-cover opacity-85 dark:opacity-60 mix-blend-multiply dark:mix-blend-normal"
            />
            
            {/* Overlaid Card 1: Overdue Invoices */}
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute top-8 left-6 w-[180px] bg-white/90 dark:bg-zinc-900/90 border border-red-100 dark:border-red-950 backdrop-blur-md rounded-xl p-4 shadow-xl text-left"
            >
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Overdue Invoices</span>
              <div className="text-2xl font-extrabold text-[#0d2227] dark:text-white mt-1">42</div>
              <span className="text-[9px] text-red-600 font-bold font-mono">↑ 18% vs last month</span>
            </motion.div>

            {/* Overlaid Card 2: Outstanding Amount */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute bottom-8 right-6 w-[200px] bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/50 dark:border-zinc-800 backdrop-blur-md rounded-xl p-4.5 shadow-2xl text-left"
            >
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Outstanding Amount</span>
              <div className="text-xl font-extrabold text-[#0d2227] dark:text-white mt-1">₹12,40,000</div>
              <span className="text-[9px] text-red-600 font-bold font-mono">↑ 23% vs last month</span>
            </motion.div>

            {/* Overlaid Card 3: Avg Days Overdue */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute top-1/2 right-6 -translate-y-1/2 w-[160px] bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/50 dark:border-zinc-800 backdrop-blur-md rounded-xl p-4 shadow-xl text-left"
            >
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Avg. Days Delayed</span>
              <div className="text-xl font-extrabold text-[#0d2227] dark:text-white mt-0.5">26 days</div>
              <span className="text-[9px] text-red-600 font-bold font-mono">↑ 6 days vs last month</span>
            </motion.div>
          </div>

        </div>
      </section>

      {/* SECTION 3: MISSION & VISION */}
      <section className="bg-[#abc6d8]/10 dark:bg-black text-[#0d2227] dark:text-white py-20 px-6 md:px-12 w-full border-y border-[#0d2227]/10 dark:border-white/10 transition-colors duration-300" style={{ backgroundColor: isDarkMode ? '#000000' : undefined }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8 text-left">
            <h2 className="text-2xl md:text-4.5xl font-normal leading-[1.1] uppercase font-editorial tracking-wide text-[#0d2227] dark:text-white">
              Every unpaid invoice is money that exists on paper, <span className="text-blue-600 dark:text-[#abc6d8]">not in your account.</span>
            </h2>
          </div>
          <div className="lg:col-span-4 grid grid-cols-3 lg:grid-cols-1 gap-6 text-left border-l border-[#0d2227]/20 dark:border-white/20 pl-6 py-2">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-[#abc6d8]">43</div>
              <span className="text-[9px] uppercase font-bold text-zinc-500 dark:text-zinc-400 font-mono tracking-wider">Overdue Invoices</span>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-extrabold text-[#0d2227] dark:text-white">₹12,40,000</div>
              <span className="text-[9px] uppercase font-bold text-zinc-500 dark:text-zinc-400 font-mono tracking-wider">Outstanding</span>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-extrabold text-[#0d2227] dark:text-white">26 Days</div>
              <span className="text-[9px] uppercase font-bold text-zinc-500 dark:text-zinc-400 font-mono tracking-wider">Average Delay</span>
            </div>
          </div>
        </div>

        {/* Mission & Vision Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-16 text-left">
          <div className="bg-white/80 dark:bg-zinc-950/40 border border-[#0d2227]/10 dark:border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
            <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] text-blue-600 dark:text-[#abc6d8] font-mono">OUR MISSION</span>
            <h4 className="font-bold text-sm text-[#0d2227] dark:text-white font-editorial uppercase">Predicting Liquidity Limits</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              We empower CFOs and finance leaders to visualize collections latency, automate recovery schedules, and secure corporate runway before operational bottlenecks occur.
            </p>
          </div>
          <div className="bg-white/80 dark:bg-zinc-950/40 border border-[#0d2227]/10 dark:border-white/10 rounded-2xl p-6 md:p-8 space-y-3">
            <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] text-purple-600 dark:text-purple-400 font-mono">OUR VISION</span>
            <h4 className="font-bold text-sm text-[#0d2227] dark:text-white font-editorial uppercase">The Frictionless Ledger</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              We envision a world where transaction accounts, ledger databases, and invoice flows update autonomously, reducing cash flow delays to absolute zero.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: TRANSFORMATIONAL APPROACH */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto border-b border-[#0d2227]/10 dark:border-white/10 w-full text-center transition-colors duration-300">
        <div className="mb-14">
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-[0.25em] text-[#0d2227]/60 dark:text-zinc-400 font-mono mb-2">
            THE TRANSFORMATION
          </span>
          <h2 className="text-3xl md:text-5xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial tracking-tight">
            We don't just track unpaid invoices.<br />
            <span className="text-gradient dark:text-white">We predict what happens next.</span>
          </h2>
        </div>

        {/* Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-8 items-center text-left relative">
          
          {/* Traditional Box */}
          <div className="lg:col-span-5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
            <h3 className="font-extrabold text-sm text-[#0d2227] dark:text-white uppercase font-mono tracking-wider border-b border-zinc-200 dark:border-zinc-800 pb-3">
              Traditional Approach
            </h3>
            
            <ul className="space-y-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 flex items-center justify-center shrink-0 font-bold">✕</span>
                <div>
                  <span className="text-[#0d2227] dark:text-white font-bold block">Reactive</span>
                  Always reacting to payment defaults after they occur.
                </div>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 flex items-center justify-center shrink-0 font-bold">✕</span>
                <div>
                  <span className="text-[#0d2227] dark:text-white font-bold block">Manual follow-ups</span>
                  Inconsistent outreach, wasting critical admin workload.
                </div>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 flex items-center justify-center shrink-0 font-bold">✕</span>
                <div>
                  <span className="text-[#0d2227] dark:text-white font-bold block">No Future Visibility</span>
                  Operating on historical reports, with no visibility into cash flow default limits.
                </div>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 flex items-center justify-center shrink-0 font-bold">✕</span>
                <div>
                  <span className="text-[#0d2227] dark:text-white font-bold block">Spreadsheets & Silos</span>
                  Disconnected ledgers lead to error-prone projections.
                </div>
              </li>
            </ul>
          </div>

          {/* Central VS Badge */}
          <div className="lg:col-span-1 flex justify-center">
            <div className="w-12 h-12 rounded-full bg-[#0d2227] dark:bg-white text-white dark:text-[#0d2227] flex items-center justify-center font-extrabold text-sm font-mono shadow-xl border-4 border-white dark:border-[#09090b]">
              VS
            </div>
          </div>

          {/* InvoNest Box */}
          <div className="lg:col-span-5 bg-gradient-to-tr from-[#abc6d8]/10 to-transparent dark:bg-[#121214] border-2 border-[#0d2227]/40 dark:border-[#abc6d8]/20 rounded-2xl p-6 md:p-8 space-y-6 shadow-lg">
            <h3 className="font-extrabold text-sm text-[#0d2227] dark:text-white uppercase font-mono tracking-wider border-b border-[#0d2227]/10 dark:border-white/10 pb-3">
              InvoNest Approach
            </h3>

            <ul className="space-y-4 text-xs font-semibold text-[#0d2227] dark:text-zinc-300">
              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 flex items-center justify-center shrink-0 font-bold">✓</span>
                <div>
                  <span className="text-[#0d2227] dark:text-white font-bold block">Predictive AI</span>
                  See payment default warnings before the invoice due dates arrive.
                </div>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 flex items-center justify-center shrink-0 font-bold">✓</span>
                <div>
                  <span className="text-[#0d2227] dark:text-white font-bold block">Automated Collections</span>
                  Smart multi-channel messaging (WhatsApp + email) linked with checkout links.
                </div>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 flex items-center justify-center shrink-0 font-bold">✓</span>
                <div>
                  <span className="text-[#0d2227] dark:text-white font-bold block">Cash Flow Forecasting</span>
                  Continuous AI monitoring of operational runway and cash balances.
                </div>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 flex items-center justify-center shrink-0 font-bold">✓</span>
                <div>
                  <span className="text-[#0d2227] dark:text-white font-bold block">Unified Intelligence</span>
                  Direct APIs load QuickBooks, Stripe, Sage, and bank pipelines into one hub.
                </div>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* SECTION 5: HOW INVO-NEST WORKS */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto border-b border-[#0d2227]/10 dark:border-white/10 w-full text-center transition-colors duration-300">
        <div className="mb-14">
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-[0.25em] text-[#0d2227]/60 dark:text-zinc-400 font-mono mb-2">
            HOW INVO-NEST WORKS
          </span>
          <h2 className="text-3xl md:text-5xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial tracking-tight">
            Streamlining Receivables Flow
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-left">
          
          {/* Step 1 */}
          <div className="bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm min-h-[300px]">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase font-extrabold text-[#0d2227]/40 dark:text-zinc-500 font-mono">01 Upload</span>
                <span className="w-5 h-5 rounded-full bg-[#abc6d8]/20 flex items-center justify-center font-bold text-[9px] text-[#0d2227] dark:text-zinc-300 font-mono">01</span>
              </div>
              <h4 className="font-bold text-xs text-[#0d2227] dark:text-white mb-2">Connect Invoices</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] leading-relaxed">
                Connect your accounting software or drag-and-drop raw invoice files.
              </p>
            </div>
            {/* Drag drop mockup */}
            <div className="border border-dashed border-[#0d2227]/15 dark:border-white/10 rounded-lg p-3 text-center bg-white dark:bg-zinc-950 mt-4">
              <UploadCloud className="w-5 h-5 text-zinc-400 mx-auto" />
              <span className="text-[8px] font-bold text-zinc-500 mt-1 block">PDF, CSV, XLSX</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm min-h-[300px]">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase font-extrabold text-[#0d2227]/40 dark:text-zinc-500 font-mono">02 Analyze</span>
                <span className="w-5 h-5 rounded-full bg-[#abc6d8]/20 flex items-center justify-center font-bold text-[9px] text-[#0d2227] dark:text-zinc-300 font-mono">02</span>
              </div>
              <h4 className="font-bold text-xs text-[#0d2227] dark:text-white mb-2">AI Extraction</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] leading-relaxed">
                Our OCR models instantly pull billing data with 99% accuracy.
              </p>
            </div>
            {/* Invoice list details */}
            <div className="bg-white dark:bg-zinc-950 border border-[#0d2227]/10 dark:border-zinc-800 rounded-lg p-2.5 space-y-1 font-mono text-[8px] text-zinc-500 mt-4">
              <div className="flex justify-between"><span>INV-#</span><span className="text-zinc-800 dark:text-zinc-300 font-bold">1002</span></div>
              <div className="flex justify-between"><span>CLIENT</span><span className="text-zinc-800 dark:text-zinc-300 font-bold">ABC Corp</span></div>
              <div className="flex justify-between"><span>AMOUNT</span><span className="text-zinc-800 dark:text-zinc-300 font-bold">₹1,35,000</span></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm min-h-[300px]">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase font-extrabold text-[#0d2227]/40 dark:text-zinc-500 font-mono">03 Predict</span>
                <span className="w-5 h-5 rounded-full bg-[#abc6d8]/20 flex items-center justify-center font-bold text-[9px] text-[#0d2227] dark:text-zinc-300 font-mono">03</span>
              </div>
              <h4 className="font-bold text-xs text-[#0d2227] dark:text-white mb-2">Risk Scoring</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] leading-relaxed">
                Determine late payment probabilities using behavioral AI graphs.
              </p>
            </div>
            {/* Risk ring mockup */}
            <div className="bg-white dark:bg-zinc-950 border border-red-100 dark:border-red-950 rounded-lg p-3 mt-4 text-center">
              <span className="text-[8px] font-bold text-red-600 block uppercase font-mono">High Risk</span>
              <div className="w-9 h-9 rounded-full border-4 border-red-500 border-r-transparent animate-spin mx-auto mt-1" />
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm min-h-[300px]">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase font-extrabold text-[#0d2227]/40 dark:text-zinc-500 font-mono">04 Recover</span>
                <span className="w-5 h-5 rounded-full bg-[#abc6d8]/20 flex items-center justify-center font-bold text-[9px] text-[#0d2227] dark:text-zinc-300 font-mono">04</span>
              </div>
              <h4 className="font-bold text-xs text-[#0d2227] dark:text-white mb-2">Automate Outreach</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] leading-relaxed">
                Activate reminders across Email, SMS, and WhatsApp templates.
              </p>
            </div>
            {/* Checklist mockup */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 rounded-lg p-2 mt-4 space-y-1 text-[8px] font-mono text-zinc-500">
              <div className="flex items-center gap-1">✔ Email Sent</div>
              <div className="flex items-center gap-1">✔ WhatsApp Out</div>
              <div className="flex items-center gap-1 font-bold text-blue-600">⌛ Payment Link</div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm min-h-[300px]">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase font-extrabold text-[#0d2227]/40 dark:text-zinc-500 font-mono">05 Grow</span>
                <span className="w-5 h-5 rounded-full bg-[#abc6d8]/20 flex items-center justify-center font-bold text-[9px] text-[#0d2227] dark:text-zinc-300 font-mono">05</span>
              </div>
              <h4 className="font-bold text-xs text-[#0d2227] dark:text-white mb-2">Scale Cash Flow</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] leading-relaxed">
                Dramatically reduce DSO and build working capital buffers.
              </p>
            </div>
            {/* Chart health mockup */}
            <div className="bg-white dark:bg-zinc-950 border border-green-100 dark:border-green-950 rounded-lg p-2.5 mt-4 text-center">
              <span className="text-[8px] font-bold text-green-700 dark:text-green-400 font-mono block">Health: Great</span>
              <div className="h-6 flex items-end gap-1 justify-center mt-1">
                <div className="w-1 bg-green-200 h-2" /><div className="w-1 bg-green-300 h-3" /><div className="w-1 bg-green-400 h-4" /><div className="w-1 bg-green-500 h-6" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 6: THE AI CFO */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto border-b border-[#0d2227]/10 dark:border-white/10 w-full transition-colors duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Text & Features */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] text-[#0d2227]/60 dark:text-zinc-400 font-mono">
                THE AI CFO
              </span>
              <h2 className="text-3xl md:text-5xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial leading-none mt-2">
                The AI CFO<br />that never sleeps.
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm mt-3 font-semibold">
                Ask questions. Get real answers. Make confident decisions.
              </p>
            </div>

            <div className="space-y-3 font-semibold text-xs text-[#0d2227] dark:text-zinc-300">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-600" /> Cash flow forecasts
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-600" /> Risk insights
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-600" /> Collection recommendations
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-green-600" /> Scenario planning (Digital Twin)
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Interactive Chat Console */}
          <div className="lg:col-span-7 bg-[#f8fafc] dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between min-h-[460px] text-left transition-colors duration-300">
            
            {/* Header */}
            <div className="border-b border-[#0d2227]/10 dark:border-zinc-800 pb-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="font-extrabold text-xs text-[#0d2227] dark:text-white uppercase font-mono">AI CFO Copilot</span>
              </div>
              <span className="text-[9px] text-zinc-400 font-mono">v2.0 Active Connection</span>
            </div>

            {/* Chat History Area */}
            <div className="flex-1 space-y-4 py-4 max-h-[280px] overflow-y-auto font-mono text-[11px] leading-relaxed">
              {chatHistory.map((item, index) => (
                <div key={index} className={`flex gap-3 ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {item.sender === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-[#0d2227] dark:bg-white text-white dark:text-[#0d2227] flex items-center justify-center font-extrabold text-[10px] shrink-0 transition-colors duration-300">
                      AI
                    </div>
                  )}
                  <div className={`p-3 rounded-xl max-w-[80%] transition-colors duration-300 ${
                    item.sender === 'user' 
                      ? 'bg-[#0d2227] dark:bg-white text-white dark:text-[#0d2227] rounded-tr-none' 
                      : 'bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[#0d2227] dark:text-zinc-200 rounded-tl-none'
                  }`}>
                    {item.text}

                    {/* Dynamic Chart Overlay for assistant response */}
                    {item.chartType === 'runway' && (
                      <div className="border-t border-zinc-150 dark:border-zinc-800 pt-2.5 mt-2.5 space-y-1">
                        <span className="text-[9px] text-zinc-400 font-bold block">PROJECTED CASH FLOW</span>
                        <div className="h-14 flex items-end gap-1 justify-between pt-1">
                          <div className="w-[12%] bg-zinc-200 dark:bg-zinc-800 h-[60%] rounded-sm" />
                          <div className="w-[12%] bg-zinc-200 dark:bg-zinc-800 h-[70%] rounded-sm" />
                          <div className="w-[12%] bg-zinc-200 dark:bg-zinc-800 h-[50%] rounded-sm" />
                          <div className="w-[12%] bg-blue-500 h-[80%] rounded-sm" />
                          <div className="w-[12%] bg-blue-500 h-[95%] rounded-sm" />
                          <div className="w-[12%] bg-blue-500 h-[100%] rounded-sm" />
                        </div>
                      </div>
                    )}

                    {item.chartType === 'clients' && (
                      <div className="border-t border-zinc-150 dark:border-zinc-800 pt-2.5 mt-2.5 space-y-1.5 font-mono text-[9px] text-zinc-400">
                        <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                          <span>ABC Corp</span><span className="text-red-500 font-bold">₹3,24,000 (Overdue)</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                          <span>Acquirer Inc</span><span className="text-red-500 font-bold">₹1,20,000 (Risky)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>XYZ Ltd</span><span className="text-orange-500 font-bold">₹69,000 (Monitor)</span>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-6 h-6 rounded-full bg-[#0d2227] dark:bg-white text-white dark:text-[#0d2227] flex items-center justify-center font-extrabold text-[10px] shrink-0 transition-colors duration-300">
                    AI
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 font-mono text-[10px] animate-pulse">
                    Typing projection matrices...
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions buttons footer */}
            <div className="border-t border-[#0d2227]/10 dark:border-zinc-800 pt-4 flex flex-col gap-3">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Suggested Questions</span>
              <div className="flex flex-wrap gap-2.5">
                {quickQuestions.map((qItem, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskCfo(qItem.q, qItem.response, qItem.type as 'runway' | 'clients')}
                    disabled={isTyping}
                    className="bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-bold text-[#0d2227] dark:text-zinc-300 font-mono transition-all text-left shadow-sm flex items-center gap-1.5"
                  >
                    <span>{qItem.q}</span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 7: VALUES */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto border-b border-[#0d2227]/10 dark:border-white/10 w-full text-center transition-colors duration-300">
        <div className="mb-14">
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-[0.25em] text-[#0d2227]/60 dark:text-zinc-400 font-mono mb-2">
            OUR CORE VALUES
          </span>
          <h2 className="text-3xl md:text-5xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial tracking-tight">
            What Guides Us
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
          <div className="bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm transition-colors duration-300">
            <Lock className="w-6 h-6 text-blue-600 dark:text-[#abc6d8] mb-4" />
            <h4 className="font-bold text-sm text-[#0d2227] dark:text-white mb-2">Trust & Security</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">We protect client billing workflows with SOC2-compliant encryption, maintaining strict ledger integrity.</p>
          </div>
          <div className="bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm transition-colors duration-300">
            <Zap className="w-6 h-6 text-amber-500 mb-4" />
            <h4 className="font-bold text-sm text-[#0d2227] dark:text-white mb-2">Velocity</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">We optimize cash cycle velocity, cutting collection lag time without damaging client goodwill.</p>
          </div>
          <div className="bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm transition-colors duration-300">
            <Users className="w-6 h-6 text-purple-500 mb-4" />
            <h4 className="font-bold text-sm text-[#0d2227] dark:text-white mb-2">Empathy</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">Collections can be sensitive. Our AI optimizes email tonality to balance pressure and customer relationships.</p>
          </div>
          <div className="bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm transition-colors duration-300">
            <Activity className="w-6 h-6 text-teal-500 mb-4" />
            <h4 className="font-bold text-sm text-[#0d2227] dark:text-white mb-2">Precision</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">Our machine learning models predict payment delays with high fidelity, preventing false alarms.</p>
          </div>
        </div>
      </section>

      {/* SECTION 8: TEAM */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto border-b border-[#0d2227]/10 dark:border-white/10 w-full text-center transition-colors duration-300">
        <div className="mb-14">
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-[0.25em] text-[#0d2227]/60 dark:text-zinc-400 font-mono mb-2">
            MEET THE FOUNDER
          </span>
          <h2 className="text-3xl md:text-5xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial tracking-tight">
            The Person Behind InvoNest
          </h2>
        </div>
        
        <div className="flex justify-center text-left">
          <div className="max-w-2xl bg-[#f8fafc] dark:bg-[#121214] border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-8 md:p-10 shadow-lg flex flex-col md:flex-row items-center gap-8 transition-colors duration-300">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#abc6d8] to-[#0d2227] flex items-center justify-center font-bold text-white text-2xl shrink-0 shadow-md">
              MY
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-lg text-[#0d2227] dark:text-white">Manvi Yadav</h4>
                <span className="text-xs text-blue-600 dark:text-[#abc6d8] font-bold uppercase tracking-wider font-mono">Founder of InvoNest</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-medium">
                Hi, I'm Manvi Yadav, a Computer Science student passionate about building scalable full-stack products. I built InvoNest, an AI-powered cash flow intelligence platform that helps businesses predict payment delays, automate collections, and improve financial decision-making.
              </p>
              <div className="pt-2">
                <a 
                  href="https://github.com/Manvi0408" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#0d2227] dark:text-white hover:text-blue-600 dark:hover:text-[#abc6d8] transition-colors font-mono"
                >
                  <span>view GitHub Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9: TIMELINE */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto border-b border-[#0d2227]/10 dark:border-white/10 w-full text-center transition-colors duration-300">
        <div className="mb-14">
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-[0.25em] text-[#0d2227]/60 dark:text-zinc-400 font-mono mb-2">
            OUR JOURNEY
          </span>
          <h2 className="text-3xl md:text-5xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial tracking-tight">
            Company Timeline
          </h2>
        </div>
        
        <div className="relative border-l border-zinc-200 dark:border-zinc-800 max-w-3xl mx-auto text-left pl-6 space-y-12 transition-colors duration-300">
          {/* 2024 */}
          <div className="relative">
            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#0d2227] dark:bg-white border-4 border-white dark:border-[#09090b] shadow transition-colors duration-300" />
            <span className="text-xs font-bold text-blue-600 dark:text-[#abc6d8] font-mono">Q1 2024</span>
            <h4 className="font-bold text-sm text-[#0d2227] dark:text-white mt-1">Inception & Seed Funding</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 leading-relaxed">Founded in Mumbai by a team of finance and machine learning experts to solve accounts receivable delays.</p>
          </div>
          {/* 2025 */}
          <div className="relative">
            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#0d2227] dark:bg-white border-4 border-white dark:border-[#09090b] shadow transition-colors duration-300" />
            <span className="text-xs font-bold text-blue-600 dark:text-[#abc6d8] font-mono">Q3 2025</span>
            <h4 className="font-bold text-sm text-[#0d2227] dark:text-white mt-1">V1 Release & Ledger APIs</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 leading-relaxed">Launched deep bidirectional sync with QuickBooks Online, NetSuite, and Sage Intacct databases.</p>
          </div>
          {/* 2026 */}
          <div className="relative">
            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#0d2227] dark:bg-white border-4 border-white dark:border-[#09090b] shadow transition-colors duration-300" />
            <span className="text-xs font-bold text-blue-600 dark:text-[#abc6d8] font-mono">Q2 2026</span>
            <h4 className="font-bold text-sm text-[#0d2227] dark:text-white mt-1">V2 & AI CFO Launch</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 leading-relaxed">Integrated generative AI risk copilot and digital twin simulations, scaling to support 5,000+ active organisations.</p>
          </div>
        </div>
      </section>

      {/* SECTION 9.5: OUR VISION */}
      <section className="py-28 px-6 text-center w-full bg-[#abc6d8]/10 dark:bg-black transition-colors duration-300" style={{ backgroundColor: isDarkMode ? '#000000' : undefined }}>
        <div className="max-w-4xl mx-auto space-y-4">
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-[0.25em] text-[#0d2227]/60 dark:text-zinc-400 font-mono">
            OUR VISION
          </span>
          <h2 className="text-3xl md:text-5.5xl font-normal leading-[1.1] text-[#0d2227] dark:text-white uppercase font-editorial tracking-tight">
            A world where no business loses growth because of unpredictable cash flow.
          </h2>
        </div>
      </section>

      {/* SECTION 10: BOTTOM CTA BANNER */}
      <section className="py-24 px-6 text-center bg-[#abc6d8]/10 dark:bg-black relative overflow-hidden border-t border-[#0d2227]/10 dark:border-white/10 transition-colors duration-300" style={{ backgroundColor: isDarkMode ? '#000000' : undefined }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d2227]/5 dark:from-white/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10 flex flex-col items-center">
          <h2 className="text-3xl md:text-5xl font-normal text-[#0d2227] dark:text-white leading-tight mb-6 uppercase font-editorial">
            Stop chasing payments.<br />
            Start predicting cash flow.
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            <Link href="/dashboard" className="bg-[#0d2227] dark:bg-white text-white dark:text-[#0d2227] hover:bg-black dark:hover:bg-zinc-100 px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg font-mono text-xs">
              Start Free Trial
            </Link>
            <button 
              onClick={() => setIsBookDemoOpen(true)}
              className="border border-[#0d2227]/30 dark:border-white/20 text-[#0d2227] dark:text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#0d2227]/5 dark:hover:bg-white/10 transition-all font-mono text-xs"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#0d2227]/10 dark:border-white/10 py-12 px-6 md:px-12 text-center text-xs text-zinc-500 bg-white dark:bg-black transition-colors duration-300">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-[#0d2227] dark:text-white">InvoNest Technologies</span>
          </div>
          <div>© {new Date().getFullYear()} InvoNest Inc. All rights reserved.</div>
        </div>
      </footer>

      <BookDemoModal 
        isOpen={isBookDemoOpen}
        onClose={() => setIsBookDemoOpen(false)}
      />

    </div>
  );
}
