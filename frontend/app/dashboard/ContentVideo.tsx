'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Ambient video behind the dashboard content area (Overview and every route),
 * NOT behind the sidebar.
 *
 * It lives in the non-scrolling wrapper around <main> rather than inside it, so
 * the footage stays put while the content scrolls over it.
 *
 * The source is 3840x2160 / 125 MB. The browser decodes at source resolution
 * regardless of display size, so the mitigations below matter:
 *  - mounts after first paint, so the fetch never competes with hydration
 *  - pauses when the tab is hidden
 *  - does not play at all under prefers-reduced-motion
 *
 * NOTE: kept by explicit request despite the input-latency cost (this is the
 * second concurrent 4K decode on the dashboard). Re-encode /media/rail.mp4 to
 * ~720p for a smooth version.
 */
export default function ContentVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    if (mq.matches) return;
    const t = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const onVis = () => {
      const v = ref.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [mounted]);

  if (reduced) return null;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-[22px] pointer-events-none">
      {mounted && (
        <video
          ref={ref}
          src="/media/rail.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Cream-tinted scrim rather than a dark one: the dashboard is a light
          theme, and a dark wash here would fight the cream canvas and drop the
          contrast of every dark heading sitting on top. */}
      <div className="absolute inset-0 bg-[#f1ede4]/82" />
    </div>
  );
}
