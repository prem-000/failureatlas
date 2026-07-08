import React from 'react';
import { LogoProps } from './logo.types';
import { LogoMark } from './LogoMark';
import { LogoWordmark } from './LogoWordmark';

export function Logo({
  variant = 'mark',
  size = 'md',
  animation = 'none',
  className = '',
  responsive = false,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  onClick,
  interactive = false,
}: LogoProps) {
  const isInteractive = !!onClick || interactive;

  // Decide if we should render mark or wordmark
  const isWordmark = variant === 'wordmark' || variant === 'stacked' || variant === 'compact';

  const logoElement = isWordmark ? (
    <LogoWordmark
      size={size}
      variant={variant}
      animation={animation}
      responsive={responsive}
      aria-hidden={isInteractive ? 'true' : ariaHidden} // Hide inside interactive button
    />
  ) : (
    <LogoMark
      size={size}
      animation={animation}
      responsive={responsive}
      aria-hidden={isInteractive ? 'true' : ariaHidden} // Hide inside interactive button
    />
  );

  if (isInteractive) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
      }
    };

    return (
      <button
        type="button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className="focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none rounded-lg p-1.5 flex items-center justify-center transition-all bg-transparent border-none cursor-pointer"
        style={{
          minWidth: 44,
          minHeight: 44,
          padding: 0,
          margin: 0,
        }}
        aria-label={ariaLabel || 'Praxis'}
      >
        {logoElement}
      </button>
    );
  }

  // Non-interactive / static wrapper
  return (
    <div className={`inline-block ${className}`}>
      {logoElement}
    </div>
  );
}

export default Logo;
