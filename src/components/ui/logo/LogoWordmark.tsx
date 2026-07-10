import React from 'react';
import { LogoBaseProps } from './logo.types';
import { LogoMark } from './LogoMark';

interface LogoWordmarkProps extends LogoBaseProps {
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

const fontScaleClasses: Record<string, string> = {
  xs: 'text-xs tracking-tight',
  sm: 'text-sm font-semibold tracking-tight',
  md: 'text-base font-bold tracking-tight',
  lg: 'text-xl font-bold tracking-tight',
  xl: 'text-2xl font-extrabold tracking-tight',
  hero: 'text-5xl font-extrabold tracking-tighter',
};

export function LogoWordmark({
  size = 'md',
  variant = 'wordmark',
  animation = 'none',
  className = '',
  responsive = false,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
}: LogoWordmarkProps) {
  const isHidden = ariaHidden !== undefined ? ariaHidden : !ariaLabel;

  // Decide layout classes based on variants
  const isStacked = variant === 'stacked';
  const isCompact = variant === 'compact';
  
  const containerClasses = [
    'inline-flex select-none',
    isStacked ? 'flex-col items-center text-center' : 'flex-row items-center',
    isCompact ? 'gap-1.5' : (isStacked ? 'gap-2' : 'gap-3'),
    className,
  ].filter(Boolean).join(' ');

  // Get text size styling based on size preset
  const textClass = typeof size === 'string' && size in fontScaleClasses
    ? fontScaleClasses[size]
    : 'text-lg font-bold tracking-tight';

  // Manual fallback style for numeric size
  const textStyle: React.CSSProperties = typeof size === 'number'
    ? { fontSize: `${Math.round(size * 0.75)}px`, lineHeight: 1 }
    : { lineHeight: 1 };

  return (
    <div
      className={containerClasses}
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      aria-hidden={isHidden}
    >
      <LogoMark
        size={size}
        animation={animation}
        responsive={responsive}
        aria-hidden="true" // Sub-component is decorative within parent group
      />
      <span
        className={`text-foreground font-sans ${textClass}`}
        style={textStyle}
      >
        Praxis
      </span>
    </div>
  );
}
