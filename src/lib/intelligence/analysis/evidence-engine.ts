/**
 * src/lib/intelligence/analysis/evidence-engine.ts
 * Evidence Engine & Lifecycle Models (Phase 2).
 */

export type AnalysisCategory =
  | 'boundary'
  | 'algorithm'
  | 'complexity'
  | 'data_structure'
  | 'implementation';

export type EvidenceStatus =
  | 'POTENTIAL'
  | 'TESTED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'INCONCLUSIVE';

export interface AnalysisEvidence {
  id: string;
  category: AnalysisCategory;
  detector: string;
  severity: number;           // 0.0 to 1.0
  confidence: number;         // 0.0 to 1.0 (combined alias)
  staticConfidence: number;   // Initial static confidence
  empiricalConfidence: number;// Confidence calibrated after dual execution
  combinedConfidence: number; // Combined Bayesian confidence
  status: EvidenceStatus;
  source: {
    lineStart: number;
    lineEnd: number;
    snippet: string;
  };
  finding: string;
  hypothesis: string;
  whyItMatters?: string;
  counterexample?: Record<string, unknown>;
}
