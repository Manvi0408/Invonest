'use client';

import React, { useCallback, useEffect, useRef } from 'react';

/** Seconds of overlap where both clips play and cross-dissolve. */
const OVERLAP = 1.8;
const SCROLL_FADE_MS = 350;
const VISIBILITY_THRESHOLD = 0.2;

interface VideoBackgroundProps {
  src: string;
  /** The section whose visibility drives play/pause — usually the hero. */
  targetRef: React.RefObject<HTMLElement | null>;
  poster?: string;
  scrim?: string;
  /** Which part of the frame survives the cover-crop. */
  objectPosition?: string;
}

/**
 * Seamless looping video backdrop.
 *
 * The source is a slow push-in, so its final frame sits at a different zoom than
 * its first. A hard loop (or a fade through a still) shows that as a visible jump
 * in camera position. Instead we run TWO video elements: as the leading clip nears
 * its end the trailing clip starts from zero and the pair cross-dissolve while both
 * are still moving. Motion never stops, nothing re-buffers, and the change in framing
 * reads as an intentional dissolve rather than a reload.
 */
export default function VideoBackground({
  src,
  targetRef,
  poster,
  scrim = 'linear-gradient(to bottom, rgba(24,24,24,0.58) 0%, rgba(24,24,24,0.22) 38%, rgba(24,24,24,0.42) 72%, rgba(24,24,24,0.72) 100%)',
  objectPosition = 'top center',
}: VideoBackgroundProps) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const leadIsA = useRef(true);
  const handingOver = useRef(false); // guards repeated timeupdate events
  const xfadeRaf = useRef<number | null>(null);
  const scrollRaf = useRef<number | null>(null);
  const inView = useRef(true);
  const reduced = useRef(false);

  const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  /** Cross-dissolve the two clips over `ms`, resuming from current opacities. */
  const crossfade = useCallback((from: HTMLVideoElement, to: HTMLVideoElement, ms: number, onDone: () => void) => {
    if (xfadeRaf.current !== null) cancelAnimationFrame(xfadeRaf.current);

    if (reduced.current) {
      from.style.opacity = '0';
      to.style.opacity = '1';
      onDone();
      return;
    }

    const fromStart = parseFloat(from.style.opacity || '1');
    const toStart = parseFloat(to.style.opacity || '0');
    const t0 = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = easeInOut(p);
      from.style.opacity = String(fromStart + (0 - fromStart) * e);
      to.style.opacity = String(toStart + (1 - toStart) * e);
      if (p < 1) {
        xfadeRaf.current = requestAnimationFrame(tick);
      } else {
        xfadeRaf.current = null;
        onDone();
      }
    };
    xfadeRaf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;

    a.style.opacity = '1';
    b.style.opacity = '0';
    a.play().catch(() => {});

    const onTimeUpdate = (e: Event) => {
      const el = e.currentTarget as HTMLVideoElement;
      const lead = leadIsA.current ? a : b;
      const trail = leadIsA.current ? b : a;

      // Only the clip currently on screen drives the handover.
      if (el !== lead || handingOver.current || !el.duration || !inView.current) return;

      if (el.currentTime >= el.duration - OVERLAP) {
        handingOver.current = true;
        trail.currentTime = 0;
        trail.play().catch(() => {});

        crossfade(lead, trail, OVERLAP * 1000, () => {
          lead.pause();
          lead.currentTime = 0; // rewound off-screen, ready for the next handover
          leadIsA.current = !leadIsA.current;
          handingOver.current = false;
        });
      }
    };

    // Safety net: if a clip somehow reaches the end without handing over
    // (e.g. the tab was backgrounded mid-dissolve), restart it silently.
    const onEnded = (e: Event) => {
      const el = e.currentTarget as HTMLVideoElement;
      if (handingOver.current) return;
      el.currentTime = 0;
      el.play().catch(() => {});
    };

    [a, b].forEach((v) => {
      v.addEventListener('timeupdate', onTimeUpdate);
      v.addEventListener('ended', onEnded);
    });

    return () => {
      [a, b].forEach((v) => {
        v.removeEventListener('timeupdate', onTimeUpdate);
        v.removeEventListener('ended', onEnded);
      });
      if (xfadeRaf.current !== null) cancelAnimationFrame(xfadeRaf.current);
    };
  }, [crossfade]);

  /** Fade + genuinely pause both clips once the hero leaves view. */
  useEffect(() => {
    const el = targetRef.current;
    const layer = layerRef.current;
    if (!el || !layer) return;

    const fadeLayer = (target: number, onDone?: () => void) => {
      if (scrollRaf.current !== null) cancelAnimationFrame(scrollRaf.current);
      if (reduced.current) {
        layer.style.opacity = String(target);
        onDone?.();
        return;
      }
      const from = parseFloat(layer.style.opacity || '1');
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / SCROLL_FADE_MS);
        layer.style.opacity = String(from + (target - from) * easeInOut(p));
        if (p < 1) scrollRaf.current = requestAnimationFrame(tick);
        else {
          scrollRaf.current = null;
          onDone?.();
        }
      };
      scrollRaf.current = requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.intersectionRatio >= VISIBILITY_THRESHOLD;
        if (visible === inView.current) return;
        inView.current = visible;

        const lead = leadIsA.current ? aRef.current : bRef.current;
        if (visible) {
          lead?.play().catch(() => {});
          fadeLayer(1);
        } else {
          fadeLayer(0, () => {
            aRef.current?.pause();
            bRef.current?.pause();
          });
        }
      },
      { threshold: [0, VISIBILITY_THRESHOLD, 0.5, 1] },
    );

    obs.observe(el);
    return () => {
      obs.disconnect();
      if (scrollRaf.current !== null) cancelAnimationFrame(scrollRaf.current);
    };
  }, [targetRef]);

  const layerStyle: React.CSSProperties = {
    width: '115%',
    height: '115%',
    objectPosition,
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div ref={layerRef} className="absolute inset-0" style={{ opacity: 1 }}>
        {/* Only ever seen before the first frame decodes. */}
        {poster && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 bg-cover"
            style={{ ...layerStyle, backgroundImage: `url(${poster})`, backgroundPosition: objectPosition }}
          />
        )}
        <video
          ref={aRef}
          src={src}
          poster={poster}
          muted
          playsInline
          preload="auto"
          className="absolute top-0 left-1/2 -translate-x-1/2 object-cover"
          style={{ ...layerStyle, opacity: 1 }}
        />
        <video
          ref={bRef}
          src={src}
          muted
          playsInline
          preload="auto"
          className="absolute top-0 left-1/2 -translate-x-1/2 object-cover"
          style={{ ...layerStyle, opacity: 0 }}
        />
      </div>

      <div className="absolute inset-0" style={{ background: scrim }} />
      <div className="absolute inset-0" style={{ background: 'rgba(115,121,107,0.10)' }} />
    </div>
  );
}
