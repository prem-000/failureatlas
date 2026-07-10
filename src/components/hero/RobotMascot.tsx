'use client';

/**
 * src/components/hero/RobotMascot.tsx
 *
 * Renders the premium interactive 3D robot mascot using React Three Fiber.
 * Respects prefers-reduced-motion accessibility by disabling active animations.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import RobotMascotScene from './RobotMascotScene';

// ─── 2D Decorative Static Fallback for No-WebGL Environments ─────────────────
function FallbackVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#131313]/40 rounded-2xl overflow-hidden border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,106,61,0.06)_0%,transparent_70%)] pointer-events-none" />
      <svg className="w-2/3 h-2/3 max-w-[280px] text-zinc-700" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Pedestal Body */}
        <rect x="65" y="125" width="70" height="50" rx="8" fill="#1c1c1e" stroke="#2a2a2d" strokeWidth="2" />
        <line x1="65" y1="150" x2="135" y2="150" stroke="#0d0d0f" strokeWidth="2" />
        
        {/* Neck */}
        <rect x="94" y="105" width="12" height="20" rx="6" fill="#2a2a2d" />
        
        {/* Head */}
        <rect x="55" y="45" width="90" height="60" rx="10" fill="#1c1c1e" stroke="#2a2a2d" strokeWidth="2" />
        
        {/* Rim Glow */}
        <rect x="61" y="51" width="78" height="48" rx="6" stroke="#FF6A3D" strokeWidth="1.5" strokeOpacity="0.8" />
        
        {/* Screen Bezel */}
        <rect x="63" y="53" width="74" height="44" rx="5" fill="#0b0b0c" />
        
        {/* Eyes */}
        <circle cx="85" cy="75" r="4.5" fill="#FDFBF7" />
        <circle cx="115" cy="75" r="4.5" fill="#FDFBF7" />
      </svg>
    </div>
  );
}

// ─── Main Robot Mascot Canvas Component ───────────────────────────────────────
export default function RobotMascot() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const clickTimeRef = useRef<number>(0);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);

    // Basic WebGL compatibility check
    try {
      const canvas = document.createElement('canvas');
      const glSupported = !!(
        window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
      setHasWebGL(glSupported);
    } catch {
      setHasWebGL(false);
    }

    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only trigger interactive focus animation when motion is NOT reduced
    if (!reducedMotion) {
      // Set timestamp in seconds
      clickTimeRef.current = performance.now() / 1000;
    }
  };

  if (!hasWebGL) {
    return <FallbackVisual />;
  }

  return (
    <div 
      className="w-full h-full min-h-[300px] md:min-h-[450px] relative select-none cursor-pointer"
      onPointerDown={handlePointerDown}
    >
      {/* Subtle background radial glow to blend robot into the dark page */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,106,61,0.05)_0%,transparent_60%)] pointer-events-none" />

      <Canvas
        camera={{ position: [0, 0.2, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <RobotMascotScene 
          reducedMotion={reducedMotion} 
          clickTimeRef={clickTimeRef} 
        />
      </Canvas>
    </div>
  );
}
