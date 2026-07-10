'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import RobotHeadModel from './RobotHeadModel';

interface RobotMascotSceneProps {
  reducedMotion: boolean;
  clickTimeRef: React.RefObject<number>;
}

export default function RobotMascotScene({ reducedMotion, clickTimeRef }: RobotMascotSceneProps) {
  useFrame((state, delta) => {
    if (reducedMotion) {
      // Locked camera pose
      state.camera.position.set(0, 0.2, 5);
      state.camera.lookAt(0, 0.2, 0);
      return;
    }

    // 1. Calculate click interpolation factor (camera zoom effect)
    let clickFactor = 0;
    if (clickTimeRef.current && clickTimeRef.current > 0) {
      const elapsed = (performance.now() / 1000) - clickTimeRef.current;
      const duration = 1.5;

      if (elapsed < duration) {
        const t = elapsed / duration;
        // Asymmetric envelope matches RobotHeadModel
        if (t < 0.15) {
          const p = t / 0.15;
          clickFactor = p * p * (3 - 2 * p);
        } else {
          const p = (t - 0.15) / 0.85;
          clickFactor = 1 - p * p * (3 - 2 * p);
        }
      }
    }

    // Camera target positions
    const targetZ = 5.0 - clickFactor * 0.45; // Camera zooms in slightly
    const targetY = 0.2 + clickFactor * 0.08; // Camera rises slightly

    const lerpFactor = 1 - Math.exp(-6 * delta);

    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, lerpFactor);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, lerpFactor);

    // Dynamic camera lookAt
    const targetLookAtY = 0.25 - clickFactor * 0.05;
    const tempLookAt = new THREE.Vector3(0, targetLookAtY, 0);
    state.camera.lookAt(tempLookAt);
  });

  return (
    <>
      {/* ─── Lighting Setup ─────────────────────────────────────────────────── */}
      {/* Soft overall environment fill */}
      <hemisphereLight 
        color="#3a3a42" 
        groundColor="#0e0e11" 
        intensity={1.0} 
      />

      {/* Main warm soft key/fill light */}
      <directionalLight 
        position={[4, 5, 3]} 
        intensity={1.4} 
        color="#fff5e6" 
      />

      {/* Main Coral Rim Light from behind the robot */}
      <directionalLight 
        position={[-5, 4, -8]} 
        intensity={3.2} 
        color="#FF6A3D" 
      />

      {/* Frontal subtle soft glow */}
      <pointLight 
        position={[0, 1.5, 3.5]} 
        intensity={0.6} 
        color="#ffffff" 
        decay={2}
      />

      {/* ─── Ground & Shadows ──────────────────────────────────────────────── */}
      {/* Floor surface matching the studio look */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.91, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial 
          color="#0f0f11" 
          roughness={0.95} 
          metalness={0.05} 
        />
      </mesh>

      {/* Premium ambient contact shadow under the robot body */}
      <ContactShadows
        position={[0, -1.9, 0]}
        opacity={0.68}
        scale={7}
        blur={2.6}
        far={3.0}
      />

      {/* ─── Robot Mascot Model ────────────────────────────────────────────── */}
      <RobotHeadModel 
        reducedMotion={reducedMotion} 
        clickTimeRef={clickTimeRef} 
      />
    </>
  );
}
