'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { Eyebrow } from './Eyebrow';

interface EyebrowRigProps {
  // Can be extended with other props in the future
}

export interface EyebrowRigRef {
  leftEyebrowRef: React.RefObject<THREE.Group | null>;
  rightEyebrowRef: React.RefObject<THREE.Group | null>;
}

export const EyebrowRig = forwardRef<EyebrowRigRef, EyebrowRigProps>((props, ref) => {
  const leftEyebrowRef = useRef<THREE.Group>(null);
  const rightEyebrowRef = useRef<THREE.Group>(null);

  useImperativeHandle(ref, () => ({
    leftEyebrowRef,
    rightEyebrowRef,
  }));

  return (
    <group name="EyebrowRig">
      {/* Left Eyebrow (centered above the left eye which is at x = -0.32, y = 0.02, z = 0.522) */}
      <Eyebrow 
        ref={leftEyebrowRef} 
        position={[-0.32, 0.18, 0.52]} 
      />

      {/* Right Eyebrow (centered above the right eye which is at x = 0.32, y = 0.02, z = 0.522) */}
      <Eyebrow 
        ref={rightEyebrowRef} 
        position={[0.32, 0.18, 0.52]} 
      />
    </group>
  );
});

EyebrowRig.displayName = 'EyebrowRig';
export default EyebrowRig;
