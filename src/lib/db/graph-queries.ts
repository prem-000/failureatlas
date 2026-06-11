/**
 * Graph Query Functions (PostgreSQL/Prisma driven)
 * Performs semantic and ontological queries on the failure database.
 *
 * Used by:
 * - Bayesian engine (fetch priors)
 * - Analysis API (find similar failures)
 * - RAG system (retrieve learning strategies)
 */

import { prisma } from '@/lib/db/prisma';
import { RootCauseType } from '../../types';

const WEAKNESS_TO_ROOT_CAUSES: Record<string, string[]> = {
  'edge-case-reasoning': ['boundary-condition-error', 'input-output-handling-error'],
  'algorithmic-pattern-recognition': ['pattern-recognition-gap', 'algorithm-selection-mistake'],
  'performance-analysis': ['time-complexity-oversight', 'space-complexity-oversight', 'data-structure-mismatch'],
  'implementation-precision': ['implementation-detail-error']
};

const WEAKNESS_TO_STRATEGIES: Record<string, Array<{ id: string; name: string; estimatedTime: number }>> = {
  'edge-case-reasoning': [{ id: 'boundary-practice-plan', name: 'Boundary Condition Practice Plan', estimatedTime: 240 }],
  'algorithmic-pattern-recognition': [{ id: 'pattern-recognition-course', name: 'Algorithmic Pattern Recognition Course', estimatedTime: 480 }],
  'performance-analysis': [{ id: 'complexity-optimization-workshop', name: 'Complexity Optimization Workshop', estimatedTime: 360 }],
  'implementation-precision': [{ id: 'implementation-drills', name: 'Implementation Precision Drills', estimatedTime: 300 }]
};

// Helper function to map weakness to root cause types
function getRootCausesForWeakness(weakness: string): Array<{ type: RootCauseType; confidence: number }> {
  const normalized = weakness.toLowerCase();
  if (normalized.includes('boundary') || normalized.includes('edge')) {
    return [{ type: 'boundary-condition-error', confidence: 0.9 }];
  }
  if (normalized.includes('time') || normalized.includes('performance')) {
    return [
      { type: 'time-complexity-oversight', confidence: 0.85 },
      { type: 'space-complexity-oversight', confidence: 0.7 }
    ];
  }
  if (normalized.includes('pattern') || normalized.includes('algorithmic')) {
    return [
      { type: 'pattern-recognition-gap', confidence: 0.8 },
      { type: 'algorithm-selection-mistake', confidence: 0.75 }
    ];
  }
  if (normalized.includes('implementation') || normalized.includes('precision')) {
    return [
      { type: 'implementation-detail-error', confidence: 0.8 },
      { type: 'input-output-handling-error', confidence: 0.75 }
    ];
  }
  return [];
}

/**
 * Fetch prior probabilities for all root cause types.
 * Returns a map of rootCauseType -> probability.
 */
export async function queryRootCausePriors(): Promise<Record<RootCauseType, number>> {
  // Return static priors as standard baseline
  return {
    'boundary-condition-error': 0.15,
    'algorithm-selection-mistake': 0.12,
    'pattern-recognition-gap': 0.1,
    'time-complexity-oversight': 0.18,
    'space-complexity-oversight': 0.08,
    'data-structure-mismatch': 0.15,
    'implementation-detail-error': 0.12,
    'input-output-handling-error': 0.1,
  };
}

/**
 * Find similar past failures for a given root cause type.
 * Returns up to limit failures with metadata.
 */
export async function querySimilarFailures(
  rootCauseType: RootCauseType,
  limit = 10,
): Promise<
  Array<{
    id: string;
    timestamp: string;
    status: string;
    rootCauseType: RootCauseType;
    severity: string;
    confidence: number;
  }>
> {
  try {
    const hypotheses = await prisma.rootCauseHypothesis.findMany({
      where: {
        rootCauseType,
        evidence: {
          submission: {
            NOT: {
              status: 'Accepted'
            }
          }
        }
      },
      include: {
        evidence: {
          include: {
            submission: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return hypotheses.map(h => {
      const sub = h.evidence?.submission;
      return {
        id: sub?.eventId || '',
        timestamp: sub?.timestamp.toISOString() || new Date().toISOString(),
        status: sub?.status || 'unknown',
        rootCauseType: h.rootCauseType as RootCauseType,
        severity: 'medium',
        confidence: h.confidence
      };
    });
  } catch (error) {
    console.error(
      `Error querying similar failures for ${rootCauseType}:`,
      error,
    );
    return [];
  }
}

/**
 * Get weakness node with all connected root causes and learning strategies.
 * Returns structured data for recommendation engine.
 */
export async function queryWeaknessContext(weaknessId: string): Promise<{
  id: string;
  name: string;
  severity: string;
  rootCauses: Array<{ type: RootCauseType; confidence: number }>;
  strategies: Array<{ id: string; name: string; estimatedTime: number }>;
} | null> {
  try {
    const weakness = await prisma.systemicWeakness.findFirst({
      where: {
        OR: [
          { id: weaknessId },
          { name: weaknessId }
        ]
      },
      include: {
        strategies: true
      }
    });

    if (!weakness) {
      const ONTOLOGY_WEAKNESSES = {
        'edge-case-reasoning': { name: 'Edge Case Reasoning', severity: 'high' },
        'algorithmic-pattern-recognition': { name: 'Algorithmic Pattern Recognition', severity: 'high' },
        'performance-analysis': { name: 'Performance Analysis', severity: 'high' },
        'implementation-precision': { name: 'Implementation Precision', severity: 'medium' }
      };
      const w = ONTOLOGY_WEAKNESSES[weaknessId as keyof typeof ONTOLOGY_WEAKNESSES];
      if (!w) return null;
      
      const rootCauses = WEAKNESS_TO_ROOT_CAUSES[weaknessId] || [];
      const strategies = WEAKNESS_TO_STRATEGIES[weaknessId] || [];

      return {
        id: weaknessId,
        name: w.name,
        severity: w.severity,
        rootCauses: rootCauses.map(type => ({ type: type as RootCauseType, confidence: 0.8 })),
        strategies: strategies.map(s => ({ id: s.id, name: s.name, estimatedTime: s.estimatedTime }))
      };
    }

    const rootCauses = WEAKNESS_TO_ROOT_CAUSES[weakness.name] || [];

    return {
      id: weakness.name,
      name: weakness.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      severity: weakness.severity,
      rootCauses: rootCauses.map(type => ({ type: type as RootCauseType, confidence: 0.8 })),
      strategies: weakness.strategies.map(s => ({
        id: s.id,
        name: s.name,
        estimatedTime: s.estimatedTime
      }))
    };
  } catch (error) {
    console.error(`Error querying weakness context for ${weaknessId}:`, error);
    return null;
  }
}

/**
 * Get all learning recommendations for a specific weakness type.
 */
export async function queryLearningStrategies(weaknessType: string, limit = 5): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    estimatedTime: number;
    practiceProblems: string[];
  }>
> {
  try {
    const strategies = await prisma.learningStrategy.findMany({
      where: {
        weakness: {
          name: weaknessType
        }
      },
      orderBy: {
        priority: 'desc'
      },
      take: limit
    });

    if (strategies.length === 0) {
      const staticStrats = WEAKNESS_TO_STRATEGIES[weaknessType] || [];
      return staticStrats.map(s => ({
        id: s.id,
        name: s.name,
        description: `Practice plan and exercises for ${s.name}`,
        estimatedTime: s.estimatedTime,
        practiceProblems: []
      }));
    }

    return strategies.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      estimatedTime: s.estimatedTime,
      practiceProblems: s.practiceProblems
    }));
  } catch (error) {
    console.error(`Error querying learning strategies for weakness ${weaknessType}:`, error);
    return [];
  }
}

/**
 * Health check: verify connectivity by pinging PostgreSQL.
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
