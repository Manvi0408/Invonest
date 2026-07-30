'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Clock, Zap, Check, ArrowRight, Briefcase, Calendar, ChevronLeft } from 'lucide-react';

interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess?: (email: string) => void;
  isEnterprise?: boolean;
}

interface FormState {
  name: string;
  email: string;
  companyName: string;
  volume: string;
  dateStr: string;
  timeSlot: string;
}

const getNextWorkingDays = () => {
  const days = [];
  let current = new Date();
  while (days.length < 7) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
      days.push(new Date(current));
    }
  }
  return days;
};

const formatDate = (date: Date) => {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const fullDateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return { weekday, day, month, dateStr: fullDateStr };
};

const TIME_SLOTS = [
  '10:00 AM',
  '11:30 AM',
  '1:00 PM',
  '2:30 PM',
  '4:00 PM',
  '5:30 PM',
];

export default function BookDemoModal({ isOpen, onClose, initialEmail = '', onSuccess, isEnterprise = false }: BookDemoModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: initialEmail,
    companyName: '',
    volume: isEnterprise ? '> ₹2 Crores' : '< ₹10 Lakhs',
    dateStr: '',
    timeSlot: '',
  });

  const [workingDays, setWorkingDays] = useState<{ weekday: string; day: number; month: string; dateStr: string }[]>([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({
        name: '',
        email: initialEmail,
        companyName: '',
        volume: isEnterprise ? '> ₹2 Crores' : '< ₹10 Lakhs',
        dateStr: '',
        timeSlot: '',
      });
      setSelectedDateIndex(null);
      const nextDays = getNextWorkingDays().map(formatDate);
      setWorkingDays(nextDays);
    }
  }, [isOpen, initialEmail, isEnterprise]);

  const handleNextStep = () => {
    if (formData.name.trim() && formData.email.trim()) {
      setStep(2);
    }
  };

  const handleConfirm = () => {
    if (formData.dateStr && formData.timeSlot) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setStep(3);
        if (onSuccess) {
          onSuccess(formData.email);
        }
      }, 1200); // Simulate network dispatch
    }
  };

  if (!isOpen) return null;
  // Render into <body> via a portal. A transformed / perspective ancestor on the
  // landing page (the 3D scroll-reveal wrappers) would otherwise trap this
  // `fixed` overlay in that ancestor's containing block — so it'd render at the
  // TOP of the page instead of the viewport, and a click near the footer would
  // "open nothing" on screen. The portal escapes that and pins it to the viewport.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto">
        
        {/* BACKDROP */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
        />

        {/* DIALOG BOX */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative bg-white dark:bg-[#0d2227] rounded-3xl shadow-2xl border border-zinc-200/25 dark:border-white/10 w-full max-w-4xl overflow-hidden min-h-[560px] flex flex-col md:flex-row text-left z-50 text-[#0d2227] dark:text-white"
        >
          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:text-zinc-300 dark:hover:text-white transition-all z-20"
            aria-label="Close booking modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* LEFT COLUMN: BRANDING & FEATURES VALUE PROP */}
          <div className="w-full md:w-[360px] shrink-0 bg-gradient-to-br from-[#0d2227] via-[#14323a] to-[#204954] text-white p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#abc6d8]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#abc6d8]/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-white text-[#0d2227] flex items-center justify-center font-extrabold text-xs shadow-sm">
                  N
                </div>
                <span className="font-extrabold tracking-tight text-sm">InvoNest</span>
              </div>

              {/* Pitch */}
              <div className="space-y-4">
                <h3 className="text-2xl font-normal leading-tight font-editorial uppercase tracking-tight">
                  {isEnterprise ? 'Enterprise\nConsultation' : 'Experience\nInvoNest Live'}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {isEnterprise 
                    ? 'Connect with our Solutions Architecture team to custom-configure dedicated cluster resources and private Digital Twin API keys.' 
                    : 'See how next-generation finance leaders automate collections, check customer credit risks, and predict operational runway.'}
                </p>
              </div>

              {/* Value Items */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-3 h-3 text-[#abc6d8]" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white">Interactive Digital Twin</h4>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Simulate cash decisions (hiring, payroll limits) on client data.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3 h-3 text-[#abc6d8]" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white">AI Copilot & Risk Engine</h4>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Generate real-time invoice recovery plans and billing drafts.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Briefcase className="w-3 h-3 text-[#abc6d8]" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white">ERP Integrations Walkthrough</h4>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Inspect native connections to QuickBooks, Sage, and Netsuite.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote / Sub-pitch */}
            <div className="relative z-10 pt-8 border-t border-white/10 text-[9px] text-zinc-400 font-mono">
              95% of finance teams gain actionable cash flow insights during their first live presentation.
            </div>
          </div>

          {/* RIGHT COLUMN: BOOKING FLOW */}
          <div className="flex-1 p-8 sm:p-10 bg-white dark:bg-[#09090b] flex flex-col justify-between relative">
            
            <AnimatePresence mode="wait">
              {/* STEP 1: GENERAL DETAILS */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-widest block font-mono">STEP 1 OF 3</span>
                    <h3 className="text-xl md:text-2xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial mt-1">
                      {isEnterprise ? 'Configure Enterprise Cluster' : "Let's get to know you"}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {isEnterprise 
                        ? 'Specify your organization requirements to pre-configure dedicated infrastructure scaling.' 
                        : 'Tell us a bit about your business to help us customize your demo.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">Full Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Andrew Miller"
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs px-3.5 py-3 focus:outline-none focus:border-[#0d2227] dark:focus:border-white transition-all text-[#0d2227] dark:text-white placeholder-[#0d2227]/30 dark:placeholder-white/35"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">Work Email</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="andrew@company.com"
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs px-3.5 py-3 focus:outline-none focus:border-[#0d2227] dark:focus:border-white transition-all text-[#0d2227] dark:text-white placeholder-[#0d2227]/30 dark:placeholder-white/35"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">Company Name</label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Acme Global Inc"
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs px-3.5 py-3 focus:outline-none focus:border-[#0d2227] dark:focus:border-white transition-all text-[#0d2227] dark:text-white placeholder-[#0d2227]/30 dark:placeholder-white/35"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">Average Monthly Invoice Volume</label>
                      <select
                        value={formData.volume}
                        onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs px-3.5 py-3 focus:outline-none focus:border-[#0d2227] dark:focus:border-white transition-all text-[#0d2227] dark:text-white cursor-pointer font-sans"
                      >
                        <option value="< ₹10 Lakhs">&lt; ₹10 Lakhs</option>
                        <option value="₹10 Lakhs - ₹50 Lakhs">₹10 Lakhs - ₹50 Lakhs</option>
                        <option value="₹50 Lakhs - ₹2 Crores">₹50 Lakhs - ₹2 Crores</option>
                        <option value="> ₹2 Crores">&gt; ₹2 Crores</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={!formData.name.trim() || !formData.email.trim()}
                      onClick={handleNextStep}
                      className="bg-[#0d2227] dark:bg-white text-white dark:text-[#0d2227] hover:bg-black dark:hover:bg-zinc-200 px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group font-sans"
                    >
                      Select Date & Time 
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: SCHEDULING CALENDAR & TIME SLOTS */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-400 hover:text-[#0d2227] dark:hover:text-white transition-colors"
                        aria-label="Back to details form"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-widest block font-mono">STEP 2 OF 3</span>
                        <h3 className="text-xl md:text-2xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial">Pick a Time Slot</h3>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Date Horizontal Select */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-mono flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Date Selection (Working Days)
                      </span>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                        {workingDays.map((d, index) => {
                          const isSelected = selectedDateIndex === index;
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setSelectedDateIndex(index);
                                setFormData({ ...formData, dateStr: d.dateStr });
                              }}
                              className={`flex flex-col items-center justify-center shrink-0 w-[72px] h-[78px] rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-[#0d2227] border-[#0d2227] text-white dark:bg-white dark:border-white dark:text-[#0d2227] shadow-md scale-95'
                                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              <span className="text-[9px] uppercase font-mono tracking-wider opacity-60">{d.weekday}</span>
                              <span className="text-lg font-bold mt-1 font-sans">{d.day}</span>
                              <span className="text-[9px] uppercase font-mono tracking-wider opacity-60 mt-0.5">{d.month}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Slots Grid */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-mono flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Available Times (15-min slots)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {TIME_SLOTS.map((t, index) => {
                          const isSelected = formData.timeSlot === t;
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setFormData({ ...formData, timeSlot: t })}
                              className={`py-3 rounded-xl border text-xs font-semibold font-mono transition-all ${
                                isSelected
                                  ? 'bg-[#0d2227] border-[#0d2227] text-white dark:bg-white dark:border-white dark:text-[#0d2227] shadow-sm'
                                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={!formData.dateStr || !formData.timeSlot || isSubmitting}
                      onClick={handleConfirm}
                      className="bg-[#0d2227] dark:bg-white text-white dark:text-[#0d2227] hover:bg-black dark:hover:bg-zinc-200 px-8 py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-sans min-w-[150px] justify-center"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white dark:border-[#0d2227] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Confirm Schedule'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: SUCCESS CONFIRMATION */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="h-full flex flex-col justify-center items-center text-center space-y-6 pt-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400"
                  >
                    <Check className="w-8 h-8 stroke-[3]" />
                  </motion.div>

                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-green-600 dark:text-green-400 tracking-widest block font-mono">BOOKING SUCCESSFUL</span>
                    <h3 className="text-2xl md:text-3xl font-normal text-[#0d2227] dark:text-white uppercase font-editorial">
                      {isEnterprise ? `Consultation Booked, ${formData.name.split(' ')[0]}!` : `You're all set, ${formData.name.split(' ')[0]}!`}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      {isEnterprise 
                        ? 'Our Solutions Architecture team is drafting your database cluster blueprint. We will review it on:' 
                        : 'We have scheduled your personalized walkthrough on:'}
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-[#abc6d8]/15 border border-[#abc6d8]/30 rounded-2xl p-4 w-full max-w-md text-left space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-200/50 dark:border-zinc-800/60">
                      <span className="font-bold text-[#0d2227] dark:text-white flex items-center gap-1.5 font-sans"><Calendar className="w-3.5 h-3.5 text-zinc-500" /> Date</span>
                      <span className="font-mono text-[11px] font-semibold">{formData.dateStr}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-200/50 dark:border-zinc-800/60">
                      <span className="font-bold text-[#0d2227] dark:text-white flex items-center gap-1.5 font-sans"><Clock className="w-3.5 h-3.5 text-zinc-500" /> Time</span>
                      <span className="font-mono text-[11px] font-semibold">{formData.timeSlot} (IST)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#0d2227] dark:text-white flex items-center gap-1.5 font-sans"><Zap className="w-3.5 h-3.5 text-zinc-500" /> Channel</span>
                      <span className="font-semibold">Google Meet (Link in invite)</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed font-sans">
                    A calendar invitation containing a conference bridge link has been dispatched to <span className="font-semibold text-zinc-600 dark:text-zinc-300">{formData.email}</span>.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="bg-[#0d2227] dark:bg-white text-white dark:text-[#0d2227] hover:bg-black dark:hover:bg-zinc-200 px-8 py-3 rounded-xl text-xs font-bold transition-all shadow-md font-sans"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
