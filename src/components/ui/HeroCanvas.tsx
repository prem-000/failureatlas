'use client';
/**
 * src/components/ui/HeroCanvas.tsx
 *
 * Renders a premium interactive 3D particle network representing a knowledge graph.
 * Fades out/disables automatically on devices that request prefers-reduced-motion.
 */

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ─── Points Cloud Particle System ─────────────────────────────────────────────
function ParticleNetwork() {
  const ref = useRef<THREE.Points>(null);
  
  // Create a sphere of particles
  const [positions, lineConnections] = useMemo(() => {
    const count = 120;
    const tempPositions = new Float32Array(count * 3);
    const radius = 2.8;

    for (let i = 0; i < count; i++) {
      // Golden spiral distribution on a sphere for beautiful spacing
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      tempPositions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
      tempPositions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      tempPositions[i * 3 + 2] = radius * Math.cos(phi);
    }

    // Generate indices for lines connecting close points
    const lines: THREE.Vector3[][] = [];
    const threshold = 1.2;

    for (let i = 0; i < count; i++) {
      const p1 = new THREE.Vector3(
        tempPositions[i * 3],
        tempPositions[i * 3 + 1],
        tempPositions[i * 3 + 2]
      );
      for (let j = i + 1; j < count; j++) {
        const p2 = new THREE.Vector3(
          tempPositions[j * 3],
          tempPositions[j * 3 + 1],
          tempPositions[j * 3 + 2]
        );
        if (p1.distanceTo(p2) < threshold) {
          lines.push([p1, p2]);
        }
      }
    }

    return [tempPositions, lines];
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    // Slow elegant rotation
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    ref.current.rotation.x = state.clock.getElapsedTime() * 0.03;
  });

  return (
    <group>
      {/* Dynamic line connections */}
      {lineConnections.slice(0, 80).map((endpoints, idx) => (
        <Line key={idx} start={endpoints[0]} end={endpoints[1]} />
      ))}

      {/* Interactive particles */}
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#ff5f52"
          size={0.06}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}

// ─── Connecting Line component ────────────────────────────────────────────────
function Line({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const ref = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      start.x, start.y, start.z,
      end.x, end.y, end.z,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [start, end]);

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial
        color="#3f3f46"
        transparent
        opacity={0.15}
        linewidth={1}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

// ─── 2D Decorative Fallback ───────────────────────────────────────────────────
function FallbackVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/20 rounded-2xl overflow-hidden border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,95,82,0.1)_0%,transparent_70%)] animate-pulse" />
      <svg className="w-4/5 h-4/5 max-w-sm text-primary/30" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
        <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" />
        <path d="M100 20 V180 M20 100 H180" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" />
        {/* Animated glowing nodes */}
        <circle cx="100" cy="50" r="4" fill="#ff5f52" className="animate-ping" style={{ transformOrigin: '100px 50px' }} />
        <circle cx="100" cy="50" r="3" fill="#ff5f52" />
        <circle cx="60" cy="120" r="3" fill="#a855f7" />
        <circle cx="140" cy="130" r="3" fill="#3b82f6" />
        <line x1="100" y1="50" x2="60" y2="120" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="60" y1="120" x2="140" y2="130" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="140" y1="130" x2="100" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  );
}

// ─── Main Exportable Canvas ───────────────────────────────────────────────────
export default function HeroCanvas() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);

    // Basic WebGL compatibility check
    try {
      const canvas = document.createElement('canvas');
      setHasWebGL(!!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))));
    } catch {
      setHasWebGL(false);
    }

    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  if (reducedMotion || !hasWebGL) {
    return <FallbackVisual />;
  }

  return (
    <div className="w-full h-full min-h-[300px] md:min-h-[450px] relative select-none">
      {/* Background glow behind 3D render */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,95,82,0.06)_0%,transparent_60%)] pointer-events-none" />
      
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <ParticleNetwork />
      </Canvas>
    </div>
  );
}
