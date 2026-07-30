'use client';

/* Extracted from the old single-page dashboard so each sidebar item opens its own
   route. Shared state comes from <DashboardProvider> in layout.tsx. */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, MessageSquare, Send, CheckCircle, Clock, AlertTriangle, DollarSign, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useDashboard } from '../DashboardProvider';
import UpgradePrompt from '../../components/UpgradePrompt';
import ClientManager from './ClientManager';

export default function ClientLedgerPage() {
  const {
    invoices, setInvoices, selectedInvoice, setSelectedInvoiceId,
    newComment, setNewComment, handleAddComment,
    isUploading, uploadProgress, fileInputRef, handleOcrUploadClick, handleFileChange,
    isPaymentModalOpen, setIsPaymentModalOpen, isPaying, handleMockPay,
    upgrade, setUpgrade,
  } = useDashboard();

  // Reminder state + the confirmed-delivery toast. The toast is shown ONLY after
  // the backend confirms Resend accepted the email — a failed send shows an error
  // toast instead, never a false "Reminder Sent".
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    // Success auto-dismisses; errors linger a little so they can be read.
    const t = setTimeout(() => setToast(null), toast.type === 'success' ? 2600 : 5000);
    return () => clearTimeout(t);
  }, [toast]);

  async function sendReminder(invoiceId: string, invoiceNumber: string) {
    setRemindingId(invoiceId);
    try {
      const res = await api.post<{ sent: boolean; to: string }>(`/api/invoices/${invoiceId}/reminder`);
      setToast({ type: 'success', msg: `Reminder sent for ${invoiceNumber} → ${res.to}` });
    } catch (err: any) {
      // Surface the provider's real reason (bad address, unverified domain, etc.).
      setToast({ type: 'error', msg: err?.message || 'Could not send the reminder.' });
    } finally {
      setRemindingId(null);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="mb-2">
        <h1 className="text-lg font-extrabold text-[#0d2227]">Client Ledger</h1>
        <p className="text-[11px] text-zinc-500 font-mono">Outstanding billing agreements and settlement history</p>
      </header>

      {/* Client management: add / archive, with server-side rescoring. */}
      <ClientManager onChanged={() => window.location.reload()} />

        <div id="invoices" className="lg:col-span-2 space-y-6">
          
          {/* LEDGER LIST */}
          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 shadow-sm text-[#0d2227]">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-extrabold text-sm text-[#0d2227]">Accounts Receivable Ledger</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">List of outstanding billing agreements</p>
              </div>
              
              {/* Dropzone file input & button */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.png,.jpg,.jpeg" 
                style={{ display: 'none' }} 
              />
              <button 
                id="ocr-upload"
                onClick={handleOcrUploadClick} 
                disabled={isUploading}
                className="bg-[#0d2227] hover:bg-[#1a3339] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" /> 
                {isUploading ? `Extracting (${uploadProgress}%)...` : 'OCR Upload Invoice'}
              </button>
            </div>

            <div className="border border-[#0d2227]/15 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-[#0d2227]/15 text-[#0d2227]/80 font-bold uppercase tracking-wider text-[9px] font-mono">
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Client</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-center">Delay Risk</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className={`border-b border-[#0d2227]/10 last:border-b-0 cursor-pointer transition-all hover:bg-zinc-50 ${selectedInvoice.id === inv.id ? 'bg-[#abc6d8]/15 border-l-2 border-l-[#0d2227]' : ''}`}
                    >
                      <td className="p-3.5 font-bold text-[#0d2227]">{inv.invoiceNumber}</td>
                      <td className="p-3.5 font-semibold text-zinc-800">{inv.clientName}</td>
                      <td className="p-3.5 text-right font-bold text-[#0d2227]">₹{inv.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3.5 text-zinc-500 font-mono">{inv.dueDate}</td>
                      <td className="p-3.5">
                        <select
                          value={inv.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            const newStatus = e.target.value as any;
                            // Update local state immediately for instant feedback
                            setInvoices(prev => prev.map(item => item.id === inv.id ? { ...item, status: newStatus } : item));
                            
                            try {
                              await api.patch(`/api/invoices/${inv.id}/status`, { status: newStatus });
                            } catch (err) {
                              console.error('Failed to update status on server:', err);
                              // Revert state if backend call fails
                              setInvoices(prev => prev.map(item => item.id === inv.id ? { ...item, status: inv.status } : item));
                              alert(`Failed to update status: ${(err as any).message}`);
                            }
                          }}
                          className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold border outline-none cursor-pointer ${
                            inv.status === 'OVERDUE'
                              ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400'
                              : inv.status === 'PAID'
                              ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/20 dark:border-teal-900/50 dark:text-teal-400'
                              : inv.status === 'SENT' || inv.status === 'VIEWED'
                              ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400'
                              : 'bg-zinc-100 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="SENT">SENT</option>
                          <option value="VIEWED">VIEWED</option>
                          <option value="DUE">DUE</option>
                          <option value="OVERDUE">OVERDUE</option>
                          <option value="PAID">PAID</option>
                        </select>
                      </td>
                      <td className="p-3.5 text-center">
                        {inv.status === 'PAID' ? (
                          /* A settled invoice carries no forward-looking delay
                             risk — show "Paid", never the stale pre-payment %. */
                          <span className="font-mono font-bold text-green-600">Paid</span>
                        ) : (
                          <span className={`font-mono font-bold ${inv.riskScore > 70 ? 'text-red-600' : 'text-zinc-600'}`}>{inv.riskScore}%</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {/* Reminder only makes sense for an unpaid invoice. */}
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); sendReminder(inv.id, inv.invoiceNumber); }}
                            disabled={remindingId === inv.id}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#0d2227]/20 text-[#0d2227] hover:bg-[#abc6d8]/20 disabled:opacity-50 transition-colors font-mono inline-flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> {remindingId === inv.id ? 'Sending…' : 'Remind'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* INVOICE DETAILS PANEL */}
          <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 shadow-sm text-[#0d2227]">
            <div className="flex justify-between items-center mb-5 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h4 className="font-extrabold text-sm text-[#0d2227]">Ledger Inspector: {selectedInvoice.invoiceNumber}</h4>
              {selectedInvoice.status !== 'PAID' && (
                <button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-[#0d2227] hover:bg-[#1a3339] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono shadow transition-all flex items-center gap-1.5"
                >
                  <DollarSign className="w-3 h-3" /> Pay Now
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Timeline */}
              <div className="space-y-4">
                <h5 className="font-bold text-zinc-500 uppercase tracking-wider text-[9px] mb-2.5 font-mono">Accounts Receivable Timeline</h5>
                
                <div className="relative border-l border-zinc-200 pl-4 ml-2 space-y-4 text-[11px]">
                  {selectedInvoice.timeline.map((t, idx) => (
                    <div key={idx} className="relative">
                      {/* Node circle */}
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0d2227] ring-4 ring-white" />
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="font-bold text-[#0d2227]">{t.status}</span>
                        <span className="text-[9px] text-zinc-500 font-mono">{new Date(t.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-zinc-600 leading-normal">{t.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collaboration comments */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h5 className="font-bold text-zinc-500 uppercase tracking-wider text-[9px] mb-2.5 font-mono">Team Collaboration Comments</h5>
                  
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                    {selectedInvoice.comments.length === 0 ? (
                      <div className="text-zinc-400 text-center py-6 font-mono text-[10px]">No team comments logged. Add a comment below.</div>
                    ) : (
                      selectedInvoice.comments.map((c, idx) => (
                        <div key={idx} className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 text-[11px]">
                          <div className="flex justify-between text-[9px] text-zinc-500 mb-1.5">
                            <span className="font-bold text-[#0d2227]">{c.userName}</span>
                            <span className="font-mono">{new Date(c.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-zinc-700 leading-relaxed">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Comment writer */}
                <form onSubmit={handleAddComment} className="flex gap-2 mt-4 pt-3.5 border-t border-zinc-100">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Log comments on customer account..."
                    className="bg-white border border-zinc-300 rounded-lg text-xs px-3 py-1.5 flex-1 focus:outline-none focus:border-[#0d2227] text-zinc-800"
                  />
                  <button type="submit" className="bg-[#0d2227] hover:bg-[#1a3339] px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors">
                    Post
                  </button>
                </form>
              </div>
            </div>
          </div>

        </div>

      {/* MOCK PAYMENT MODAL */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 max-w-md w-full shadow-2xl text-[#0d2227] space-y-6"
            >
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider font-mono">Process Settlement</h3>
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-zinc-400 hover:text-[#0d2227] font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-medium">Invoice Number</span>
                  <span className="font-bold font-mono">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-medium">Customer Client</span>
                  <span className="font-bold">{selectedInvoice.clientName}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-zinc-100 pb-3.5">
                  <span className="text-zinc-500 font-medium">Card Credentials</span>
                  <span className="font-bold font-mono">Visa Ending in **** 1234</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-medium">Amount Due</span>
                  <span className="text-xl font-extrabold">₹{Number(selectedInvoice.amount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-[#abc6d8]/10 border border-[#0d2227]/5 rounded-lg p-3 text-[10px] text-zinc-500 leading-relaxed font-mono">
                💡 Currently this uses a simulated payment flow. In production, this would integrate with Stripe Checkout and webhooks.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 border border-zinc-200 hover:bg-zinc-50 font-bold py-2.5 rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMockPay}
                  disabled={isPaying}
                  className="flex-1 bg-[#0d2227] hover:bg-[#1a3339] text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {isPaying ? 'Processing...' : 'Pay Invoice'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {upgrade && (
        <UpgradePrompt
          trigger={upgrade.trigger}
          quota={upgrade.quota}
          resetAt={upgrade.resetAt}
          onClose={() => setUpgrade(null)}
        />
      )}

      {/* Liquid-glass delivery toast — only appears after a confirmed send. */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{
              background: toast.type === 'success' ? 'rgba(16,40,28,0.72)' : 'rgba(48,18,18,0.74)',
              backdropFilter: 'blur(22px) saturate(150%)',
              WebkitBackdropFilter: 'blur(22px) saturate(150%)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
              boxShadow: '0 20px 50px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              : <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <div className="text-xs font-bold text-white">
                {toast.type === 'success' ? 'Reminder Sent' : 'Reminder Failed'}
              </div>
              <div className="text-[11px] text-white/70 mt-0.5 break-words">{toast.msg}</div>
            </div>
            <button onClick={() => setToast(null)} className="text-white/40 hover:text-white/80 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
