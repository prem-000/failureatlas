import React from 'react';

export interface PraxisLoginIllustrationProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PraxisLoginIllustration
 *
 * Renders the transparent SVG illustration ("Practice. Learn. Improve.")
 * on the login page against the clean dark background.
 *
 * Visual & Responsive Attributes:
 * 1. Features the exact "Practice. Learn. Improve." collaborative artwork.
 * 2. Transparent background preserves the dark (#131313) page styling.
 * 3. Proportional responsive scaling across Desktop, Laptop, Tablet, and Mobile.
 * 4. Zero background boxes, borders, or coding overlays.
 */
export function PraxisLoginIllustration({ className, style }: PraxisLoginIllustrationProps) {
  return (
    <div
      className={`praxis-illustration-container ${className || ''}`}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/svg/praxis-practice-learn-improve.svg"
        alt="Practice. Learn. Improve."
        className="praxis-foreground-svg"
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: '100%',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export default PraxisLoginIllustration;
