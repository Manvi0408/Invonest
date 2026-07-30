'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useMotionTemplate, useSpring, useReducedMotion } from 'framer-motion';

/**
 * Depth-based scroll reveal for section headings.
 *
 * The block starts pushed back in Z, tilted, and out of focus, then resolves as
 * it enters the viewport — so it reads as arriving from behind the screen
 * rather than sliding up from below.
 *
 * Three details do most of the work:
 *  - progress is scroll-linked, not a one-shot trigger, so the motion tracks
 *    the wheel exactly and reverses when you scroll back up
 *  - a spring smooths that raw progress, which stops trackpad jitter from
 *    showing up as micro-stutter in the transform
 *  - the blur resolves *before* the position settles, so text is legible for
 *    most of the travel instead of arriving sharp only at the very end
 */
export default function ScrollReveal3D({
  children,
  className = '',
  /** Depth to start from, in px. Larger = more dramatic. */
  depth = 340,
  /** Opening tilt in degrees. 0 disables the rotation. */
  tilt = 10,
}: {
  children: React.ReactNode;
  className?: string;
  depth?: number;
  tilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    // Begins just before the block enters view, finishes once it is comfortably
    // inside — completing early keeps the heading readable while you read it.
    offset: ['start 0.92', 'start 0.42'],
  });

  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.5 });

  const z = useTransform(p, [0, 1], [-depth, 0]);
  const rotateX = useTransform(p, [0, 1], [tilt, 0]);
  const scale = useTransform(p, [0, 1], [0.86, 1]);
  const opacity = useTransform(p, [0, 0.45, 1], [0, 0.9, 1]);
  const blurPx = useTransform(p, [0, 0.55, 1], [14, 1.5, 0]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  if (reduce) return <div className={className}>{children}</div>;

  return (
    // Perspective must live on the parent — applied to the moving element
    // itself, translateZ produces scaling with no actual depth cue.
    <div ref={ref} style={{ perspective: 1200 }} className={className}>
      <motion.div
        style={{
          z,
          rotateX,
          scale,
          opacity,
          filter,
          transformStyle: 'preserve-3d',
          transformOrigin: '50% 100%',
          willChange: 'transform, opacity, filter',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
