'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Ambient video behind the sidebar rail.
 *
 * The source is 3840x2160 / ~125 MB shown in a ~256px column, so the browser
 * decodes far more resolution than it can display — by far the heaviest thing on
 * the dashboard. The mitigations below don't shrink the file (only re-encoding
 * does that) but they stop it competing more than necessary with the dashboard's
 * own work:
 *   - mounts after first paint, so the fetch never blocks hydration
 *   - pauses when the tab is hidden
 *   - doesn't play at all under prefers-reduced-motion
 * A charcoal base under it keeps the rail correct before any frame downloads.
 *
 * NOTE: kept by explicit request despite the input-latency cost. The smooth
 * alternative is a re-encoded ~720p version of /rail/rail.mp4.
 */
export default function RailVideo() {
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

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[#0b0f16]">
      {mounted && !reduced && (
        <video
          ref={ref}
          src="/rail/rail.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Liquid-glass scrim. `backdrop-filter: blur` frosts the video behind it,
          so its bright moving highlights become soft diffuse glow instead of
          sharp spots that fight the nav text. The dark gradient fill guarantees
          contrast regardless of frame; weighted heavier on the left where the
          labels sit. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#0b0f16]/80 via-[#0b0f16]/66 to-[#0b0f16]/58"
        style={{
          backdropFilter: 'blur(18px) saturate(130%)',
          WebkitBackdropFilter: 'blur(18px) saturate(130%)',
        }}
      />
    </div>
  );
}
