import React from 'react';

interface LogoAnimationWrapperProps {
  mode: string;
  children: React.ReactNode;
  className?: string;
}

export function LogoAnimation({ mode, children, className = '' }: LogoAnimationWrapperProps) {
  // Provides a target wrapper for Framer Motion, GSAP, or additional CSS state definitions.
  return (
    <div className={`logo-animation-container anim-${mode} ${className}`}>
      {children}
    </div>
  );
}
export default LogoAnimation;
