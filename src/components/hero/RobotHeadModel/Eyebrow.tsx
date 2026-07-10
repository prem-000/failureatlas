'use client';

import React, { forwardRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface EyebrowProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

export const Eyebrow = forwardRef<THREE.Group, EyebrowProps>(({ position, rotation, scale }, ref) => {
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      {/* 1. Shadow Layer (thin transparent dark mesh to simulate a contact shadow on the display) */}
      <RoundedBox 
        args={[0.22, 0.035, 0.001]} 
        radius={0.005} 
        position={[0, 0, -0.008]} 
        smoothness={4}
      >
        <meshBasicMaterial 
          color="#000000" 
          opacity={0.1} 
          transparent={true} 
          depthWrite={false} 
        />
      </RoundedBox>

      {/* 2. Orange Accent Glow (slightly larger mesh behind the black eyebrow) */}
      <RoundedBox 
        args={[0.235, 0.045, 0.015]} 
        radius={0.006} 
        position={[0, 0, -0.004]} 
        smoothness={4}
      >
        <meshStandardMaterial 
          color="#FF6A3D"
          emissive="#FF6A3D"
          emissiveIntensity={0.4}
          transparent={true}
          opacity={0.9}
        />
      </RoundedBox>

      {/* 3. Primary Bar (matte black metal, small thickness) */}
      <RoundedBox 
        args={[0.22, 0.035, 0.02]} 
        radius={0.005} 
        position={[0, 0, 0.01]} 
        smoothness={4}
      >
        <meshPhysicalMaterial 
          color="#090909"
          metalness={0.35}
          roughness={0.55}
          clearcoat={0.2}
        />
      </RoundedBox>
    </group>
  );
});

Eyebrow.displayName = 'Eyebrow';
export default Eyebrow;
