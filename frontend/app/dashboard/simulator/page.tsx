'use client';

/* Extracted from the old single-page dashboard so each sidebar item opens its own
   route. Shared state comes from <DashboardProvider> in layout.tsx. */

import React from 'react';
import { motion } from 'framer-motion';
import { Sliders } from 'lucide-react';
import { useDashboard } from '../DashboardProvider';
import UpgradePrompt from '../../components/UpgradePrompt';

export default function SimulatorPage() {
  const { selectedScenario, simResults, handleRunSimulation, upgrade, setUpgrade } = useDashboard();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="mb-2">
        <h1 className="text-lg font-extrabold text-[#0d2227]">Scenario Simulator</h1>
        <p className="text-[11px] text-zinc-500 font-mono">Model payment assumptions to test runway solvency</p>
      </header>

      <div className="max-w-5xl">
        {/* SCENARIO SIMULATOR (2 COLS) */}
        <div id="scenario-simulator" className="lg:col-span-2 bg-white border border-[#0d2227]/15 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-[#0d2227]">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-[#0d2227]">Scenario Simulator</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Model payment assumptions to test runway solvency outcomes</p>
              </div>
              <Sliders className="w-4 h-4 text-zinc-400" />
            </div>

            {/* Selection tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'XYZ_LATE', text: 'XYZ pays 20 days late' },
                { id: 'IMPROVE_AR', text: 'Collections improve by 15%' },
                { id: 'ACQUIRER_DEFAULT', text: 'Acquirer defaults' },
                { id: 'SALES_DROP', text: 'Sales drop 15%' },
                { id: 'PAYROLL_UP', text: 'Payroll increases ₹80K' }
              ].map((s) => (
                <button 
                  key={s.id}
                  onClick={() => handleRunSimulation(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${selectedScenario === s.id ? 'bg-[#0d2227] text-white border-[#0d2227] shadow-sm shadow-[#0d2227]/15' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200/80'}`}
                >
                  {s.text}
                </button>
              ))}
            </div>

            {/* Results Display */}
            {simResults && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 text-xs"
              >
                <div className="flex justify-between border-b border-zinc-200 pb-2.5">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold font-mono">Baseline Runway Cash</span>
                    <span className="text-[#0d2227] font-mono font-bold">₹{simResults.originalCash.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold font-mono">Simulated Projection</span>
                    <span className={`font-mono font-bold ${simResults.delta < 0 ? 'text-red-600' : 'text-green-700'}`}>₹{simResults.simulatedCash.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold font-mono">Liquidity Impact</span>
                    <span className={`font-mono font-bold ${simResults.delta < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {simResults.delta > 0 ? '+' : ''}₹{simResults.delta.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <p className="text-zinc-600 leading-relaxed text-[11px]"><span className="font-bold text-[#0d2227]">Virtual Twin Narrative:</span> {simResults.explanation}</p>
              </motion.div>
            )}

            {!simResults && (
              <div className="text-center py-10 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl text-[11px] text-zinc-500 font-mono">
                Select a scenario template above to compute digital twin cash implications.
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between items-center text-[10px] text-zinc-400 font-mono">
            <span>Confidence Index: 89%</span>
            <span>Scenario Engine Active</span>
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
