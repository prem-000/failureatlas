'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface RobotHeadModelProps {
  reducedMotion: boolean;
  clickTimeRef: React.RefObject<number>;
}

export default function RobotHeadModel({ reducedMotion, clickTimeRef }: RobotHeadModelProps) {
  const headGroupRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Mesh>(null);
  const rimMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    if (!headGroupRef.current) return;

    if (reducedMotion) {
      // Static pose
      headGroupRef.current.rotation.set(0, 0, 0);
      headGroupRef.current.position.set(0, 0, 0);
      if (neckRef.current) {
        neckRef.current.rotation.set(0, 0, 0);
      }
      if (rimMaterialRef.current) {
        rimMaterialRef.current.emissiveIntensity = 1.2;
      }
      return;
    }

    // 1. Idle breathing and bobbing (very slow, subtle)
    const time = state.clock.getElapsedTime();
    const idleY = Math.sin(time * 1.5) * 0.015;
    const idleRotX = Math.sin(time * 0.8) * 0.012;
    const idleRotY = Math.cos(time * 0.6) * 0.01;

    // 2. Click interaction logic
    let clickFactor = 0;
    if (clickTimeRef.current && clickTimeRef.current > 0) {
      const elapsed = (performance.now() / 1000) - clickTimeRef.current;
      const duration = 1.5;

      if (elapsed < duration) {
        const t = elapsed / duration;
        // Asymmetric envelope: rise in first 15% (0.225s), decay in 85% (1.275s)
        if (t < 0.15) {
          const p = t / 0.15;
          clickFactor = p * p * (3 - 2 * p); // smoothstep
        } else {
          const p = (t - 0.15) / 0.85;
          clickFactor = 1 - p * p * (3 - 2 * p); // smoothstep
        }
      } else {
        // Clear clickTime when duration completes
        // We write to the mutable ref directly
        (clickTimeRef as React.MutableRefObject<number>).current = 0;
      }
    }

    // click effects on head position and tilt
    const clickOffsetZ = clickFactor * 0.10; // lean slightly forward
    const clickOffsetY = -clickFactor * 0.04;
    const clickRotX = clickFactor * 0.10; // tilt forward

    // 3. Pointer tracking (looking towards cursor)
    // state.pointer ranges from -1 to 1.
    // Clamp Y-axis (left-right) looking: max ~23 deg (0.4 rad)
    // Clamp X-axis (up-down) looking: max ~12 deg (0.2 rad)
    const targetPointerRotY = state.pointer.x * 0.40;
    const targetPointerRotX = -state.pointer.y * 0.20;

    // Target positions/rotations combining all factors
    const targetRotX = targetPointerRotX + idleRotX + clickRotX;
    const targetRotY = targetPointerRotY + idleRotY;
    const targetPosY = idleY + clickOffsetY;
    const targetPosZ = clickOffsetZ;

    // Smooth damping (no overshoot, Apple/Vercel quality)
    // Interpolation factor based on frame delta
    const lerpFactor = 1 - Math.exp(-6 * delta);

    // Apply rotations
    headGroupRef.current.rotation.x = THREE.MathUtils.lerp(headGroupRef.current.rotation.x, targetRotX, lerpFactor);
    headGroupRef.current.rotation.y = THREE.MathUtils.lerp(headGroupRef.current.rotation.y, targetRotY, lerpFactor);
    
    // Apply positions
    headGroupRef.current.position.y = THREE.MathUtils.lerp(headGroupRef.current.position.y, targetPosY, lerpFactor);
    headGroupRef.current.position.z = THREE.MathUtils.lerp(headGroupRef.current.position.z, targetPosZ, lerpFactor);

    // 4. Neck articulation follows the head with a lag and a smaller ratio
    if (neckRef.current) {
      const targetNeckRotX = headGroupRef.current.rotation.x * 0.35;
      const targetNeckRotY = headGroupRef.current.rotation.y * 0.35;
      neckRef.current.rotation.x = THREE.MathUtils.lerp(neckRef.current.rotation.x, targetNeckRotX, lerpFactor);
      neckRef.current.rotation.y = THREE.MathUtils.lerp(neckRef.current.rotation.y, targetNeckRotY, lerpFactor);
    }

    // 5. Emissive intensity pulse
    if (rimMaterialRef.current) {
      // Normal intensity: 1.2, pulses to 3.8
      rimMaterialRef.current.emissiveIntensity = 1.2 + clickFactor * 2.6;
    }
  });

  return (
    <group position={[0, 0.4, 0]}>
      {/* Robot Body (Pedestal) */}
      <RoundedBox args={[1.5, 1.2, 1.2]} radius={0.1} position={[0, -1.3, 0]} smoothness={4}>
        <meshStandardMaterial 
          color="#1c1c1e" 
          metalness={0.75} 
          roughness={0.35} 
        />
      </RoundedBox>

      {/* Premium Minimal Panel Seam on Body */}
      <mesh position={[0, -1.3, 0]}>
        <boxGeometry args={[1.51, 0.02, 1.21]} />
        <meshBasicMaterial color="#0d0d0f" />
      </mesh>

      {/* Neck (Short Articulating Capsule) */}
      <mesh ref={neckRef} position={[0, -0.6, 0]}>
        <capsuleGeometry args={[0.08, 0.25, 8, 16]} />
        <meshStandardMaterial 
          color="#2a2a2d" 
          metalness={0.7} 
          roughness={0.4} 
        />
      </mesh>

      {/* Head Group (Bobbing, rotating, leaning) */}
      <group ref={headGroupRef}>
        {/* Main Head Box */}
        <RoundedBox args={[1.6, 1.2, 1.0]} radius={0.14} smoothness={4}>
          <meshStandardMaterial 
            color="#1c1c1e" 
            metalness={0.75} 
            roughness={0.35} 
          />
        </RoundedBox>

        {/* Coral Emissive Screen Rim */}
        <RoundedBox args={[1.42, 1.02, 0.04]} radius={0.08} position={[0, 0, 0.49]} smoothness={4}>
          <meshStandardMaterial
            ref={rimMaterialRef}
            color="#FF6A3D"
            emissive="#FF6A3D"
            emissiveIntensity={1.2}
          />
        </RoundedBox>

        {/* Screen Glass Bezel */}
        <RoundedBox args={[1.38, 0.98, 0.02]} radius={0.07} position={[0, 0, 0.51]} smoothness={4}>
          <meshStandardMaterial 
            color="#0b0b0c" 
            metalness={0.5} 
            roughness={0.45} 
          />
        </RoundedBox>

        {/* Circular Eyes (warm off-white) */}
        {/* Left Eye */}
        <mesh position={[-0.32, 0.02, 0.522]}>
          <sphereGeometry args={[0.07, 32, 32]} />
          <meshStandardMaterial
            color="#FDFBF7"
            emissive="#FDFBF7"
            emissiveIntensity={1.2}
            roughness={0.15}
          />
        </mesh>

        {/* Right Eye */}
        <mesh position={[0.32, 0.02, 0.522]}>
          <sphereGeometry args={[0.07, 32, 32]} />
          <meshStandardMaterial
            color="#FDFBF7"
            emissive="#FDFBF7"
            emissiveIntensity={1.2}
            roughness={0.15}
          />
        </mesh>
      </group>
    </group>
  );
}
