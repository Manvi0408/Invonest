'use client';

/* Reminder Builder — its own route.
   Previously the sidebar linked to /dashboard/documentation#automation-workflow,
   which opened the docs page scrolled ~halfway down, under the "Documentation
   Hub" header. A nav item should land at the top of its own page. */

import React from 'react';
import ReminderBuilder from '../../components/ReminderBuilder';

export default function ReminderBuilderPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <header className="z-on-canvas mb-2">
        <h1 className="text-lg font-extrabold text-[#0d2227]">Reminder Builder</h1>
        <p className="text-[11px] text-zinc-500 font-mono">
          Automated follow-up sequences and delivery channels
        </p>
      </header>

      <ReminderBuilder />
    </div>
  );
}
