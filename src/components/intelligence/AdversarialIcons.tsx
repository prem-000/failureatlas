import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

// 1. Execution Mesh (Hidden Tests Survived)
export function ExecutionMeshIcon({ className, size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="5" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="5" cy="12" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="19" cy="12" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="12" cy="19" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <line x1="12" y1="7.5" x2="5" y2="9.5" />
      <line x1="12" y1="7.5" x2="19" y2="9.5" />
      <line x1="5" y1="14.5" x2="12" y2="16.5" />
      <line x1="19" y1="14.5" x2="12" y2="16.5" />
      <line x1="5" y1="12" x2="19" y2="12" strokeDasharray="2 2" opacity="0.6" />
      <line x1="12" y1="5" x2="12" y2="19" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );
}

// 2. Probability Collapse (Potential Failure Modes Avoided)
export function ProbabilityCollapseIcon({ className, size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="10" strokeDasharray="3 3" opacity="0.4" />
      <circle cx="12" cy="12" r="6" strokeDasharray="2 2" opacity="0.7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" opacity="0.8" />
    </svg>
  );
}

// 3. Coverage Grid (Constraint Coverage)
export function CoverageGridIcon({ className, size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="2 2" opacity="0.5" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeWidth="1.5" opacity="0.4" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

// 4. Structural Integrity Core (Robustness Score)
export function StructuralIntegrityCoreIcon({ className, size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 2L2 7v8.5c0 5.5 4.5 8 10 10.5 5.5-2.5 10-5 10-10.5V7L12 2z" fill="currentColor" fillOpacity="0.1" />
      <polygon points="12,6 17,9 17,15 12,18 7,15 7,9" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

// 5. Inference Lens (Confidence Score)
export function InferenceLensIcon({ className, size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <path d="M8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2z" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

// Neural Probe (Hidden Tests Active Tab)
export function NeuralProbeIcon({ className, size = 14, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 2v8M12 14v8M2 12h8M14 12h8" />
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M4.5 4.5l3 3M16.5 16.5l3 3M19.5 4.5l-3 3M7.5 16.5l-3 3" opacity="0.6" />
    </svg>
  );
}

// Fracture Matrix (Break My Solution Active Tab)
export function FractureMatrixIcon({ className, size = 14, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h8l2-3 2 6 2-3h7" strokeWidth="1.5" strokeDasharray="1 1" opacity="0.4" />
      <path d="M12 3l-2 5 4 4-3 9" strokeWidth="2" />
    </svg>
  );
}

// Boundary Field (Constraint Extremes Active Tab)
export function BoundaryFieldIcon({ className, size = 14, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M5 3H3v18h2M19 3h2v18h-2" />
      <line x1="8" y1="12" x2="16" y2="12" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

// Synthetic Intelligence Core (AI Generated Cases Active Tab)
export function SyntheticCoreIcon({ className, size = 14, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.3" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
    </svg>
  );
}
