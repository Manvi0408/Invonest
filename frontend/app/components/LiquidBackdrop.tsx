'use client';

import React from 'react';

/**
 * Jet-black page backdrop, sitting behind everything on every route.
 *
 * The landing hero paints its own video over the top of this, so the black is
 * what you actually see from the second screen of the landing page onward —
 * including every post-login page.
 *
 * `fixed` + negative z-index so it never intercepts pointer events or affects
 * layout. Deliberately a flat fill: no gradient, no drifting light. The orange
 * wallpaper it replaced still lives at /bg/wallpaper-orange.jpg if it's ever
 * wanted back.
 */
export default function LiquidBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ backgroundColor: '#000000' }}
    />
  );
}
