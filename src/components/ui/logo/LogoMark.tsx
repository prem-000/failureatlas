import React from 'react';
import { LogoMarkProps } from './logo.types';
import { getLogoSize } from './logo.constants';

export function LogoMark({
  size = 'md',
  animation = 'none',
  className = '',
  responsive = false,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  tabIndex,
  role,
}: LogoMarkProps) {
  const pixelSize = getLogoSize(size);
  const isHidden = ariaHidden !== undefined ? ariaHidden : !ariaLabel;

  // Layout sizing
  const width = responsive ? '100%' : pixelSize;
  const height = responsive ? '100%' : pixelSize;

  // Animation CSS
  const getAnimationStyles = () => {
    if (animation === 'none') return '';
    return `
      /* --- Idle Animation (Breathe Core) --- */
      @keyframes core-breathe {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.4); opacity: 1; }
      }
      .anim-idle #praxis-core {
        animation: core-breathe 2.5s ease-in-out infinite;
        transform-origin: 140px 110px;
      }

      /* --- Hover Animation (Ring & Core Pulse) --- */
      @keyframes ring-expand {
        0%, 100% { transform: scale(1); opacity: 0.2; }
        50% { transform: scale(1.15); opacity: 0.35; }
      }
      .anim-hover #praxis-ring {
        animation: ring-expand 1.8s ease-in-out infinite;
        transform-origin: 140px 110px;
      }
      .anim-hover #praxis-core {
        animation: core-breathe 1.2s ease-in-out infinite;
        transform-origin: 140px 110px;
      }

      /* --- Draw Animation (Draw Strokes Sequentially) --- */
      @keyframes draw-stroke {
        to { stroke-dashoffset: 0; }
      }
      @keyframes fade-core-ring {
        from { opacity: 0; transform: scale(0.5); }
        to { opacity: 1; transform: scale(1); }
      }

      .anim-draw #praxis-stroke-top {
        stroke-dasharray: 60;
        stroke-dashoffset: 60;
        animation: draw-stroke 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .anim-draw #praxis-stroke-curve {
        stroke-dasharray: 160;
        stroke-dashoffset: 160;
        animation: draw-stroke 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
      }
      .anim-draw #praxis-stroke-mid {
        stroke-dasharray: 30;
        stroke-dashoffset: 30;
        animation: draw-stroke 0.2s cubic-bezier(0.4, 0, 0.2, 1) 0.8s forwards;
      }
      .anim-draw #praxis-stroke-vertical {
        stroke-dasharray: 40;
        stroke-dashoffset: 40;
        animation: draw-stroke 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.9s forwards;
      }
      .anim-draw #praxis-stroke-bottom {
        stroke-dasharray: 30;
        stroke-dashoffset: 30;
        animation: draw-stroke 0.2s cubic-bezier(0.4, 0, 0.2, 1) 1.1s forwards;
      }
      .anim-draw #praxis-core-group,
      .anim-draw #praxis-ring-group {
        opacity: 0;
        animation: fade-core-ring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s forwards;
        transform-origin: 140px 110px;
      }
    `;
  };

  const animationClass = animation !== 'none' ? `anim-${animation}` : '';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animationClass}`}
      role={ariaLabel ? role || 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={isHidden}
      tabIndex={tabIndex}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        aspectRatio: '1 / 1',
        pointerEvents: isHidden ? 'none' : 'auto',
      }}
    >
      <defs>
        <filter id="praxis-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <style>{getAnimationStyles()}</style>
      </defs>

      {/* Main Group Wrapper */}
      <g id="praxis-group">
        
        {/* Stroke Group Wrapper */}
        <g id="praxis-stroke-group">
          {/* Top horizontal segment */}
          <path
            id="praxis-stroke-top"
            d="M80 60H140"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Main Curve segment */}
          <path
            id="praxis-stroke-curve"
            d="M140 60C167.614 60 190 82.3858 190 110C190 137.614 167.614 160 140 160"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Mid horizontal return segment */}
          <path
            id="praxis-stroke-mid"
            d="M140 160H110"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Vertical down segment */}
          <path
            id="praxis-stroke-vertical"
            d="M110 160V200"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Separate bottom horizontal segment */}
          <path
            id="praxis-stroke-bottom"
            d="M110 160L80 160"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </g>

        {/* AI Ring Wrapper */}
        <g id="praxis-ring-group">
          <circle
            id="praxis-ring"
            cx="140"
            cy="110"
            r="25"
            fill="currentColor"
            fillOpacity={0.2}
          />
        </g>

        {/* AI Core Wrapper */}
        <g id="praxis-core-group">
          <circle
            id="praxis-core"
            cx="140"
            cy="110"
            r="4"
            fill="currentColor"
          />
        </g>
      </g>
    </svg>
  );
}
