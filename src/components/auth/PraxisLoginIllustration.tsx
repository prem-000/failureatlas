'use client';

import React from 'react';
import { MARKETING_ILLUSTRATION_HREF } from './marketingIllustrationData';
import { MARKETING_MASK_HREF } from './marketingMaskData';
import { PERSON_OVERLAY_HREF } from './personOverlayData';

export interface PraxisLoginIllustrationProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PraxisLoginIllustration
 *
 * Renders the new marketing collaboration illustration with the animated coding
 * system integrated directly INSIDE the center computer/monitor screen.
 *
 * Key Architecture:
 * 1. The original marketing illustration forms the base with its original computer monitor.
 * 2. NO separate/floating black code window or foreign overlay.
 * 3. The existing 10.5s coding animation (typing lines, cursor, error, fix, accepted)
 *    is rendered INSIDE the computer monitor screen boundaries using SVG clipPath.
 * 4. The center person's head and shoulders are layered cleanly in front of the screen
 *    so the code appears naturally displayed ON the screen behind the developer.
 * 5. Full SVG responsive scaling across all viewport sizes.
 * 6. Full support for `prefers-reduced-motion: reduce`.
 */
export function PraxisLoginIllustration({ className, style }: PraxisLoginIllustrationProps) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'visible',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 1536 1024"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Praxis collaborative coding and competitive programming failure intelligence platform"
        className="praxis-illustration-svg"
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: 'none',
          display: 'block',
          overflow: 'visible',
        }}
      >
        <style>{`
          /* --- Palette Variables for Code on Monitor --- */
          .praxis-illustration-svg {
            --code-keyword: #dc2626;
            --code-function: #2563eb;
            --code-variable: #0f172a;
            --code-number: #d97706;
            --code-type: #7c3aed;
            --code-cursor: #ff5f52;
            --status-err-bg: #fee2e2;
            --status-err-border: #ef4444;
            --status-err-text: #991b1b;
            --status-fix-bg: #dbeafe;
            --status-fix-border: #3b82f6;
            --status-fix-text: #1e40af;
            --status-ok-bg: #dcfce7;
            --status-ok-border: #22c55e;
            --status-ok-text: #166534;
          }

          /* --- Keyframe Animations (10.5s cycle) --- */
          /* Line typing reveals (clip-rect expansion) */
          @keyframes typeLine1 {
            0% { width: 0px; }
            5% { width: 145px; }
            92% { width: 145px; opacity: 1; }
            95%, 100% { width: 145px; opacity: 0; }
          }
          @keyframes typeLine2 {
            0%, 5% { width: 0px; }
            11% { width: 155px; }
            92% { width: 155px; opacity: 1; }
            95%, 100% { width: 155px; opacity: 0; }
          }
          @keyframes typeLine3Buggy {
            0%, 11% { width: 0px; opacity: 1; }
            17% { width: 168px; opacity: 1; }
            52% { width: 168px; opacity: 1; }
            56%, 100% { width: 168px; opacity: 0; }
          }
          @keyframes typeLine4 {
            0%, 17% { width: 0px; }
            23% { width: 148px; }
            92% { width: 148px; opacity: 1; }
            95%, 100% { width: 148px; opacity: 0; }
          }
          @keyframes typeLine5 {
            0%, 23% { width: 0px; }
            28% { width: 16px; }
            92% { width: 16px; opacity: 1; }
            95%, 100% { width: 16px; opacity: 0; }
          }

          /* Blinking cursor following code */
          @keyframes cursorMotion {
            0% { transform: translate(852px, 547px); opacity: 1; }
            5% { transform: translate(995px, 547px); opacity: 1; }
            6% { transform: translate(852px, 557px); opacity: 1; }
            11% { transform: translate(1005px, 557px); opacity: 1; }
            12% { transform: translate(852px, 567px); opacity: 1; }
            17% { transform: translate(1018px, 567px); opacity: 1; }
            18% { transform: translate(852px, 577px); opacity: 1; }
            23% { transform: translate(998px, 577px); opacity: 1; }
            24% { transform: translate(852px, 587px); opacity: 1; }
            28% { transform: translate(868px, 587px); opacity: 1; }
            31%, 55% { transform: translate(868px, 587px); opacity: 0; }
            56% { transform: translate(852px, 567px); opacity: 1; }
            64% { transform: translate(1018px, 567px); opacity: 1; }
            68%, 100% { transform: translate(1018px, 567px); opacity: 0; }
          }

          @keyframes cursorBlink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0.1; }
          }

          /* Error State (Line 3 underline + Error Banner) */
          @keyframes errorHighlight {
            0%, 34% { opacity: 0; transform: scaleX(0); }
            36% { opacity: 1; transform: scaleX(1); }
            52% { opacity: 1; transform: scaleX(1); }
            56%, 100% { opacity: 0; transform: scaleX(0); }
          }

          @keyframes errorBanner {
            0%, 34% { opacity: 0; transform: translateY(4px); }
            37% { opacity: 1; transform: translateY(0); }
            52% { opacity: 1; transform: translateY(0); }
            55%, 100% { opacity: 0; transform: translateY(-4px); }
          }

          /* Debugging Correction State (Line 3 Fixed replacement) */
          @keyframes line3Fixed {
            0%, 55% { opacity: 0; transform: translateY(1px); }
            59% { opacity: 1; transform: translateY(0); }
            92% { opacity: 1; transform: translateY(0); }
            95%, 100% { opacity: 0; transform: translateY(0); }
          }

          @keyframes correctionPill {
            0%, 55% { opacity: 0; transform: scale(0.94); }
            59% { opacity: 1; transform: scale(1); }
            70% { opacity: 0.9; }
            76%, 100% { opacity: 0; transform: scale(0.96); }
          }

          /* Success State (Accepted Banner) */
          @keyframes successBanner {
            0%, 75% { opacity: 0; transform: translateY(4px); }
            78% { opacity: 1; transform: translateY(0); }
            92% { opacity: 1; transform: translateY(0); }
            95%, 100% { opacity: 0; transform: translateY(-3px); }
          }

          /* Subtle floating motion for ambient marketing elements */
          @keyframes floatCardLeft {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }

          @keyframes floatCardTop {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-3px) rotate(0.4deg); }
          }

          @keyframes floatCardRight {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4.5px); }
          }

          /* Status Dot Transition on Right Card in Sync with Cycle */
          @keyframes statusBadgeCycle {
            0%, 33% { fill: #f59e0b; }   /* Running / Testing */
            34%, 54% { fill: #ef4444; }  /* Test Failed */
            55%, 74% { fill: #3b82f6; }  /* Debugging / Fix */
            75%, 93% { fill: #22c55e; }  /* Accepted */
            94%, 100% { fill: #f59e0b; } /* Reset */
          }

          /* Reset State Pulse */
          @keyframes screenCyclePulse {
            0%, 93% { opacity: 1; }
            95% { opacity: 0.35; }
            97%, 100% { opacity: 1; }
          }

          /* Application of animations */
          .praxis-line-1 { animation: typeLine1 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-2 { animation: typeLine2 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-3-buggy { animation: typeLine3Buggy 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-4 { animation: typeLine4 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-5 { animation: typeLine5 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }

          .praxis-cursor {
            animation: cursorMotion 10.5s ease-in-out infinite;
          }
          .praxis-cursor-inner {
            animation: cursorBlink 0.7s infinite;
          }

          .praxis-error-highlight {
            transform-origin: 864px 576px;
            animation: errorHighlight 10.5s ease-out infinite;
          }

          .praxis-error-banner {
            transform-origin: 941px 542px;
            animation: errorBanner 10.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }

          .praxis-line-3-fixed {
            animation: line3Fixed 10.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }

          .praxis-correction-pill {
            transform-origin: 941px 542px;
            animation: correctionPill 10.5s ease-out infinite;
          }

          .praxis-success-banner {
            transform-origin: 941px 542px;
            animation: successBanner 10.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }

          .praxis-screen-lines-group {
            animation: screenCyclePulse 10.5s ease-in-out infinite;
          }

          .praxis-floating-card-left {
            transform-origin: 411px 640px;
            animation: floatCardLeft 6s ease-in-out infinite;
          }

          .praxis-floating-card-top {
            transform-origin: 935px 456px;
            animation: floatCardTop 5.2s ease-in-out infinite;
          }

          .praxis-floating-card-right {
            transform-origin: 1342px 555px;
            animation: floatCardRight 5.8s ease-in-out infinite;
          }

          .praxis-status-indicator {
            animation: statusBadgeCycle 10.5s steps(1) infinite;
          }

          /* --- Accessibility: prefers-reduced-motion --- */
          @media (prefers-reduced-motion: reduce) {
            .praxis-line-1,
            .praxis-line-2,
            .praxis-line-4,
            .praxis-line-5 {
              animation: none !important;
              width: 170px !important;
              opacity: 1 !important;
            }
            .praxis-line-3-buggy,
            .praxis-error-highlight,
            .praxis-error-banner,
            .praxis-cursor,
            .praxis-correction-pill {
              display: none !important;
              animation: none !important;
            }
            .praxis-line-3-fixed {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
            .praxis-success-banner {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
            .praxis-screen-lines-group,
            .praxis-floating-card-left,
            .praxis-floating-card-top,
            .praxis-floating-card-right,
            .praxis-status-indicator {
              animation: none !important;
              transform: none !important;
            }
          }
        `}</style>

        <defs>
          {/* Silhouette Mask: cleans up outer black border on dark background */}
          <mask id="praxis-illustration-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024">
            <image
              href={MARKETING_MASK_HREF}
              width="1536"
              height="1024"
              preserveAspectRatio="none"
            />
          </mask>

          {/* Precise Monitor Screen Clipping Region (matches the original monitor in the illustration) */}
          <clipPath id="monitor-screen-clip">
            <rect x="840" y="534" width="202" height="110" rx="16" ry="16" />
          </clipPath>

          {/* Typing Reveal Clip Paths for Code Lines */}
          <clipPath id="praxis-clip-line-1">
            <rect x="852" y="545" width="145" height="11" className="praxis-line-1" />
          </clipPath>
          <clipPath id="praxis-clip-line-2">
            <rect x="852" y="555" width="155" height="11" className="praxis-line-2" />
          </clipPath>
          <clipPath id="praxis-clip-line-3-buggy">
            <rect x="852" y="565" width="168" height="11" className="praxis-line-3-buggy" />
          </clipPath>
          <clipPath id="praxis-clip-line-4">
            <rect x="852" y="575" width="148" height="11" className="praxis-line-4" />
          </clipPath>
          <clipPath id="praxis-clip-line-5">
            <rect x="852" y="585" width="16" height="11" className="praxis-line-5" />
          </clipPath>
        </defs>

        {/* =========================================================================
            1. ORIGINAL MARKETING COLLABORATION ILLUSTRATION
            ========================================================================= */}
        <image
          id="praxis-marketing-base-asset"
          href={MARKETING_ILLUSTRATION_HREF}
          width="1536"
          height="1024"
          preserveAspectRatio="none"
          mask="url(#praxis-illustration-mask)"
        />

        {/* =========================================================================
            2. SUBTLE AMBIENT MOVEMENT ON MARKETING CARDS
            ========================================================================= */}
        {/* Left Floating Card Overlay */}
        <g id="praxis-floating-left-group" className="praxis-floating-card-left" aria-hidden="true">
          <rect x="350" y="597" width="120" height="9" rx="4.5" fill="#3b82f6" opacity="0.15" />
          <circle cx="360" cy="658" r="7" fill="#3b82f6" opacity="0.2" />
        </g>

        {/* Top Floating Card Overlay */}
        <g id="praxis-floating-top-group" className="praxis-floating-card-top" aria-hidden="true">
          <circle cx="935" cy="458" r="4.5" fill="#60a5fa" opacity="0.35" />
        </g>

        {/* Right Floating Card Synchronized Status Badge */}
        <g id="praxis-floating-right-group" className="praxis-floating-card-right" aria-hidden="true">
          <circle
            cx="1278"
            cy="622"
            r="8.5"
            className="praxis-status-indicator"
          />
        </g>

        {/* =========================================================================
            3. CODING ANIMATION INTEGRATED INSIDE THE COMPUTER SCREEN
            ========================================================================= */}
        <g id="computer-screen">
          {/* Animated code content clipped strictly to the original monitor boundaries */}
          <g id="coding-animation" clipPath="url(#monitor-screen-clip)">
            {/* Coding lines & Progressive Typing */}
            <g className="praxis-screen-lines-group">
              {/* Line 1: fn min_ops(arr: &[i32]) -> i32 { */}
              <g clipPath="url(#praxis-clip-line-1)">
                <text
                  x="852"
                  y="553"
                  fontFamily="'JetBrains Mono', 'Courier New', monospace"
                  fontSize="7.5"
                  fontWeight="600"
                >
                  <tspan fill="var(--code-keyword)">fn </tspan>
                  <tspan fill="var(--code-function)">min_ops</tspan>
                  <tspan fill="var(--code-variable)">(arr: </tspan>
                  <tspan fill="var(--code-type)">&amp;[i32]</tspan>
                  <tspan fill="var(--code-variable)">) -&gt; </tspan>
                  <tspan fill="var(--code-type)">i32</tspan>
                  <tspan fill="var(--code-variable)"> &#123;</tspan>
                </text>
              </g>

              {/* Line 2:   let mut dp = vec![0; n + 1]; */}
              <g clipPath="url(#praxis-clip-line-2)">
                <text
                  x="852"
                  y="563"
                  fontFamily="'JetBrains Mono', 'Courier New', monospace"
                  fontSize="7.5"
                  fontWeight="600"
                >
                  <tspan fill="var(--code-keyword)">  let mut </tspan>
                  <tspan fill="var(--code-variable)">dp = </tspan>
                  <tspan fill="var(--code-function)">vec!</tspan>
                  <tspan fill="var(--code-variable)">[</tspan>
                  <tspan fill="var(--code-number)">0</tspan>
                  <tspan fill="var(--code-variable)">; n + </tspan>
                  <tspan fill="var(--code-number)">1</tspan>
                  <tspan fill="var(--code-variable)">];</tspan>
                </text>
              </g>

              {/* Line 3 (Buggy):   if arr[i] > target { dp[i] = 1; } */}
              <g clipPath="url(#praxis-clip-line-3-buggy)">
                <text
                  x="852"
                  y="573"
                  fontFamily="'JetBrains Mono', 'Courier New', monospace"
                  fontSize="7.5"
                  fontWeight="600"
                >
                  <tspan fill="var(--code-keyword)">  if </tspan>
                  <tspan fill="var(--code-variable)">arr[i] &gt; target &#123; dp[i] = </tspan>
                  <tspan fill="var(--code-number)">1</tspan>
                  <tspan fill="var(--code-variable)">; &#125;</tspan>
                </text>
              </g>

              {/* Line 3 Bug Squiggly Underline */}
              <line
                x1="864"
                y1="575.5"
                x2="926"
                y2="575.5"
                stroke="var(--status-err-border)"
                strokeWidth="1.3"
                strokeDasharray="2 1.5"
                className="praxis-error-highlight"
              />

              {/* Line 3 (Corrected Fix):   if i < n && arr[i] >= target { */}
              <g className="praxis-line-3-fixed">
                <text
                  x="852"
                  y="573"
                  fontFamily="'JetBrains Mono', 'Courier New', monospace"
                  fontSize="7.5"
                  fontWeight="600"
                >
                  <tspan fill="var(--code-keyword)">  if </tspan>
                  <tspan fill="var(--code-variable)">i &lt; n &amp;&amp; arr[i] &gt;= target &#123;</tspan>
                </text>
              </g>

              {/* Line 4:   return solve(&dp, n, k); */}
              <g clipPath="url(#praxis-clip-line-4)">
                <text
                  x="852"
                  y="583"
                  fontFamily="'JetBrains Mono', 'Courier New', monospace"
                  fontSize="7.5"
                  fontWeight="600"
                >
                  <tspan fill="var(--code-keyword)">  return </tspan>
                  <tspan fill="var(--code-function)">solve</tspan>
                  <tspan fill="var(--code-variable)">(&amp;dp, n, k);</tspan>
                </text>
              </g>

              {/* Line 5: } */}
              <g clipPath="url(#praxis-clip-line-5)">
                <text
                  x="852"
                  y="593"
                  fontFamily="'JetBrains Mono', 'Courier New', monospace"
                  fontSize="7.5"
                  fontWeight="600"
                  fill="var(--code-variable)"
                >
                  &#125;
                </text>
              </g>

              {/* Active Coding Cursor */}
              <g className="praxis-cursor">
                <rect
                  x="0"
                  y="0"
                  width="4.5"
                  height="8"
                  rx="0.8"
                  fill="var(--code-cursor)"
                  className="praxis-cursor-inner"
                />
              </g>
            </g>

            {/* Stage 2: Error Notification (34% - 55%) inside Monitor at Top */}
            <g className="praxis-error-banner">
              <rect
                x="850"
                y="536"
                width="182"
                height="12"
                rx="3"
                fill="var(--status-err-bg)"
                stroke="var(--status-err-border)"
                strokeWidth="0.8"
              />
              <circle cx="857" cy="542" r="3" fill="#ef4444" />
              <path
                d="M855.5 540.5 L858.5 543.5 M858.5 540.5 L855.5 543.5"
                stroke="#ffffff"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
              <text
                x="864"
                y="544.5"
                fill="var(--status-err-text)"
                fontSize="6.2"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
              >
                FAIL: Test #4 - IndexOutOfBounds
              </text>
            </g>

            {/* Stage 3: Bug Fix Correction Pill (55% - 76%) inside Monitor at Top */}
            <g className="praxis-correction-pill">
              <rect
                x="850"
                y="536"
                width="182"
                height="12"
                rx="3"
                fill="var(--status-fix-bg)"
                stroke="var(--status-fix-border)"
                strokeWidth="0.8"
              />
              <circle cx="857" cy="542" r="3" fill="#3b82f6" />
              <path
                d="M855.5 542 L856.8 543.5 L859 540.5"
                stroke="#ffffff"
                strokeWidth="0.9"
                fill="none"
                strokeLinecap="round"
              />
              <text
                x="864"
                y="544.5"
                fill="var(--status-fix-text)"
                fontSize="6.2"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="600"
              >
                APPLY FIX: Bound Check Added
              </text>
            </g>

            {/* Stage 4: Accepted / Success Banner (75% - 92%) inside Monitor at Top */}
            <g className="praxis-success-banner">
              <rect
                x="850"
                y="536"
                width="182"
                height="12"
                rx="3"
                fill="var(--status-ok-bg)"
                stroke="var(--status-ok-border)"
                strokeWidth="0.8"
              />
              <circle cx="857" cy="542" r="3" fill="#22c55e" />
              <path
                d="M855.5 542 L856.8 543.5 L859 540.5"
                stroke="#ffffff"
                strokeWidth="0.9"
                fill="none"
                strokeLinecap="round"
              />
              <text
                x="864"
                y="544.5"
                fill="var(--status-ok-text)"
                fontSize="6.2"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
              >
                ACCEPTED: 48/48 Passed (24ms)
              </text>
            </g>
          </g>

          {/* Depth Layer: Person's head, ears & shoulders remain cleanly in front of the screen */}
          <image
            id="praxis-developer-head-depth"
            href={PERSON_OVERLAY_HREF}
            x="840"
            y="533"
            width="203"
            height="112"
            preserveAspectRatio="none"
            pointerEvents="none"
            aria-hidden="true"
          />
        </g>
      </svg>
    </div>
  );
}

export default PraxisLoginIllustration;
