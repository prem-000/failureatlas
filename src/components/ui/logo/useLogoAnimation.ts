import { useState, useEffect } from 'react';
import { LogoAnimationMode } from './logo.types';

export function useLogoAnimation(initialMode: LogoAnimationMode = 'none') {
  const [animation, setAnimation] = useState<LogoAnimationMode>(initialMode);

  useEffect(() => {
    setAnimation(initialMode);
  }, [initialMode]);

  const triggerDraw = () => {
    setAnimation('draw');
    // The SVG sequential drawing completes in 1.7s, then we transition back to idle
    const timer = setTimeout(() => {
      setAnimation('idle');
    }, 1700);
    return () => clearTimeout(timer);
  };

  const triggerHover = () => {
    if (animation === 'none' || animation === 'idle') {
      setAnimation('hover');
    }
  };

  const endHover = () => {
    if (animation === 'hover') {
      setAnimation(initialMode === 'hover' ? 'idle' : initialMode);
    }
  };

  return {
    animation,
    setAnimation,
    triggerDraw,
    triggerHover,
    endHover,
  };
}
