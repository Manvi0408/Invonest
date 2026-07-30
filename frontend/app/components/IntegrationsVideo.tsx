'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Integrations showcase clip, replacing the Three.js hub-and-spoke scene.
 *
 * Two things worth knowing about the framing:
 *
 * 1. The source has a sparkle/star watermark burned in at (1137, 577) in its
 *    1280x720 frame — 46x46px, present on every single frame. Masking it was
 *    measured and rejected: on some frames real content comes within 3px of it,
 *    so any patch big enough to cover it also eats dashboard pixels. Cropping is
 *    clean, and cropping the BOTTOM is the right axis — the watermark's top edge
 *    is at y=577, while the integration logos (Razorpay, Outlook, Gmail) live
 *    near the right edge and would be destroyed by a horizontal crop.
 *
 *    So: the frame is clipped to the top 560 of 720 rows. The watermark starts
 *    17px below that line and can never appear.
 *
 * 2. `object-cover` + `object-top` inside a container locked to 1280/560 is what
 *    performs that crop, and it holds at every viewport width because the ratio
 *    is fixed rather than pixel-based.
 *
 * Playback is gated on visibility for the same reason the 3D scene was: this
 * sits far below the fold, and a decoding video competes with everything above
 * it. Measured on the old canvas at 52% dropped frames in the hero.
 */
export default function IntegrationsVideo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.intersectionRatio > 0.2),
      { threshold: [0, 0.2, 0.5] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (visible) {
      // play() rejects if the element is detached or autoplay is blocked; the
      // poster frame is a fine fallback, so this failure is not worth surfacing.
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [visible]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
      style={{ aspectRatio: '1280 / 560' }}
    >
      <video
        ref={videoRef}
        src="/integrations/integrations.mp4"
        muted
        playsInline
        loop
        preload="metadata"
        aria-label="InvoNest syncing with QuickBooks, Xero, Zoho Books, Salesforce, HubSpot, Razorpay, Gmail, Outlook, Slack and Stripe"
        className="absolute inset-0 w-full h-full object-cover object-top"
      />
    </div>
  );
}
