'use client';

/* Extracted from the old single-page dashboard so each sidebar item opens its own
   route. Shared state comes from <DashboardProvider> in layout.tsx. */

import React from 'react';
import { UploadCloud, CheckCircle } from 'lucide-react';
import { useDashboard } from '../DashboardProvider';
import UpgradePrompt from '../../components/UpgradePrompt';

export default function InvoiceUploadPage() {
  const {
    invoices, plan, isUploading, uploadProgress, fileInputRef,
    handleOcrUploadClick, handleFileChange, upgrade, setUpgrade,
  } = useDashboard();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="mb-2">
        <h1 className="text-lg font-extrabold text-[#0d2227]">Invoice Upload</h1>
        <p className="text-[11px] text-zinc-500 font-mono">Drop a PDF or image — OCR extracts the fields for you</p>
      </header>

      <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-8 shadow-sm text-[#0d2227] max-w-3xl">
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />

        <button
          onClick={handleOcrUploadClick}
          disabled={isUploading}
          className="w-full border border-dashed border-[#0d2227]/25 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 hover:border-[#abc6d8] hover:bg-[#abc6d8]/5 transition-all disabled:opacity-60"
        >
          <UploadCloud className="w-10 h-10 text-zinc-400" />
          <span className="text-sm font-bold text-[#0d2227]">
            {isUploading ? 'Scanning OCR layers…' : 'Click to upload an invoice'}
          </span>
          <span className="text-[11px] text-zinc-500">PDF, PNG or JPG · up to 10MB</span>
        </button>

        {isUploading && (
          <div className="mt-5">
            <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#0d2227] h-full transition-all duration-300" style={{ width: uploadProgress + '%' }} />
            </div>
            <span className="text-[10px] font-mono text-zinc-500 mt-1.5 block">{uploadProgress}% complete</span>
          </div>
        )}

        {plan && plan.quotas.invoice_upload.limit !== null && (
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <div className="flex justify-between text-[11px] font-mono text-zinc-500 mb-1.5">
              <span>Monthly uploads</span>
              <span>{plan.quotas.invoice_upload.used} / {plan.quotas.invoice_upload.limit}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0d2227]"
                style={{ width: Math.min(100, (plan.quotas.invoice_upload.used / Math.max(1, plan.quotas.invoice_upload.limit)) * 100) + '%' }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#0d2227]/15 rounded-2xl p-6 shadow-sm text-[#0d2227] max-w-3xl">
        <h3 className="font-extrabold text-sm mb-4">Recently parsed</h3>
        <div className="space-y-2.5">
          {invoices.slice(0, 5).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between text-xs border-b border-zinc-100 pb-2.5 last:border-0">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span className="font-bold">{inv.invoiceNumber}</span>
                <span className="text-zinc-500">{inv.clientName}</span>
              </div>
              <span className="font-semibold">₹{inv.amount.toLocaleString('en-IN')}</span>
            </div>
          ))}
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
