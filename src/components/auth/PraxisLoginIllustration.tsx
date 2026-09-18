'use client';

import React from 'react';

export interface PraxisLoginIllustrationProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PraxisLoginIllustration
 * Native inline SVG illustration representing a developer at their workstation.
 *
 * Architectural constraints:
 * 1. The person, workstation, and monitor frame remain 100% STATIC.
 * 2. ONLY the computer screen animates.
 * 3. Continuous coding cycle: Typing -> Error -> Line Correction -> Accepted Success -> Reset.
 * 4. Pure CSS animations (@keyframes) for 60fps performance and zero React re-render overhead.
 * 5. Full support for `prefers-reduced-motion: reduce`.
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
        ...style,
      }}
    >
      <svg
        viewBox="0 0 711.1879 669.68268"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Praxis coding and debugging illustration showing continuous test cycles and solution acceptance"
        className="praxis-illustration-svg"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '100%',
          display: 'block',
          overflow: 'visible',
        }}
      >
        <style>{`
          /* --- Global Palette Variables --- */
          .praxis-illustration-svg {
            --bg-editor: #111114;
            --bg-titlebar: #18181c;
            --border-editor: #27272a;
            --code-keyword: #ff5f52;
            --code-function: #60a5fa;
            --code-variable: #f8fafc;
            --code-number: #f59e0b;
            --code-comment: #52525b;
            --status-err-bg: #221214;
            --status-err-border: #ef4444;
            --status-err-text: #f87171;
            --status-ok-bg: #0e2015;
            --status-ok-border: #22c55e;
            --status-ok-text: #4ade80;
            --accent-coral: #ff5f52;
            --desk-surface: #222226;
            --desk-dark: #1a1a1e;
            --desk-highlight: #2a2a30;
          }

          /* --- Keyframe Animations (10.5s cycle) --- */
          /* Line typing reveals (clip-rect expansion) */
          @keyframes typeLine1 {
            0% { width: 0px; }
            4% { width: 145px; }
            92% { width: 145px; opacity: 1; }
            95%, 100% { width: 145px; opacity: 0; }
          }
          @keyframes typeLine2 {
            0%, 4% { width: 0px; }
            9% { width: 182px; }
            92% { width: 182px; opacity: 1; }
            95%, 100% { width: 182px; opacity: 0; }
          }
          @keyframes typeLine3Buggy {
            0%, 9% { width: 0px; opacity: 1; }
            14% { width: 110px; opacity: 1; }
            52% { width: 110px; opacity: 1; }
            56%, 100% { width: 110px; opacity: 0; }
          }
          @keyframes typeLine4 {
            0%, 14% { width: 0px; }
            19% { width: 152px; }
            92% { width: 152px; opacity: 1; }
            95%, 100% { width: 152px; opacity: 0; }
          }
          @keyframes typeLine5 {
            0%, 19% { width: 0px; }
            24% { width: 195px; }
            92% { width: 195px; opacity: 1; }
            95%, 100% { width: 195px; opacity: 0; }
          }
          @keyframes typeLine6 {
            0%, 24% { width: 0px; }
            28% { width: 198px; }
            92% { width: 198px; opacity: 1; }
            95%, 100% { width: 198px; opacity: 0; }
          }
          @keyframes typeLine7 {
            0%, 28% { width: 0px; }
            31% { width: 35px; }
            92% { width: 35px; opacity: 1; }
            95%, 100% { width: 35px; opacity: 0; }
          }

          /* Blinking cursor following code */
          @keyframes cursorMotion {
            0% { transform: translate(390px, 150px); opacity: 1; }
            4% { transform: translate(535px, 150px); opacity: 1; }
            5% { transform: translate(390px, 162px); opacity: 1; }
            9% { transform: translate(572px, 162px); opacity: 1; }
            10% { transform: translate(390px, 174px); opacity: 1; }
            14% { transform: translate(500px, 174px); opacity: 1; }
            15% { transform: translate(390px, 186px); opacity: 1; }
            19% { transform: translate(542px, 186px); opacity: 1; }
            20% { transform: translate(390px, 198px); opacity: 1; }
            24% { transform: translate(585px, 198px); opacity: 1; }
            25% { transform: translate(390px, 210px); opacity: 1; }
            28% { transform: translate(588px, 210px); opacity: 1; }
            29% { transform: translate(390px, 222px); opacity: 1; }
            31% { transform: translate(405px, 222px); opacity: 1; }
            34%, 55% { transform: translate(405px, 222px); opacity: 0; }
            56% { transform: translate(390px, 174px); opacity: 1; }
            64% { transform: translate(515px, 174px); opacity: 1; }
            68%, 100% { transform: translate(515px, 174px); opacity: 0; }
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
            0%, 34% { opacity: 0; transform: translateY(12px); }
            37% { opacity: 1; transform: translateY(0); }
            52% { opacity: 1; transform: translateY(0); }
            55%, 100% { opacity: 0; transform: translateY(-4px); }
          }

          /* Debugging Correction State (Line 3 Fixed replacement) */
          @keyframes line3Fixed {
            0%, 55% { opacity: 0; transform: translateY(2px); }
            59% { opacity: 1; transform: translateY(0); }
            92% { opacity: 1; transform: translateY(0); }
            95%, 100% { opacity: 0; transform: translateY(0); }
          }

          @keyframes correctionPill {
            0%, 55% { opacity: 0; transform: scale(0.9); }
            59% { opacity: 1; transform: scale(1); }
            70% { opacity: 0.8; }
            76%, 100% { opacity: 0; }
          }

          /* Success State (Accepted Banner) */
          @keyframes successBanner {
            0%, 75% { opacity: 0; transform: translateY(12px); }
            78% { opacity: 1; transform: translateY(0); }
            92% { opacity: 1; transform: translateY(0); }
            95%, 100% { opacity: 0; transform: translateY(4px); }
          }

          /* Reset State Pulse */
          @keyframes screenCyclePulse {
            0%, 93% { opacity: 1; }
            95% { opacity: 0.15; }
            97%, 100% { opacity: 1; }
          }

          /* Application of animations */
          .praxis-line-1 { animation: typeLine1 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-2 { animation: typeLine2 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-3-buggy { animation: typeLine3Buggy 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-4 { animation: typeLine4 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-5 { animation: typeLine5 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-6 { animation: typeLine6 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }
          .praxis-line-7 { animation: typeLine7 10.5s cubic-bezier(0.2, 0, 0.2, 1) infinite; }

          .praxis-cursor {
            animation: cursorMotion 10.5s ease-in-out infinite;
          }
          .praxis-cursor-inner {
            animation: cursorBlink 0.7s infinite;
          }

          .praxis-error-highlight {
            transform-origin: 400px 184px;
            animation: errorHighlight 10.5s ease-out infinite;
          }

          .praxis-error-banner {
            animation: errorBanner 10.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }

          .praxis-line-3-fixed {
            animation: line3Fixed 10.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }

          .praxis-correction-pill {
            transform-origin: 450px 179px;
            animation: correctionPill 10.5s ease-out infinite;
          }

          .praxis-success-banner {
            animation: successBanner 10.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }

          .praxis-screen-lines-group {
            animation: screenCyclePulse 10.5s ease-in-out infinite;
          }

          /* --- Accessibility: prefers-reduced-motion --- */
          @media (prefers-reduced-motion: reduce) {
            .praxis-line-1,
            .praxis-line-2,
            .praxis-line-4,
            .praxis-line-5,
            .praxis-line-6,
            .praxis-line-7 {
              animation: none !important;
              width: 210px !important;
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
            .praxis-screen-lines-group {
              animation: none !important;
              opacity: 1 !important;
            }
          }
        `}</style>

        <defs>
          {/* Strict screen clipping region */}
          <clipPath id="praxis-screen-clip">
            <rect x="365.82" y="130.42" width="249.99" height="139.87" rx="3.5" ry="3.5" />
          </clipPath>

          {/* Typing Reveal Clip Paths */}
          <clipPath id="clip-line-1">
            <rect x="388" y="149" width="145" height="13" className="praxis-line-1" />
          </clipPath>
          <clipPath id="clip-line-2">
            <rect x="388" y="161" width="182" height="13" className="praxis-line-2" />
          </clipPath>
          <clipPath id="clip-line-3-buggy">
            <rect x="388" y="173" width="110" height="13" className="praxis-line-3-buggy" />
          </clipPath>
          <clipPath id="clip-line-4">
            <rect x="388" y="185" width="152" height="13" className="praxis-line-4" />
          </clipPath>
          <clipPath id="clip-line-5">
            <rect x="388" y="197" width="195" height="13" className="praxis-line-5" />
          </clipPath>
          <clipPath id="clip-line-6">
            <rect x="388" y="209" width="198" height="13" className="praxis-line-6" />
          </clipPath>
          <clipPath id="clip-line-7">
            <rect x="388" y="221" width="35" height="13" className="praxis-line-7" />
          </clipPath>
        </defs>

        {/* =========================================================================
            1. STATIC FURNITURE & DESK (Preserving original geometry & dark-tuned)
            ========================================================================= */}
        <g id="desk" aria-hidden="true">
          {/* Desk Pedestals */}
          <polygon
            points="516.326 380.018 516.326 565.013 547.27 615.443 549.625 619.279 671.722 619.279 674.189 380.018 516.326 380.018"
            fill="#232328"
          />
          <polygon
            points="516.326 380.018 516.326 565.013 547.27 615.443 549.169 380.018 516.326 380.018"
            fill="#000000"
            opacity="0.25"
          />

          <polygon
            points="221.566 375.084 221.566 560.08 190.622 610.51 188.267 614.345 66.17 614.345 63.703 375.084 221.566 375.084"
            fill="#232328"
          />
          <polygon
            points="221.566 375.084 221.566 560.08 190.622 610.51 188.723 375.084 221.566 375.084"
            fill="#000000"
            opacity="0.25"
          />

          {/* Desk Top Surface */}
          <polygon
            points="711.188 371.385 711.188 382.484 47.67 382.484 47.67 366.451 109.335 334.385 656.923 334.385 711.188 371.385"
            fill="#2c2c33"
          />
          <polygon
            points="711.188 371.385 711.188 382.484 47.67 382.484 47.67 366.451 711.188 371.385"
            fill="#000000"
            opacity="0.3"
          />

          {/* Drawer Handles */}
          <polygon points="142.635 426.883 113.035 426.883 100.702 418.25 156.201 418.25 142.635 426.883" fill="#3f3f46" />
          <polygon points="142.635 462.649 113.035 462.649 100.702 454.016 156.201 454.016 142.635 462.649" fill="#3f3f46" />
          <polygon points="142.635 513.215 113.035 513.215 100.702 504.581 156.201 504.581 142.635 513.215" fill="#3f3f46" />
          <polygon points="142.635 563.78 113.035 563.78 100.702 555.147 156.201 555.147 142.635 563.78" fill="#3f3f46" />
          <polygon points="595.257 431.816 624.857 431.816 637.19 423.183 581.691 423.183 595.257 431.816" fill="#3f3f46" />
          <polygon points="595.257 467.582 624.857 467.582 637.19 458.949 581.691 458.949 595.257 467.582" fill="#3f3f46" />
          <polygon points="595.257 518.148 624.857 518.148 637.19 509.515 581.691 509.515 595.257 518.148" fill="#3f3f46" />
          <polygon points="595.257 568.713 624.857 568.713 637.19 560.08 581.691 560.08 595.257 568.713" fill="#3f3f46" />
        </g>

        {/* =========================================================================
            2. STATIC COMPUTER HARDWARE (Monitor frame, stand, keyboard, mouse)
            ========================================================================= */}
        <g id="computer-hardware" aria-hidden="true">
          {/* Monitor Frame & Stand (exact original path) */}
          <path
            d="M859.81989,235.61493H610.63446a9.4227,9.4227,0,0,0-9.42389,9.42389V412.89655a9.4227,9.4227,0,0,0,9.42389,9.42388h94.5929l-3.54389,22.62623s-20.25281,10.75927-6.01251,11.07574,81.32764,0,81.32764,0,12.97448,0-7.59479-11.39221l-3.33362-22.30976h93.7497a9.42266,9.42266,0,0,0,9.42388-9.42388V245.03882A9.42266,9.42266,0,0,0,859.81989,235.61493Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#27272a"
          />

          {/* Webcam dot */}
          <circle cx="490.82114" cy="125.99415" r="1.8" fill="#3f3f46" />
          <circle cx="490.82114" cy="125.99415" r="0.8" fill="#71717a" />

          {/* Monitor Stand Base & Logo */}
          <circle cx="490.82114" cy="294.34559" r="4.5" fill="#3f3f46" />

          {/* Keyboard Base */}
          <polygon
            points="481.452 357.952 481.452 361.117 311.202 361.117 311.202 358.585 311.436 357.952 315.632 346.56 477.971 346.56 481.452 357.952"
            fill="#27272a"
          />
          <polygon
            points="481.452 357.952 481.452 361.117 311.202 361.117 311.202 358.585 311.436 357.952 481.452 357.952"
            fill="#000000"
            opacity="0.2"
          />

          {/* Mousepad & Mouse */}
          <path
            d="M791.37558,470.01266c-.31011,1.3259-1.481,2.72467-4.1265,4.04741-9.4935,4.74675-28.797-1.2658-28.797-1.2658s-14.87315-2.53161-14.87315-9.17706a11.86592,11.86592,0,0,1,1.30377-.77528c3.99133-2.11163,17.2253-7.32222,40.69051.22062a9.78618,9.78618,0,0,1,4.46035,2.923A4.667,4.667,0,0,1,791.37558,470.01266Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#1e1e24"
          />
          <ellipse cx="532.40017" cy="350.99016" rx="4.11385" ry="1.2658" fill="#3f3f46" />
        </g>

        {/* =========================================================================
            3. ANIMATED SCREEN CONTENT (Clipped inside monitor screen frame)
            ========================================================================= */}
        <g id="screen" clipPath="url(#praxis-screen-clip)">
          {/* Editor Dark Surface */}
          <rect x="365.82" y="130.42" width="249.99" height="139.87" fill="#111114" />

          {/* IDE Window Title Bar */}
          <rect x="365.82" y="130.42" width="249.99" height="15.5" fill="#18181c" />
          <line x1="365.82" y1="145.92" x2="615.81" y2="145.92" stroke="#27272a" strokeWidth="0.75" />

          {/* Traffic light window controls */}
          <circle cx="373.5" cy="138.1" r="2.2" fill="#ef4444" opacity="0.8" />
          <circle cx="379.5" cy="138.1" r="2.2" fill="#f59e0b" opacity="0.8" />
          <circle cx="385.5" cy="138.1" r="2.2" fill="#22c55e" opacity="0.8" />

          {/* Active Tab */}
          <rect x="393" y="132.5" width="70" height="13.4" rx="2" fill="#111114" />
          <text
            x="402"
            y="141.5"
            fill="#a1a1aa"
            fontSize="6.2"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="500"
          >
            binary_search.ts
          </text>

          {/* Language Tag */}
          <rect x="588" y="133.2" width="18" height="9.5" rx="1.5" fill="#27272a" />
          <text
            x="597"
            y="140"
            textAnchor="middle"
            fill="#ff5f52"
            fontSize="5.8"
            fontWeight="700"
            fontFamily="'JetBrains Mono', monospace"
          >
            TS
          </text>

          {/* Line Numbers Gutter */}
          <line x1="384" y1="145.92" x2="384" y2="270.29" stroke="#1f1f23" strokeWidth="0.75" />
          <g fill="#52525b" fontSize="6.4" fontFamily="'JetBrains Mono', monospace" textAnchor="end">
            <text x="380" y="157.5">1</text>
            <text x="380" y="169.5">2</text>
            <text x="380" y="181.5">3</text>
            <text x="380" y="193.5">4</text>
            <text x="380" y="205.5">5</text>
            <text x="380" y="217.5">6</text>
            <text x="380" y="229.5">7</text>
          </g>

          {/* Code Lines Group (progressively typed) */}
          <g className="praxis-screen-lines-group">
            {/* Line 1: function solve(arr, target) { */}
            <g clipPath="url(#clip-line-1)">
              <text x="389" y="157.5" fontSize="6.8" fontFamily="'JetBrains Mono', monospace" xmlSpace="preserve">
                <tspan fill="#ff5f52" fontWeight="600">function </tspan>
                <tspan fill="#60a5fa">search</tspan>
                <tspan fill="#94a3b8">(nums, k) &#123;</tspan>
              </text>
            </g>

            {/* Line 2: let l = 0, r = nums.length - 1; */}
            <g clipPath="url(#clip-line-2)">
              <text x="389" y="169.5" fontSize="6.8" fontFamily="'JetBrains Mono', monospace" xmlSpace="preserve">
                <tspan fill="#ff5f52" fontWeight="600">  let </tspan>
                <tspan fill="#f8fafc">l = </tspan>
                <tspan fill="#f59e0b">0</tspan>
                <tspan fill="#f8fafc">, r = nums.length - </tspan>
                <tspan fill="#f59e0b">1</tspan>
                <tspan fill="#94a3b8">;</tspan>
              </text>
            </g>

            {/* Line 3 Buggy: while (l < r) { */}
            <g clipPath="url(#clip-line-3-buggy)">
              <text x="389" y="181.5" fontSize="6.8" fontFamily="'JetBrains Mono', monospace" xmlSpace="preserve">
                <tspan fill="#ff5f52" fontWeight="600">  while </tspan>
                <tspan fill="#f8fafc">(l &lt; r) &#123;</tspan>
              </text>
            </g>

            {/* Line 3 Red Error Squiggly/Underline (during error phase) */}
            <rect
              x="423"
              y="183.5"
              width="24"
              height="1.5"
              rx="0.75"
              fill="#ef4444"
              className="praxis-error-highlight"
            />

            {/* Line 3 Correction Pill (pulse highlight on replacement) */}
            <rect
              x="388"
              y="173.5"
              width="96"
              height="10.5"
              rx="2"
              fill="#ff5f52"
              opacity="0.25"
              className="praxis-correction-pill"
            />

            {/* Line 3 Fixed: while (l <= r) { */}
            <g className="praxis-line-3-fixed">
              <text x="389" y="181.5" fontSize="6.8" fontFamily="'JetBrains Mono', monospace" xmlSpace="preserve">
                <tspan fill="#ff5f52" fontWeight="600">  while </tspan>
                <tspan fill="#22c55e" fontWeight="700">(l &lt;= r) </tspan>
                <tspan fill="#f8fafc">&#123;</tspan>
              </text>
            </g>

            {/* Line 4: let m = (l + r) >> 1; */}
            <g clipPath="url(#clip-line-4)">
              <text x="389" y="193.5" fontSize="6.8" fontFamily="'JetBrains Mono', monospace" xmlSpace="preserve">
                <tspan fill="#ff5f52" fontWeight="600">    let </tspan>
                <tspan fill="#f8fafc">m = (l + r) &gt;&gt; </tspan>
                <tspan fill="#f59e0b">1</tspan>
                <tspan fill="#94a3b8">;</tspan>
              </text>
            </g>

            {/* Line 5: if (nums[m] === k) return m; */}
            <g clipPath="url(#clip-line-5)">
              <text x="389" y="205.5" fontSize="6.8" fontFamily="'JetBrains Mono', monospace" xmlSpace="preserve">
                <tspan fill="#ff5f52" fontWeight="600">    if </tspan>
                <tspan fill="#f8fafc">(nums[m] === k) </tspan>
                <tspan fill="#ff5f52" fontWeight="600">return </tspan>
                <tspan fill="#f8fafc">m;</tspan>
              </text>
            </g>

            {/* Line 6: nums[m] < k ? l = m + 1 : r = m - 1; */}
            <g clipPath="url(#clip-line-6)">
              <text x="389" y="217.5" fontSize="6.8" fontFamily="'JetBrains Mono', monospace" xmlSpace="preserve">
                <tspan fill="#f8fafc">    nums[m] &lt; k ? l = m + </tspan>
                <tspan fill="#f59e0b">1</tspan>
                <tspan fill="#f8fafc"> : r = m - </tspan>
                <tspan fill="#f59e0b">1</tspan>
                <tspan fill="#94a3b8">;</tspan>
              </text>
            </g>

            {/* Line 7: } */}
            <g clipPath="url(#clip-line-7)">
              <text x="389" y="229.5" fontSize="6.8" fontFamily="'JetBrains Mono', monospace" xmlSpace="preserve">
                <tspan fill="#94a3b8">  &#125;</tspan>
              </text>
            </g>

            {/* Animated Typing Cursor */}
            <g className="praxis-cursor">
              <rect
                x="0"
                y="0"
                width="3.5"
                height="8"
                rx="0.8"
                fill="#ff5f52"
                className="praxis-cursor-inner"
              />
            </g>
          </g>

          {/* -------------------------------------------------------------
              State 2 — Error Toast (Slides up at bottom of screen)
              ------------------------------------------------------------- */}
          <g className="praxis-error-banner">
            <rect
              x="376"
              y="241"
              width="230"
              height="20"
              rx="3"
              fill="#201113"
              stroke="#ef4444"
              strokeWidth="0.8"
            />
            {/* Error Icon */}
            <circle cx="386" cy="251" r="4.5" fill="#ef4444" opacity="0.2" />
            <text
              x="386"
              y="253"
              textAnchor="middle"
              fill="#ef4444"
              fontSize="6.5"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
            >
              ✕
            </text>
            <text
              x="396"
              y="253.2"
              fill="#fca5a5"
              fontSize="6.2"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="600"
            >
              Runtime Error:
            </text>
            <text
              x="451"
              y="253.2"
              fill="#e5e7eb"
              fontSize="5.8"
              fontFamily="'JetBrains Mono', monospace"
            >
              Target element omitted (test 14/48)
            </text>
          </g>

          {/* -------------------------------------------------------------
              State 4 — Success Toast (Slides up at bottom of screen)
              ------------------------------------------------------------- */}
          <g className="praxis-success-banner">
            <rect
              x="376"
              y="241"
              width="230"
              height="20"
              rx="3"
              fill="#0d1e13"
              stroke="#22c55e"
              strokeWidth="0.8"
            />
            {/* Success Checkmark */}
            <circle cx="386" cy="251" r="4.5" fill="#22c55e" opacity="0.2" />
            <text
              x="386"
              y="253.2"
              textAnchor="middle"
              fill="#22c55e"
              fontSize="6.5"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
            >
              ✓
            </text>
            <text
              x="396"
              y="253.2"
              fill="#4ade80"
              fontSize="6.2"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="700"
            >
              Accepted
            </text>
            <text
              x="433"
              y="253.2"
              fill="#94a3b8"
              fontSize="5.8"
              fontFamily="'JetBrains Mono', monospace"
            >
              • 48/48 tests passed (12ms, beats 98.4%)
            </text>
          </g>
        </g>

        {/* =========================================================================
            4. STATIC PERSON (Completely static, preserving original coordinates)
            ========================================================================= */}
        <g id="person" aria-hidden="true">
          {/* Hair back */}
          <path
            d="M339.06751,115.15881a8.55394,8.55394,0,0,0-4.96126,1.1083c-1.476,1.0108-2.40629,2.78162-3.35588,4.42947a52.98576,52.98576,0,0,1-14.43428,16.30464c-4.28894,3.142-9.74169,7.05966-9.00789,12.85269a17.37163,17.37163,0,0,0,2.09058,5.4255c3.9566,7.987,14.75357,14.15926,13.69156,23.27309,3.931-6.58092-1.327-9.835,2.604-16.41586,1.87205-3.134,5.12412-6.67168,7.95054-4.70353.94637.659,1.56777,1.84095,2.55314,2.41917,2.35122,1.37972,4.85259-1.258,6.93387-3.12633,7.17685-6.44263,17.383-4.7548,26.31387-2.74743,4.21624.94767,8.8473,2.191,11.33971,6.2207,3.277,5.29821-3.11344,11.02034-4.72807,17.01049a3.264,3.264,0,0,0,3.50293,4.06214c2.67975-.26434,5.8542-.481,6.01278-1.65694,3.37154.12,7.50269-.26181,8.94728-3.7725a14.76216,14.76216,0,0,0,.69252-4.29319c.5302-5.89718,3.0331-11.27719,4.69119-16.88993s2.37906-12.1905-.41909-17.1668a19.86362,19.86362,0,0,0-3.666-4.45557C379.94,117.67017,359.06259,115.136,339.06751,115.15881Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#2f2e41"
          />

          {/* Neck & Skin */}
          <path
            d="M326.54375,190.06386s3.4534,28.7784-9.20909,31.08068,11.51136,41.4409,11.51136,41.4409l57.55681,6.90682-13.81364-46.04545s-9.20909-3.45341-3.4534-26.47613S326.54375,190.06386,326.54375,190.06386Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#ffb8b8"
          />
          <polygon points="47.028 569.318 51.633 632.631 75.806 632.631 68.9 569.318 47.028 569.318" fill="#ffb8b8" />
          <polygon points="224.303 449.6 227.756 502.552 254.233 491.041 243.872 447.298 224.303 449.6" fill="#ffb8b8" />

          {/* Pants & Lower Body */}
          <path
            d="M274.16705,442.73826s1.15113,66.7659,8.058,88.63749,5.75568,23.02272,4.60455,26.47613-2.30228,1.15114-2.30228,6.90682-2.30227,96.69544,0,104.7534-6.90681,21.87159,0,23.02272,39.13863,0,40.28977-6.90682-9.20909-9.20909-4.60454-13.81363,11.51136-98.99772,11.51136-98.99772l16.11591-65.61476,29.92954-34.53409H441.0818l19.56932,75.975s-8.058,21.87159-2.30228,21.87159,40.28977,6.90682,40.28977-18.41818S487.12725,451.94735,484.825,449.64508s1.15113-10.36023-2.30228-13.81364-43.74317-27.62727-58.70794-32.23181S387.857,393.51476,387.857,393.51476Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#2f2e41"
          />
          <path
            d="M498.63861,596.99051s-17.267-5.75568-25.325,11.51137-4.60454,21.87159-4.60454,21.87159,26.47613,9.20909,31.08068,4.60454c2.00333-2.00334,8.36471-2.69926,14.91273-2.84621,9.97289-.22381,12.62625-14.33323,3.20748-17.61885q-.42145-.147-.85317-.25539C507.8477,611.95529,498.63861,596.99051,498.63861,596.99051Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#2f2e41"
          />

          {/* Head */}
          <circle cx="108.03826" cy="59.36486" r="34.53409" fill="#ffb8b8" />

          {/* Shirt (Praxis Coral: #ff5f52) */}
          <path
            d="M307.55,235.53374s56.40567,11.51136,70.21931-6.90682,19.56931,51.80113,19.56931,51.80113l6.90682,73.67272-10.36023,40.28977s-54.1034,43.74318-71.37044,47.19658-43.74318,5.75569-43.74318,5.75569,8.058-127.77613,8.058-130.0784S307.55,235.53374,307.55,235.53374Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#ff5f52"
          />

          {/* Arms & Torso Shadows */}
          <path
            d="M324.70433,213.94456s-12.54979-7.18923-16.0032-.28241S273.01591,237.836,269.5625,237.836s6.90682,95.54431,2.30227,107.05567S245.38864,440.436,258.05114,447.34281s3.45341-6.90682,16.11591,10.36022,74.82385,17.267,78.27726,10.36023-27.62727-58.708-21.87159-107.05567,14.96477-115.11362,6.90682-124.32271S324.70433,213.94456,324.70433,213.94456Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#2f2e41"
          />
          <path
            d="M366.258,221.7201l1.60341-5.518s47.89544,15.87824,50.19772,26.23847,1.15113,82.88181-6.90682,88.63749-19.56932,14.96477-11.51136,28.7784,17.267,28.77841,24.17386,29.92954,19.56931,9.20909,16.1159,17.267-44.89431-6.90682-44.89431-6.90682-27.62727-20.72045-26.47613-52.95227S366.258,221.7201,366.258,221.7201Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#2f2e41"
          />

          {/* Hands */}
          <path
            d="M406.54771,357.55418l-27.62727,51.80113s-40.28976,41.4409-17.267,46.04545,35.68522-37.9875,35.68522-37.9875l29.92955-42.592Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#ffb8b8"
          />

          {/* Hair front */}
          <path
            d="M340.74981,124.19457a7.83806,7.83806,0,0,0-4.03868.78334,9.41322,9.41322,0,0,0-2.73182,3.13072,39.77267,39.77267,0,0,1-11.7501,11.524c-3.49138,2.22077-7.93014,4.98972-7.3328,9.0842a11.35949,11.35949,0,0,0,1.70182,3.8347,30.16344,30.16344,0,0,1,3.66519,18.80068l9.60011-13.954c1.52393-2.21507,4.17125-4.7155,6.47207-3.32442.77039.46577,1.27623,1.30117,2.07836,1.70985,1.914.97518,3.95021-.88912,5.64447-2.20967,5.84225-4.55361,14.15049-3.36066,21.42059-1.94187,3.43219.66981,7.20207,1.54859,9.231,4.39676,3.37169,4.73311-.149,11.5721,1.81882,17.04a5.02339,5.02339,0,0,0,2.07852-3.31717c2.74457.08484,6.1075-.185,7.28345-2.66638a9.18757,9.18757,0,0,0,.56374-3.03439c.43161-4.16809,2.46907-7.97065,3.81883-11.93769s1.93666-8.61616-.34116-12.13338a14.68107,14.68107,0,0,0-2.98426-3.14917C374.02174,125.96958,357.02664,124.17845,340.74981,124.19457Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#2f2e41"
          />

          {/* Arms details & shoes */}
          <path
            d="M406.54771,237.836l10.72528,2.84686s24.95995,63.919,19.20427,107.66222-9.20909,34.53409-9.20909,34.53409-9.20909-20.72046-29.92955-16.11591Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#2f2e41"
          />
          <path
            d="M293.02894,739.422c-2.77592,3.77228-2.21935,9.16459-4.67828,13.15075-2.13144,3.45526-6.14837,5.26695-8.81439,8.32869a22.32616,22.32616,0,0,0-2.26617,3.25987c-2.47311,4.14255-4.4833,9.45174-2.04761,13.61641,1.95936,3.35022,6.07786,4.65961,9.855,5.552,4.77407,1.128,9.73436,2.03071,14.56354,1.16876s9.54882-3.819,11.27067-8.41239a32.50011,32.50011,0,0,1,1.2051-3.4007c2.61747-5.15294,10.82749-5.20864,13.50628-10.33,1.87466-3.584.15138-7.91623-1.57118-11.57578l-5.26109-11.1771c-1.74592-3.70919-8.82362-1.57608-12.51339-2.46492C301.46518,735.97844,296.49084,734.70126,293.02894,739.422Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#2f2e41"
          />
          <path
            d="M254.59773,380.5769l48.34772,74.82386s29.92954,37.98749,39.13863,20.72045-32.23181-46.04545-32.23181-46.04545L278.77159,372.519Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#ffb8b8"
          />
          <path
            d="M278.77159,240.13828,269.5625,237.836s-18.41818,5.75568-23.02272,29.92954-1.15114,120.86931,4.60454,122.02044,28.42725-16.83663,32.05624-13.02286-7.88238-15.75554-4.429-26.11577S278.77159,240.13828,278.77159,240.13828Z"
            transform="translate(-244.40605 -115.15866)"
            fill="#2f2e41"
          />
        </g>
      </svg>
    </div>
  );
}

export default PraxisLoginIllustration;
