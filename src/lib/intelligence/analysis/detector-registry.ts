/**
 * src/lib/intelligence/analysis/detector-registry.ts
 * Dynamic Detector Registry for modular, topic-aware static analysis.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import type { AnalysisEvidence, AnalysisCategory } from './evidence-engine';
import type { DetectedApproach } from './approach-classifier';
import { detectBinarySearchTermination } from './detectors/binary-search';
import { detectBoundaryIssues } from './detectors/boundary';
import { detectSlidingWindowRecomputation } from './detectors/sliding-window';
import { detectQuadraticScaling } from './detectors/complexity';
import { detectMapKeyCollision } from './detectors/map';
import { detectInPlaceMutationIndex } from './detectors/mutation';
import { detectIntegerOverflow } from './detectors/overflow';

export interface AnalysisContext {
  code: string;
  contract: ProblemContract;
  approach: DetectedApproach;
  language: string;
}

export interface Detector {
  id: string;
  category: AnalysisCategory;
  supports(context: AnalysisContext): boolean;
  analyze(context: AnalysisContext): AnalysisEvidence[];
}

export class DetectorRegistry {
  private detectors: Map<string, Detector> = new Map();

  constructor() {
    this.registerDefaults();
  }

  public register(detector: Detector) {
    this.detectors.set(detector.id, detector);
  }

  public get(id: string): Detector | undefined {
    return this.detectors.get(id);
  }

  public getAll(): Detector[] {
    return Array.from(this.detectors.values());
  }

  public selectRelevant(context: AnalysisContext): Detector[] {
    return this.getAll().filter(d => d.supports(context));
  }

  private registerDefaults() {
    // 1. Binary Search Detector
    this.register({
      id: 'BINARY_SEARCH_TERMINATION_RULE',
      category: 'algorithm',
      supports: ctx => {
        const topics = (ctx.contract?.topics || []).map(t => t.toLowerCase());
        const slug = ctx.contract?.slug || '';
        return (
          ctx.approach.name === 'Binary Search' ||
          ctx.approach.name === 'Two Pointers' ||
          topics.includes('binary-search') ||
          topics.includes('binary search') ||
          slug.includes('binary-search') ||
          /while\s*\(\s*(left|lo|l|low)\s*</.test(ctx.code)
        );
      },
      analyze: ctx => {
        const ev = detectBinarySearchTermination(ctx.code, ctx.contract);
        return ev ? [ev] : [];
      },
    });

    // 2. Boundary & Empty Input Detector
    this.register({
      id: 'BOUNDARY_DETECTOR',
      category: 'boundary',
      supports: _ctx => true, // All competitive programming problems have boundaries
      analyze: ctx => detectBoundaryIssues(ctx.code, ctx.contract),
    });

    // 3. Sliding Window Recomputation Detector
    this.register({
      id: 'SLIDING_WINDOW_RECOMPUTE_RULE',
      category: 'algorithm',
      supports: ctx => {
        const topics = (ctx.contract?.topics || []).map(t => t.toLowerCase());
        return (
          ctx.approach.name === 'Sliding Window' ||
          topics.includes('sliding-window') ||
          topics.includes('sliding window') ||
          /window|k\s*\*\s*threshold/.test(ctx.code)
        );
      },
      analyze: ctx => {
        const ev = detectSlidingWindowRecomputation(ctx.code, ctx.contract);
        return ev ? [ev] : [];
      },
    });

    // 4. Complexity & Large N Quadratic Scaling Detector
    this.register({
      id: 'QUADRATIC_OVER_LARGE_N_RULE',
      category: 'complexity',
      supports: ctx => {
        const constraints = ctx.contract?.constraints || [];
        const hasLargeN = constraints.some(c => /10\^4|10\^5|10000|100000/.test(c.expression));
        const hasNestedLoops = /for\s*\(.*{[\s\S]*for\s*\(/.test(ctx.code);
        return hasLargeN || hasNestedLoops;
      },
      analyze: ctx => {
        const ev = detectQuadraticScaling(ctx.code, ctx.contract);
        return ev ? [ev] : [];
      },
    });

    // 5. Hash Map Key Collision Detector
    this.register({
      id: 'MAP_KEY_COLLISION_RULE',
      category: 'data_structure',
      supports: ctx => {
        return (
          ctx.approach.name === 'Hash Map' ||
          /new\s+Map\(|\.has\(|\.set\(|\bMap</.test(ctx.code)
        );
      },
      analyze: ctx => {
        const ev = detectMapKeyCollision(ctx.code, ctx.contract);
        return ev ? [ev] : [];
      },
    });

    // 6. In-Place Mutation Index Detector
    this.register({
      id: 'IN_PLACE_MUTATION_INDEX_RULE',
      category: 'implementation',
      supports: ctx => {
        return (
          ctx.contract?.executionMode === 'in_place' ||
          /\.splice\(|\.pop\(|\.shift\(|nums\[i\]\s*=\s*nums\[j\]/.test(ctx.code)
        );
      },
      analyze: ctx => {
        const ev = detectInPlaceMutationIndex(ctx.code, ctx.contract);
        return ev ? [ev] : [];
      },
    });

    // 7. Integer Overflow Detector
    this.register({
      id: 'INTEGER_OVERFLOW_RULE',
      category: 'implementation',
      supports: ctx => {
        return /\(\s*(left|lo|low)\s*\+\s*(right|hi|high)\s*\)\s*\/\s*2/.test(ctx.code);
      },
      analyze: ctx => {
        const ev = detectIntegerOverflow(ctx.code, ctx.contract);
        return ev ? [ev] : [];
      },
    });
  }
}

export const globalDetectorRegistry = new DetectorRegistry();
