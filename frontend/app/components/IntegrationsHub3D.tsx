'use client';

import React, { useMemo, useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 3D hub-and-spoke for the integrations section.
 *
 * A central InvoNest core with the ten connected services orbiting on a tilted
 * ring. Data "packets" travel the spokes inward to visualise the sync. Replaces
 * the flat SVG version — same integrations, same brand palette.
 */

const BRAND_DARK = '#0d2227';
const BRAND_BLUE = '#abc6d8';

interface Node {
  name: string;
  desc: string;
  short: string;
  color: string;
  /** Optional real logo at /logos/<slug>.png — used automatically when present. */
  slug: string;
}

/** Brand colours are the official ones so the tiles read correctly at a glance. */
const NODES: Node[] = [
  { name: 'Gmail',      desc: 'Emails & Alerts',   short: 'M',  color: '#ea4335', slug: 'gmail' },
  { name: 'Stripe',     desc: 'Payments',          short: 'S',  color: '#635bff', slug: 'stripe' },
  { name: 'Razorpay',   desc: 'Payments',          short: 'R',  color: '#0c2451', slug: 'razorpay' },
  { name: 'HubSpot',    desc: 'CRM Sync',          short: 'H',  color: '#ff7a59', slug: 'hubspot' },
  { name: 'Salesforce', desc: 'CRM Sync',          short: 'SF', color: '#00a1e0', slug: 'salesforce' },
  { name: 'Zoho Books', desc: 'Accounting Sync',   short: 'Z',  color: '#e42527', slug: 'zoho' },
  { name: 'QuickBooks', desc: 'Accounting Sync',   short: 'qb', color: '#2ca01c', slug: 'quickbooks' },
  { name: 'Slack',      desc: 'Notifications',     short: '',   color: '#4a154b', slug: 'slack' },
  { name: 'Outlook',    desc: 'Emails & Calendar', short: 'O',  color: '#0078d4', slug: 'outlook' },
  { name: 'Xero',       desc: 'Accounting Sync',   short: 'X',  color: '#13b5ea', slug: 'xero' },
];

/**
 * Builds a logo tile texture on a canvas: white face, brand mark in the brand
 * colour. Slack gets its actual pinwheel (simple enough to draw faithfully);
 * the rest use their letter mark, which is what integration grids normally show
 * when official SVGs aren't bundled.
 *
 * Drop a real logo at /logos/<slug>.png and it replaces this automatically.
 */
function makeLogoTexture(node: Node): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);

  if (node.slug === 'slack') {
    // Slack's four-bar pinwheel.
    const bar = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, Math.min(w, h) / 2);
      ctx.fill();
    };
    const t = 30, len = 92, mid = S / 2;
    bar(mid - len / 2, mid - t * 2.1, len, t, '#36c5f0');
    bar(mid + t * 1.1, mid - len / 2, t, len, '#2eb67d');
    bar(mid - len / 2, mid + t * 1.1, len, t, '#ecb22e');
    bar(mid - t * 2.1, mid - len / 2, t, len, '#e01e5a');
  } else {
    ctx.fillStyle = node.color;
    ctx.font = `bold ${node.short.length > 1 ? 96 : 132}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.short, S / 2, S / 2 + 6);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const RADIUS = 4.2;

function positionFor(i: number, total: number): THREE.Vector3 {
  const a = (i / total) * Math.PI * 2;
  // Gentle vertical wave so the ring reads as a 3D orbit, not a flat disc.
  return new THREE.Vector3(Math.cos(a) * RADIUS, Math.sin(a * 2) * 0.55, Math.sin(a) * RADIUS);
}

/** Pulsing core representing InvoNest itself. */
function Core() {
  const mesh = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.y = t * 0.25;
      mesh.current.rotation.x = Math.sin(t * 0.4) * 0.12;
    }
    if (halo.current) {
      const s = 1 + Math.sin(t * 1.6) * 0.06;
      halo.current.scale.setScalar(s);
      (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(t * 1.6) * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.25, 1]} />
        <meshStandardMaterial
          color={BRAND_DARK}
          metalness={0.85}
          roughness={0.18}
          emissive={BRAND_BLUE}
          emissiveIntensity={0.35}
          flatShading
        />
      </mesh>

      <mesh ref={halo}>
        <sphereGeometry args={[1.75, 32, 32]} />
        <meshBasicMaterial color={BRAND_BLUE} transparent opacity={0.16} side={THREE.BackSide} />
      </mesh>

      <Html center distanceFactor={11} zIndexRange={[10, 0]}>
        <div className="pointer-events-none select-none text-center">
          <div className="text-[11px] font-extrabold tracking-tight text-white drop-shadow-lg">InvoNest</div>
          <div className="text-[8px] font-mono uppercase tracking-wider text-white/70">AI Hub</div>
        </div>
      </Html>
    </group>
  );
}

/** One integration node plus its spoke back to the core. */
function IntegrationNode({
  node,
  index,
  total,
  onHover,
}: {
  node: Node;
  index: number;
  total: number;
  onHover: (n: Node | null) => void;
}) {
  const pos = useMemo(() => positionFor(index, total), [index, total]);
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Canvas-drawn mark by default; swapped for /logos/<slug>.png if that exists.
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  React.useEffect(() => {
    const generated = makeLogoTexture(node);
    setTex(generated);

    let cancelled = false;
    new THREE.TextureLoader().load(
      `/logos/${node.slug}.png`,
      (real) => {
        if (cancelled) return;
        real.colorSpace = THREE.SRGBColorSpace;
        real.anisotropy = 4;
        setTex(real);
        generated.dispose();
      },
      undefined,
      () => {
        /* no real logo bundled — keep the generated tile */
      },
    );
    return () => {
      cancelled = true;
    };
  }, [node]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.y = t * 0.5 + index;
      const s = hovered ? 1.35 : 1;
      mesh.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
    }
  });

  return (
    <group position={pos}>
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.5}>
        <RoundedBox
          ref={mesh}
          args={[0.85, 0.85, 0.85]}
          radius={0.14}
          smoothness={4}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            onHover(node);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            onHover(null);
            document.body.style.cursor = 'auto';
          }}
        >
          <meshStandardMaterial
            map={tex ?? undefined}
            color={tex ? '#ffffff' : node.color}
            metalness={0.15}
            roughness={0.35}
            emissive={node.color}
            emissiveIntensity={hovered ? 0.45 : 0.12}
          />
        </RoundedBox>

        <Html center distanceFactor={13} zIndexRange={[5, 0]}>
          <div className="pointer-events-none select-none text-center whitespace-nowrap">
            <div className="text-[10px] font-bold text-[#0d2227] dark:text-white drop-shadow">{node.name}</div>
            <div className="text-[7px] font-mono uppercase tracking-wide text-zinc-500 dark:text-white/60">
              {node.desc}
            </div>
          </div>
        </Html>
      </Float>
    </group>
  );
}

/** Spoke line from core to a node, with a packet travelling inward. */
function Spoke({ index, total, color }: { index: number; total: number; color: string }) {
  const target = useMemo(() => positionFor(index, total), [index, total]);
  const packet = useRef<THREE.Mesh>(null);
  const offset = useMemo(() => Math.random(), []);

  useFrame(({ clock }) => {
    if (!packet.current) return;
    // 0 -> 1 travels outward; invert so data flows INTO the hub.
    const p = ((clock.getElapsedTime() * 0.35 + offset) % 1);
    const v = target.clone().multiplyScalar(1 - p);
    packet.current.position.copy(v);
    const m = packet.current.material as THREE.MeshBasicMaterial;
    // Fade at both ends so packets don't pop in and out.
    m.opacity = Math.sin(p * Math.PI) * 0.95;
  });

  return (
    <group>
      <Line
        points={[[0, 0, 0], [target.x, target.y, target.z]]}
        color={BRAND_BLUE}
        lineWidth={1}
        transparent
        opacity={0.28}
      />
      <mesh ref={packet}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

/** Slow auto-orbit that also leans toward the pointer. */
function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.12;
    // Ease toward a pointer-driven tilt rather than snapping.
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -pointer.y * 0.28 + 0.18,
      0.05,
    );
  });

  return <group ref={group}>{children}</group>;
}

function Scene({ onHover }: { onHover: (n: Node | null) => void }) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 8, 5]} intensity={1.1} />
      <pointLight position={[-6, -4, -6]} intensity={0.8} color={BRAND_BLUE} />

      <Rig>
        <Core />
        {NODES.map((n, i) => (
          <Spoke key={`spoke-${n.name}`} index={i} total={NODES.length} color={n.color} />
        ))}
        {NODES.map((n, i) => (
          <IntegrationNode key={n.name} node={n} index={i} total={NODES.length} onHover={onHover} />
        ))}
      </Rig>
    </>
  );
}

export default function IntegrationsHub3D() {
  const [hovered, setHovered] = useState<Node | null>(null);

  // This scene sits well below the fold, but a Canvas renders every frame
  // regardless of whether it's on screen. Left running it competes with the
  // hero's video decoder for the GPU — measured at 52% dropped video frames.
  // Parking the render loop while off-screen costs nothing visually: there is
  // by definition no one looking at it.
  const shellRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      // Spin up slightly before it scrolls in, so the first visible frame is
      // already animating rather than snapping from a cold start.
      { rootMargin: '200px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={shellRef}
      className="relative w-full max-w-5xl mx-auto h-[600px] border border-[#0d2227]/10 rounded-3xl bg-[#abc6d8]/5 overflow-hidden shadow-sm"
    >
      <Canvas
        camera={{ position: [0, 2.4, 11], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={onScreen ? 'always' : 'never'}
      >
        <Suspense fallback={null}>
          <Scene onHover={setHovered} />
        </Suspense>
      </Canvas>

      {/* Hover readout, rendered in DOM rather than in-scene so it stays crisp. */}
      <div className="absolute left-5 bottom-5 pointer-events-none">
        <div
          className={`transition-all duration-300 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        >
          <div className="bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md border border-[#0d2227]/15 rounded-xl px-3.5 py-2.5 shadow-lg">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: hovered?.color ?? 'transparent' }}
              />
              <span className="text-xs font-extrabold text-[#0d2227] dark:text-white">
                {hovered?.name ?? ''}
              </span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wide text-zinc-500 dark:text-white/60">
              {hovered?.desc ?? ''}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute right-5 bottom-5 pointer-events-none">
        <span className="text-[9px] font-mono uppercase tracking-wider text-[#0d2227]/40 dark:text-white/40">
          Drag-free orbit · hover a node
        </span>
      </div>
    </div>
  );
}
