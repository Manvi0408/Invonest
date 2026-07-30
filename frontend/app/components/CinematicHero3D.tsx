'use client';

import React, { useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Html, Float } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Real-time cinematic hero: dark studio, a phone on a reflective floor, and
 * Liquid Glass panels that physically emerge from the display, hold, then
 * dissolve back before the next one appears.
 *
 * Runs the beat sequence on a clock rather than scroll so the hero performs on
 * its own, the way a launch film would. One panel is on screen at a time —
 * matching the "never show everything together" instruction.
 */

const BLUE = '#4da3ff';
const GOLD = '#f0b866';
const GREEN = '#34d399';

/** Beat timeline (seconds). The loop restarts after the last beat. */
const BEATS = [
  { at: 0.0, id: 'reveal' },
  { at: 3.0, id: 'whatsapp' },
  { at: 7.0, id: 'payment' },
  { at: 10.5, id: 'dso' },
  { at: 13.0, id: 'aging' },
  { at: 15.5, id: 'outstanding' },
  { at: 18.5, id: 'logo' },
];
const LOOP = 22;

function beatAt(t: number): string {
  let cur = BEATS[0].id;
  for (const b of BEATS) if (t >= b.at) cur = b.id;
  return cur;
}

/** 0→1 emergence curve for a panel: rises, holds, then collapses. */
function panelProgress(t: number, start: number, hold: number): number {
  const inDur = 0.65;
  const outDur = 0.55;
  if (t < start) return 0;
  if (t < start + inDur) return easeOutCubic((t - start) / inDur);
  if (t < start + inDur + hold) return 1;
  if (t < start + inDur + hold + outDur) return 1 - easeInCubic((t - start - inDur - hold) / outDur);
  return 0;
}
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x: number) => x * x * x;

/** The device: body, screen, camera bump, metallic rail. */
function Phone({ tRef }: { tRef: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const screen = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = tRef.current;
    if (!group.current) return;

    // Scene 1: drop + settle. Scene 3 onward: lift and stand vertical.
    const dropped = Math.min(1, t / 1.6);
    const lifted = t > 2.4 ? Math.min(1, (t - 2.4) / 1.2) : 0;

    group.current.position.y = THREE.MathUtils.lerp(2.6, 0, easeOutCubic(dropped)) + lifted * 0.55;
    group.current.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2.15, 0, easeOutCubic(lifted));
    group.current.rotation.y = Math.sin(t * 0.28) * 0.16;

    if (screen.current) {
      const m = screen.current.material as THREE.MeshStandardMaterial;
      // Screen wakes as the phone stands up, and pulses on each beat change.
      m.emissiveIntensity = 0.15 + lifted * 0.55 + Math.max(0, Math.sin(t * 2.2)) * 0.12;
    }
  });

  return (
    <group ref={group}>
      {/* Aluminium body */}
      <RoundedBox args={[1.55, 3.15, 0.16]} radius={0.22} smoothness={8}>
        <meshStandardMaterial color="#15171b" metalness={0.95} roughness={0.22} />
      </RoundedBox>

      {/* Display */}
      <mesh ref={screen} position={[0, 0, 0.086]}>
        <planeGeometry args={[1.4, 3.0]} />
        <meshStandardMaterial
          color="#05070a"
          emissive={BLUE}
          emissiveIntensity={0.15}
          metalness={0.4}
          roughness={0.12}
        />
      </mesh>

      {/* Dynamic-island cutout */}
      <mesh position={[0, 1.28, 0.092]}>
        <capsuleGeometry args={[0.055, 0.2, 4, 12]} />
        <meshStandardMaterial color="#000000" roughness={0.3} />
      </mesh>

      {/* Rear camera bump */}
      <group position={[-0.42, 1.02, -0.13]}>
        <RoundedBox args={[0.62, 0.62, 0.07]} radius={0.17} smoothness={6}>
          <meshStandardMaterial color="#1b1e23" metalness={0.9} roughness={0.3} />
        </RoundedBox>
        {[[-0.13, 0.13], [0.13, -0.13]].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.05]}>
            <cylinderGeometry args={[0.11, 0.11, 0.05, 24]} />
            <meshStandardMaterial color="#0b0d10" metalness={1} roughness={0.08} />
          </mesh>
        ))}
      </group>

      {/* Side buttons */}
      {[0.55, 0.15, -0.3].map((y, i) => (
        <mesh key={i} position={[-0.79, y, 0]}>
          <boxGeometry args={[0.03, i === 0 ? 0.34 : 0.24, 0.08]} />
          <meshStandardMaterial color="#2a2e34" metalness={0.95} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

interface PanelProps {
  tRef: React.MutableRefObject<number>;
  start: number;
  hold: number;
  position: [number, number, number];
  width: number;
  height: number;
  accent: string;
  children: React.ReactNode;
}

/** A Liquid Glass slab that emerges from the phone, holds, then collapses back. */
function GlassPanel({ tRef, start, hold, position, width, height, accent, children }: PanelProps) {
  const group = useRef<THREE.Group>(null);
  const [visible, setVisible] = useState(false);

  useFrame(() => {
    const t = tRef.current;
    const p = panelProgress(t, start, hold);
    if (!group.current) return;

    const showing = p > 0.001;
    if (showing !== visible) setVisible(showing);

    // Travels out of the screen plane toward camera as it materialises.
    group.current.position.set(
      position[0] * p,
      position[1] * p,
      THREE.MathUtils.lerp(0.1, position[2], p),
    );
    group.current.scale.setScalar(0.35 + p * 0.65);
    group.current.rotation.y = (1 - p) * -0.7 + Math.sin(t * 0.5) * 0.04;
    group.current.rotation.x = Math.sin(t * 0.4) * 0.03;

    group.current.visible = showing;
    const mat = (group.current.children[0] as THREE.Mesh)?.material as THREE.MeshPhysicalMaterial;
    if (mat) mat.opacity = 0.30 * p;
  });

  return (
    <group ref={group}>
      <RoundedBox args={[width, height, 0.06]} radius={0.09} smoothness={6}>
        <meshPhysicalMaterial
          color="#dff1ff"
          transparent
          opacity={0.3}
          roughness={0.12}
          metalness={0}
          transmission={0.85}
          thickness={0.5}
          ior={1.4}
          clearcoat={1}
          clearcoatRoughness={0.15}
          emissive={accent}
          emissiveIntensity={0.10}
        />
      </RoundedBox>

      {visible && (
        <Html
          center
          transform
          distanceFactor={2.6}
          position={[0, 0, 0.05]}
          zIndexRange={[20, 0]}
          style={{ width: `${width * 118}px`, pointerEvents: 'none' }}
        >
          {children}
        </Html>
      )}
    </group>
  );
}

/** Drifting studio dust. */
function Particles({ count = 320 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 16;
      a[i * 3 + 1] = (Math.random() - 0.5) * 10;
      a[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    return a;
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.016;
      ref.current.position.y = Math.sin(clock.getElapsedTime() * 0.18) * 0.35;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#cfe6ff" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Advances the shared clock and loops the sequence. */
function Clock({ tRef }: { tRef: React.MutableRefObject<number> }) {
  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta) % LOOP;
  });
  return null;
}

const card = 'rounded-2xl px-3 py-2.5 text-white';
const glassCss: React.CSSProperties = {
  background: 'rgba(255,255,255,0.10)',
  backdropFilter: 'blur(14px) saturate(160%)',
  WebkitBackdropFilter: 'blur(14px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.26)',
  boxShadow: '0 10px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)',
  textShadow: '0 1px 4px rgba(0,0,0,0.7)',
};

function Scene() {
  const tRef = useRef(0);

  return (
    <>
      <Clock tRef={tRef} />

      <ambientLight intensity={0.28} />
      <spotLight position={[0, 7, 5]} angle={0.6} penumbra={1} intensity={2.4} color="#ffffff" />
      <pointLight position={[-5, 1.5, 3]} intensity={3.2} color={BLUE} />
      <pointLight position={[5, -1, 2]} intensity={2.2} color={GOLD} />
      <pointLight position={[0, 0, 3]} intensity={1.2} color={BLUE} />

      <Particles />

      <Float speed={1.1} rotationIntensity={0.06} floatIntensity={0.28}>
        <Phone tRef={tRef} />
      </Float>

      {/* Scene 4 — WhatsApp reminder */}
      <GlassPanel tRef={tRef} start={3.0} hold={2.6} position={[-2.5, 0.7, 1.6]} width={2.5} height={1.5} accent={GREEN}>
        <div className={card} style={glassCss}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">WhatsApp Reminder</span>
            <span className="text-[8px] font-mono text-white/60">InvoNest</span>
          </div>
          <div className="text-[17px] font-extrabold leading-none mb-1">₹1,20,000</div>
          <p className="text-[9px] leading-snug text-white/85">
            Hi Manvi, your invoice #1042 is 7 days overdue. Here&apos;s your payment link — under 2 minutes.
          </p>
          <div className="text-[8px] font-mono mt-1 text-emerald-300">pay.invonest.com/1042</div>
        </div>
      </GlassPanel>

      {/* Scene 5 — Payment received */}
      <GlassPanel tRef={tRef} start={7.0} hold={2.2} position={[2.4, 0.9, 1.6]} width={2.4} height={1.35} accent={GREEN}>
        <div className={card} style={{ ...glassCss, border: '1px solid rgba(52,211,153,0.45)' }}>
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">Payment Received</span>
          <div className="text-[19px] font-extrabold leading-none my-1">₹1,20,000</div>
          <p className="text-[9px] text-white/85 leading-snug">
            Customer clicked the link. Payment completed successfully.
          </p>
        </div>
      </GlassPanel>

      {/* Scene 6 — analytics, one at a time */}
      <GlassPanel tRef={tRef} start={10.5} hold={1.7} position={[-2.6, -0.5, 1.5]} width={2.3} height={1.35} accent={BLUE}>
        <div className={card} style={glassCss}>
          <span className="text-[8px] font-bold uppercase tracking-wider text-white/70">Days Sales Outstanding</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-[20px] font-extrabold leading-none">26</span>
            <span className="text-[9px] text-white/70">days</span>
            <span className="text-[8px] font-bold text-emerald-300">↘ −9</span>
          </div>
          <div className="flex items-end gap-1 h-6">
            {[70, 58, 44, 52, 36].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 4 ? GREEN : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel tRef={tRef} start={13.0} hold={1.7} position={[2.6, -0.4, 1.5]} width={2.3} height={1.35} accent={BLUE}>
        <div className={card} style={glassCss}>
          <span className="text-[8px] font-bold uppercase tracking-wider text-white/70">Aging Balance</span>
          <div className="flex items-end gap-2 h-8 mt-2">
            {[38, 62, 96].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 2 ? BLUE : 'rgba(255,255,255,0.22)' }} />
            ))}
          </div>
          <div className="flex justify-between text-[7px] font-mono text-white/60 mt-1">
            <span>₹2.00L</span><span>₹4.00L</span>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel tRef={tRef} start={15.5} hold={2.0} position={[0, 1.5, 1.7]} width={2.4} height={1.15} accent={GOLD}>
        <div className={card} style={glassCss}>
          <span className="text-[8px] font-bold uppercase tracking-wider text-white/70">Outstanding Revenue</span>
          <div className="text-[22px] font-extrabold leading-none my-1">₹3.35L</div>
          <span className="text-[8px] text-white/70">Unpaid invoices</span>
          <div className="h-0.5 mt-1.5 rounded-full" style={{ background: BLUE }} />
        </div>
      </GlassPanel>
    </>
  );
}

export default function CinematicHero3D() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas camera={{ position: [0, 0.4, 7.6], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* Volumetric haze + vignette, cheaper as DOM than in-scene fog. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 45%, rgba(77,163,255,0.10) 0%, transparent 70%), radial-gradient(ellipse at 50% 100%, rgba(240,184,102,0.08) 0%, transparent 60%), linear-gradient(to bottom, rgba(3,6,10,0.55) 0%, rgba(3,6,10,0.15) 40%, rgba(3,6,10,0.75) 100%)',
        }}
      />
    </div>
  );
}
