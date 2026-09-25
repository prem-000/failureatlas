'use client';

import React, { useState, useEffect, useMemo } from 'react';

export interface PraxisRegisterIllustrationProps {
  className?: string;
  style?: React.CSSProperties;
  /** Optional override for testing brightness directly (0.0 to 1.0) */
  overrideBrightness?: number;
  /** Optional override for simulated local hour (0.0 to 24.0) */
  simulatedHour?: number;
  /** Optional boolean to display a subtle local time & lamp status badge */
  showStatusBadge?: boolean;
}

/**
 * Calculates lamp brightness factor [0.22 .. 1.0] based on local time.
 *
 * Requirements:
 * - From night until 6:00 AM: lamp at 100% brightness (1.0).
 * - After 6:00 AM: gradually reduce lamp brightness as daylight increases (smooth cosine curve).
 * - During daytime (12:00 PM - 3:30 PM): lamp remains dim/subtle (0.22), not completely off.
 * - As evening/night approaches (3:30 PM - 9:00 PM): gradually increase brightness back to 100%.
 * - 9:00 PM until 6:00 AM: 100% brightness (1.0).
 */
export function calculateBrightnessForHour(hourFloat: number): number {
  const MIN_BRIGHTNESS = 0.22;
  const MAX_BRIGHTNESS = 1.0;

  // Normalize hour into [0, 24)
  const h = ((hourFloat % 24) + 24) % 24;

  if (h <= 6.0) {
    // Night until 6:00 AM -> 100% brightness
    return MAX_BRIGHTNESS;
  } else if (h < 12.0) {
    // 6:00 AM to 12:00 PM -> gradually reduce brightness with smooth cosine curve
    const progress = (h - 6.0) / 6.0; // 0.0 to 1.0
    const factor = 0.5 * (1.0 + Math.cos(progress * Math.PI));
    return MIN_BRIGHTNESS + (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * factor;
  } else if (h <= 15.5) {
    // 12:00 PM to 3:30 PM (Daytime) -> remains dim/subtle, not completely off
    return MIN_BRIGHTNESS;
  } else if (h < 21.0) {
    // 3:30 PM to 9:00 PM (Evening/Night approach) -> gradually increases back to 100%
    const progress = (h - 15.5) / (21.0 - 15.5); // 0.0 to 1.0
    const factor = 0.5 * (1.0 - Math.cos(progress * Math.PI));
    return MIN_BRIGHTNESS + (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * factor;
  } else {
    // 9:00 PM to midnight -> 100% brightness
    return MAX_BRIGHTNESS;
  }
}

export function calculateLampBrightness(date: Date = new Date()): number {
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  return calculateBrightnessForHour(hours);
}

export function getTimePhase(hourFloat: number): { label: string; description: string } {
  const h = ((hourFloat % 24) + 24) % 24;
  if (h < 6.0) {
    return { label: 'Night Mode', description: 'Maximum warmth & full brightness (100%)' };
  } else if (h === 6.0) {
    return { label: 'Dawn (6:00 AM)', description: 'Full brightness, starting daylight transition' };
  } else if (h < 12.0) {
    return { label: 'Morning', description: 'Gradually dimming as daylight rises' };
  } else if (h <= 15.5) {
    return { label: 'Daytime', description: 'Subtle ambient glow (dim, not off)' };
  } else if (h < 18.5) {
    return { label: 'Late Afternoon', description: 'Gradually warming up' };
  } else if (h < 21.0) {
    return { label: 'Evening', description: 'Increasing warmth & illumination' };
  } else {
    return { label: 'Night Mode', description: 'Maximum warmth & full brightness (100%)' };
  }
}

/**
 * PraxisRegisterIllustration
 *
 * Renders the transparent SVG illustration ("Solve. Learn. Improve.")
 * on the registration page with dynamic time-based desk lamp lighting.
 *
 * Behavior:
 * - Calculates brightness from current local time using JavaScript.
 * - Automatically updates dynamically as time passes without requiring a page refresh.
 * - Applies brightness ONLY to the desk lamp and its light glow/cone.
 * - Leaves student, laptop, dashboards, background, and books colors untouched.
 * - Preserves warm hue, smoothly adjusting intensity/opacity/glow.
 * - Responsive across desktop, tablet, and mobile.
 * - Respects prefers-reduced-motion.
 */
export function PraxisRegisterIllustration({
  className,
  style,
  overrideBrightness,
  simulatedHour,
  showStatusBadge = false,
}: PraxisRegisterIllustrationProps) {
  const [currentHour, setCurrentHour] = useState<number>(() => {
    if (typeof simulatedHour === 'number') return simulatedHour;
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  });

  const [formattedTime, setFormattedTime] = useState<string>('');
  const [urlHourOverride, setUrlHourOverride] = useState<number | null>(null);

  // Check for URL test params on client mount (e.g. ?lampTime=night, ?lampHour=6, ?lampTime=14:00)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const lampHourParam = params.get('lampHour');
      const lampTimeParam = params.get('lampTime');
      const lampBrightnessParam = params.get('lampBrightness');

      if (lampBrightnessParam !== null) {
        const b = parseFloat(lampBrightnessParam);
        if (!isNaN(b)) {
          // If brightness is set directly, let simulatedHour reflect it
          setUrlHourOverride(b >= 0.99 ? 0 : b <= 0.25 ? 13 : 9);
          return;
        }
      }

      if (lampHourParam !== null) {
        const h = parseFloat(lampHourParam);
        if (!isNaN(h)) {
          setUrlHourOverride(h);
          return;
        }
      }

      if (lampTimeParam !== null) {
        const t = lampTimeParam.toLowerCase().trim();
        if (t === 'night' || t === 'midnight') setUrlHourOverride(0);
        else if (t === 'dawn' || t === '6am' || t === '6:00') setUrlHourOverride(6);
        else if (t === 'morning' || t === '9am' || t === '9:00') setUrlHourOverride(9);
        else if (t === 'noon' || t === 'midday' || t === 'day' || t === 'daytime' || t === 'afternoon') setUrlHourOverride(13);
        else if (t === 'evening' || t === 'dusk' || t === '6pm' || t === '18:00') setUrlHourOverride(18.5);
        else if (t.includes(':')) {
          const [hh, mm] = t.split(':').map(Number);
          if (!isNaN(hh)) setUrlHourOverride(hh + (mm || 0) / 60);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // Update time dynamically every 15 seconds without requiring page refresh
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      if (typeof simulatedHour !== 'number' && urlHourOverride === null) {
        setCurrentHour(now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600);
      }
      setFormattedTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, [simulatedHour, urlHourOverride]);

  // Compute active hour
  const activeHour = useMemo(() => {
    if (typeof simulatedHour === 'number') return simulatedHour;
    if (urlHourOverride !== null) return urlHourOverride;
    return currentHour;
  }, [simulatedHour, urlHourOverride, currentHour]);

  // Compute brightness factor [0.22 .. 1.0]
  const brightness = useMemo(() => {
    if (typeof overrideBrightness === 'number') {
      return Math.max(0.22, Math.min(1.0, overrideBrightness));
    }
    return calculateBrightnessForHour(activeHour);
  }, [overrideBrightness, activeHour]);

  const brightnessPercent = Math.round(brightness * 100);
  const timePhase = useMemo(() => getTimePhase(activeHour), [activeHour]);

  // Dynamic light layer opacities:
  // 1. Daytime softening wash (dimming excessive nocturnal spotlight contrast during daylight)
  // When brightness < 1.0, daySofteningOpacity gently softens the light cone to ambient tone
  const daySofteningOpacity = Math.max(0, (1.0 - brightness) * 0.42);

  // 2. Night warm radiance & golden bloom (0.0 at noon -> 1.0 at night)
  const nightGlowIntensity = Math.max(0, Math.min(1.0, (brightness - 0.22) / (1.0 - 0.22)));

  // Format display time for badge / aria
  const displayTimeStr = useMemo(() => {
    if (urlHourOverride !== null || typeof simulatedHour === 'number') {
      const totalMin = Math.round(activeHour * 60);
      const h = Math.floor(totalMin / 60) % 24;
      const m = totalMin % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const dispH = h % 12 === 0 ? 12 : h % 12;
      return `${dispH}:${m.toString().padStart(2, '0')} ${ampm} (Simulated)`;
    }
    return formattedTime || 'Local Time';
  }, [activeHour, urlHourOverride, simulatedHour, formattedTime]);

  return (
    <div
      className={`praxis-illustration-container ${className || ''}`}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        ...style,
      }}
    >
      <style>{`
        .lamp-dynamic-layer {
          transition: opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1), filter 1.5s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: opacity, filter;
        }
        @media (prefers-reduced-motion: reduce) {
          .lamp-dynamic-layer {
            transition: none !important;
          }
        }
        .lamp-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 4px 12px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          color: #9ca3af;
          font-family: 'Inter', -apple-system, sans-serif;
          letter-spacing: 0.02em;
          user-select: none;
        }
        .lamp-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          transition: background-color 1.5s ease, box-shadow 1.5s ease;
        }
      `}</style>

      {/* SVG Canvas encompassing exact 1774 x 887 coordinates */}
      <svg
        viewBox="0 0 1774 887"
        className="praxis-foreground-svg"
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: '100%',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
        role="img"
        aria-label={`Solve. Learn. Improve. illustration. Desk lamp brightness dynamically set to ${brightnessPercent}% based on current local time (${displayTimeStr}).`}
      >
        <defs>
          {/* Blur filters for lamp glow and beam */}
          <filter id="praxisLampBulbBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="praxisLampBeamBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" />
          </filter>

          <filter id="praxisLampSoftBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>

          <filter id="praxisLampDeskBlur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="22" />
          </filter>

          {/* Lamp Beam Gradient - Warm Amber & Golden Light Cone */}
          <linearGradient
            id="praxisLampBeamGrad"
            x1="335"
            y1="475"
            x2="480"
            y2="835"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFF9E6" stopOpacity="0.80" />
            <stop offset="25%" stopColor="#FFE082" stopOpacity="0.60" />
            <stop offset="55%" stopColor="#FFCA28" stopOpacity="0.38" />
            <stop offset="85%" stopColor="#FFA000" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#FF8F00" stopOpacity="0.0" />
          </linearGradient>

          {/* Bulb Core Radial Glow */}
          <radialGradient id="praxisLampBulbCore" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="28%" stopColor="#FFF3E0" stopOpacity="0.90" />
            <stop offset="60%" stopColor="#FFE082" stopOpacity="0.75" />
            <stop offset="88%" stopColor="#FFB300" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#FFA000" stopOpacity="0.0" />
          </radialGradient>

          {/* Ambient Desk Illumination Radial Bloom */}
          <radialGradient id="praxisLampDeskGlow" cx="48%" cy="50%" r="52%">
            <stop offset="0%" stopColor="#FFE082" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#FFCA28" stopOpacity="0.32" />
            <stop offset="75%" stopColor="#FFA000" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FF8F00" stopOpacity="0.0" />
          </radialGradient>

          {/* Daytime Ambient Wash Gradient (Softens nocturnal beam during bright daytime hours) */}
          <linearGradient
            id="praxisDaytimeAmbientWash"
            x1="335"
            y1="475"
            x2="480"
            y2="835"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#0B1C3D" stopOpacity="0.82" />
            <stop offset="35%" stopColor="#0D224A" stopOpacity="0.68" />
            <stop offset="70%" stopColor="#0A1A38" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#071329" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* 1. Base SVG Illustration: Exactly solve-learn-improve-final.svg without modification */}
        <image
          href="/svg/regrestration/solve-learn-improve-final.svg"
          x="0"
          y="0"
          width="1774"
          height="887"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* 2. Isolated Dynamic Lamp Lighting Layer */}
        {/* Only affects the desk lamp bulb, light cone, and warm desk reflection */}
        <g id="praxis-dynamic-lamp-lighting" style={{ pointerEvents: 'none' }}>
          {/* A. Daytime Ambient Softening Layer (Dimming excessive spotlight contrast during peak daylight) */}
          {daySofteningOpacity > 0.001 && (
            <g
              className="lamp-dynamic-layer"
              style={{
                opacity: daySofteningOpacity,
              }}
            >
              {/* Soften light cone on desk & books towards daytime ambient tone */}
              <polygon
                points="315,435 270,530 270,640 260,835 670,835 640,760 540,600 400,480"
                fill="url(#praxisDaytimeAmbientWash)"
                filter="url(#praxisLampSoftBlur)"
              />
              {/* Soften lamp shade interior opening */}
              <ellipse
                cx="335"
                cy="475"
                rx="60"
                ry="40"
                transform="rotate(-34, 335, 475)"
                fill="#0B1C3D"
                filter="url(#praxisLampSoftBlur)"
                opacity={0.65}
              />
            </g>
          )}

          {/* B. Night Radiance & Warm Golden Light Cone (Ramps up smoothly as night approaches) */}
          <g
            className="lamp-dynamic-layer"
            style={{
              opacity: nightGlowIntensity,
            }}
          >
            {/* Luminous Light Cone Beam */}
            <polygon
              points="315,435 270,530 270,640 260,835 670,835 640,760 540,600 400,480"
              fill="url(#praxisLampBeamGrad)"
              filter="url(#praxisLampBeamBlur)"
              style={{ mixBlendMode: 'screen' }}
            />

            {/* Glowing Bulb Core (Inside Lamp Shade) */}
            <ellipse
              cx="335"
              cy="475"
              rx="58"
              ry="39"
              transform="rotate(-34, 335, 475)"
              fill="url(#praxisLampBulbCore)"
              filter="url(#praxisLampBulbBloom)"
              style={{ mixBlendMode: 'screen' }}
            />

            {/* Radiant Bulb Filament Highlight */}
            <ellipse
              cx="335"
              cy="475"
              rx="24"
              ry="16"
              transform="rotate(-34, 335, 475)"
              fill="#FFFFFF"
              filter="url(#praxisLampBulbBloom)"
              opacity={0.75}
              style={{ mixBlendMode: 'screen' }}
            />

            {/* Warm Desk & Open Notebook Reflection Bloom */}
            <ellipse
              cx="460"
              cy="805"
              rx="185"
              ry="65"
              fill="url(#praxisLampDeskGlow)"
              filter="url(#praxisLampDeskBlur)"
              style={{ mixBlendMode: 'screen' }}
            />
          </g>
        </g>
      </svg>

      {/* Optional subtle status pill showing dynamic lamp brightness & local time */}
      {showStatusBadge && (
        <div
          className="lamp-status-pill"
          title={`Desk lamp brightness dynamically calculated from local time: ${brightnessPercent}%`}
        >
          <span
            className="lamp-status-dot"
            style={{
              backgroundColor: brightness > 0.6 ? '#fbbf24' : '#f59e0b',
              boxShadow:
                brightness > 0.6
                  ? `0 0 ${Math.round(brightness * 8)}px rgba(251, 191, 36, ${brightness})`
                  : 'none',
            }}
          />
          <span>{displayTimeStr}</span>
          <span>•</span>
          <span style={{ color: '#e5e7eb', fontWeight: 500 }}>
            Lamp: {brightnessPercent}%
          </span>
          <span style={{ color: '#6b7280' }}>({timePhase.label})</span>
        </div>
      )}
    </div>
  );
}

export default PraxisRegisterIllustration;
