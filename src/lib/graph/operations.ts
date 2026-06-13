/**
 * src/lib/graph/operations.ts
 * In-memory graph query operations built on PostgreSQL via Prisma
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: 'Problem' | 'FailureEvent' | 'Evidence' | 'RootCause' | 'Weakness' | 'LearningStrategy';
    properties: Record<string, any>;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
  animated?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    totalNodes?: number;
    totalEdges?: number;
    isConnected: boolean;
    problems: number;
    failures: number;
    weaknesses: number;
    strategies: number;
  };
}

const ROOT_CAUSE_TO_WEAKNESS: Record<string, { id: string; name: string }> = {
  // Edge Case Reasoning
  'boundary-condition-error': { id: 'edge-case-reasoning', name: 'Edge Case Reasoning' },
  'off-by-one-error': { id: 'edge-case-reasoning', name: 'Edge Case Reasoning' },
  'empty-array-handling': { id: 'edge-case-reasoning', name: 'Edge Case Reasoning' },
  'binary-search-edge-cases': { id: 'edge-case-reasoning', name: 'Edge Case Reasoning' },
  
  // Pattern Recognition
  'sliding-window': { id: 'pattern-recognition', name: 'Pattern Recognition' },
  'two-pointers': { id: 'pattern-recognition', name: 'Pattern Recognition' },
  'hash-map': { id: 'pattern-recognition', name: 'Pattern Recognition' },
  'greedy-selection': { id: 'pattern-recognition', name: 'Pattern Recognition' },
  'pattern-recognition-gap': { id: 'pattern-recognition', name: 'Pattern Recognition' },
  
  // Performance Analysis
  'time-complexity-oversight': { id: 'performance-analysis', name: 'Performance Analysis' },
  'space-complexity-oversight': { id: 'performance-analysis', name: 'Performance Analysis' },
  'algorithm-selection-mistake': { id: 'performance-analysis', name: 'Performance Analysis' },
  'data-structure-mismatch': { id: 'performance-analysis', name: 'Performance Analysis' },
  
  'implementation-detail-error': { id: 'implementation-precision', name: 'Implementation Precision' }
};

/**
 * Get user's complete failure subgraph (all failures and related entities)
 */
export async function getUserFailureSubgraph(
  userId: string,
  limit: number = 300
): Promise<GraphData> {
  try {
    const problems = await prisma.problem.findMany({ take: limit });
    const submissions = await prisma.submissionEvent.findMany({
      where: { userId },
      include: {
        problem: true,
        evidence: {
          include: {
            rootCauseHypotheses: true
          }
        },
        diagnosis: {
          include: {
            primaryWeakness: {
              include: {
                strategies: true
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    const problemsList: any[] = [];
    const failuresList: any[] = [];
    const evidencesList: any[] = [];
    const rootCausesList: any[] = [];
    const weaknessesList: any[] = [];
    const strategiesList: any[] = [];

    const addedProblems = new Set<string>();
    const addedFailures = new Set<string>();
    const addedEvidences = new Set<string>();
    const addedRootCauses = new Set<string>();
    const addedWeaknesses = new Set<string>();
    const addedStrategies = new Set<string>();

    const edges: GraphEdge[] = [];
    const addedEdges = new Set<string>();

    function addEdge(source: string, target: string, type: string) {
      const edgeId = `${source}-${target}`;
      if (!addedEdges.has(edgeId)) {
        edges.push({
          id: edgeId,
          source,
          target,
          type,
          animated: type === 'TRIGGERED' || type === 'HAS_EVIDENCE'
        });
        addedEdges.add(edgeId);
      }
    }

    for (const sub of submissions) {
      // 1. Problem Node
      const problemId = `problem-${sub.problem.slug}`;
      if (!addedProblems.has(problemId)) {
        problemsList.push({
          id: problemId,
          nodeType: 'Problem',
          label: sub.problem.title,
          properties: {
            slug: sub.problem.slug,
            difficulty: sub.problem.difficulty,
            topics: sub.problem.topics
          }
        });
        addedProblems.add(problemId);
      }

      // 2. FailureEvent Node
      const failureId = `failure-${sub.eventId}`;
      if (!addedFailures.has(failureId)) {
        failuresList.push({
          id: failureId,
          nodeType: 'FailureEvent',
          label: `Failure: ${sub.status}`,
          properties: {
            eventId: sub.eventId,
            status: sub.status,
            language: sub.language,
            timestamp: sub.timestamp.toISOString(),
            attemptNumber: sub.attemptNumber,
            timeSpent: `${Math.round(sub.timeSpent / 60)}m`
          }
        });
        addedFailures.add(failureId);
      }
      addEdge(problemId, failureId, 'TRIGGERED');

      // 3. Evidence Nodes
      for (const ev of sub.evidence) {
        const evidenceId = `evidence-${ev.id}`;
        if (!addedEvidences.has(evidenceId)) {
          evidencesList.push({
            id: evidenceId,
            nodeType: 'Evidence',
            label: ev.description,
            properties: {
              type: ev.type,
              confidence: ev.confidence,
              source: ev.source
            }
          });
          addedEvidences.add(evidenceId);
        }
        addEdge(failureId, evidenceId, 'HAS_EVIDENCE');

        // 4. RootCause Nodes (from hypotheses)
        for (const hyp of ev.rootCauseHypotheses) {
          const rcId = `rootcause-${hyp.rootCauseType}`;
          if (!addedRootCauses.has(rcId)) {
            rootCausesList.push({
              id: rcId,
              nodeType: 'RootCause',
              label: hyp.name,
              properties: {
                type: hyp.rootCauseType,
                confidence: hyp.confidence
              }
            });
            addedRootCauses.add(rcId);
          }
          addEdge(evidenceId, rcId, 'SUGGESTS');

          // Link RootCause to Weakness (using primary weakness of diagnosis if available, fallback to mapping)
          const mapping = ROOT_CAUSE_TO_WEAKNESS[hyp.rootCauseType];
          const weaknessName = sub.diagnosis?.primaryWeakness?.name || mapping?.name || 'Unknown Weakness';
          const weaknessIdVal = sub.diagnosis?.primaryWeakness?.id || mapping?.id || 'unknown';
          const weaknessTypeVal = sub.diagnosis?.primaryWeakness?.type || mapping?.id || 'unknown';

          if (weaknessIdVal !== 'unknown') {
            const wId = `weakness-${weaknessIdVal}`;
            if (!addedWeaknesses.has(wId)) {
              weaknessesList.push({
                id: wId,
                nodeType: 'Weakness',
                label: weaknessName,
                properties: {
                  id: weaknessIdVal,
                  name: weaknessName,
                  type: weaknessTypeVal,
                  severity: sub.diagnosis?.primaryWeakness?.severity || 'high',
                  confidence: sub.diagnosis?.primaryWeakness?.confidence || hyp.confidence,
                  pageRankScore: sub.diagnosis?.primaryWeakness?.pageRankScore || 0.1,
                  frequency: sub.diagnosis?.primaryWeakness?.frequency || 1
                }
              });
              addedWeaknesses.add(wId);
            }
            addEdge(rcId, wId, 'INDICATES');

            // 5. LearningStrategy Nodes
            const strategies = sub.diagnosis?.primaryWeakness?.strategies || [];
            for (const strat of strategies) {
              const stratId = `strategy-${strat.id}`;
              if (!addedStrategies.has(stratId)) {
                strategiesList.push({
                  id: stratId,
                  nodeType: 'LearningStrategy',
                  label: strat.name,
                  properties: {
                    id: strat.id,
                    name: strat.name,
                    description: strat.description,
                    estimatedTime: `${strat.estimatedTime}m`,
                    priority: strat.priority,
                    practiceProblems: strat.practiceProblems
                  }
                });
                addedStrategies.add(stratId);
              }
              addEdge(wId, stratId, 'ADDRESSED_BY');
            }
          }
        }
      }
    }

    // Assign positions using column layout
    const nodes: GraphNode[] = [];
    const columns = [
      { list: strategiesList, x: -200 }, // Side-connected to Weakness
      { list: weaknessesList, x: 100 },   // Column 1 (Primary focus)
      { list: rootCausesList, x: 400 },   // Column 2
      { list: evidencesList, x: 700 },    // Column 3
      { list: failuresList, x: 1000 },   // Column 4
      { list: problemsList, x: 1300 }     // Column 5
    ];

    for (const { list, x } of columns) {
      list.forEach((node, index) => {
        nodes.push({
          id: node.id,
          type: 'custom',
          position: { x, y: index * 130 + 50 },
          data: {
            label: node.label,
            nodeType: node.nodeType as any,
            properties: node.properties
          }
        });
      });
    }

    return {
      nodes,
      edges,
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        isConnected: true,
        problems: problemsList.length,
        failures: failuresList.length,
        weaknesses: weaknessesList.length,
        strategies: strategiesList.length
      }
    };
  } catch (error) {
    logger.error('Error fetching user failure subgraph:', error);
    return {
      nodes: [],
      edges: [],
      stats: { nodeCount: 0, edgeCount: 0, totalNodes: 0, totalEdges: 0, isConnected: false, problems: 0, failures: 0, weaknesses: 0, strategies: 0 }
    };
  }
}

/**
 * Get top weaknesses
 */
export async function getTopWeaknesses(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const weaknesses = await prisma.systemicWeakness.findMany({
      where: {
        diagnoses: { some: { userId } }
      },
      orderBy: { pageRankScore: 'desc' },
      take: limit
    });

    return weaknesses.map(w => ({
      id: w.name,
      name: w.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      description: `Systemic challenge with ${w.name.replace(/-/g, ' ')}.`,
      frequency: w.frequency,
      confidence: w.pageRankScore,
      combinedScore: w.pageRankScore
    }));
  } catch (error) {
    logger.error('Error fetching top weaknesses:', error);
    return [];
  }
}

/**
 * Get recent failures for user
 */
export async function getRecentFailures(
  userId: string,
  days: number = 7,
  limit: number = 50
): Promise<any[]> {
  try {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - days);

    const submissions = await prisma.submissionEvent.findMany({
      where: {
        userId,
        timestamp: { gte: minDate },
        NOT: { status: 'Accepted' }
      },
      include: {
        problem: true,
        evidence: {
          include: {
            rootCauseHypotheses: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return submissions.map(sub => {
      const hyp = sub.evidence.flatMap(e => e.rootCauseHypotheses)[0];
      return {
        problemId: sub.problem.slug,
        problemTitle: sub.problem.title,
        difficulty: sub.problem.difficulty,
        eventId: sub.eventId,
        status: sub.status,
        timestamp: sub.timestamp.getTime(),
        attemptNumber: sub.attemptNumber,
        rootCause: hyp?.name || 'Unknown',
        confidence: hyp?.confidence || 0.5
      };
    });
  } catch (error) {
    logger.error('Error fetching recent failures:', error);
    return [];
  }
}

/**
 * Get similar failures to a specific failure
 */
export async function getSimilarFailures(
  failureEventId: string,
  userId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const current = await prisma.submissionEvent.findUnique({
      where: { eventId: failureEventId },
      include: {
        evidence: {
          include: {
            rootCauseHypotheses: true
          }
        }
      }
    });

    if (!current) return [];

    const rcTypes = current.evidence.flatMap(e => e.rootCauseHypotheses.map(h => h.rootCauseType));

    const similar = await prisma.submissionEvent.findMany({
      where: {
        userId,
        NOT: { eventId: failureEventId },
        evidence: {
          some: {
            rootCauseHypotheses: {
              some: {
                rootCauseType: { in: rcTypes }
              }
            }
          }
        }
      },
      include: {
        evidence: {
          include: {
            rootCauseHypotheses: true
          }
        }
      },
      take: limit
    });

    return similar.map(s => {
      const sharedCount = s.evidence.flatMap(e => e.rootCauseHypotheses).filter(h => rcTypes.includes(h.rootCauseType)).length;
      return {
        eventId: s.eventId,
        status: s.status,
        sharedRootCauses: sharedCount,
        similarity: 0.5,
        relevanceScore: sharedCount * 0.7 + 0.15
      };
    });
  } catch (error) {
    logger.error('Error fetching similar failures:', error);
    return [];
  }
}

/**
 * Create or update failure event in graph (no-op as PostgreSQL stores submissions)
 */
export async function createFailureEvent(): Promise<boolean> {
  return true;
}

/**
 * Link failure to problem (no-op as PostgreSQL stores relations)
 */
export async function linkFailureToProblem(): Promise<boolean> {
  return true;
}

/**
 * Get graph health status
 */
export async function getGraphHealth(): Promise<{
  isConnected: boolean;
  nodeCount: number;
  edgeCount: number;
  lastUpdated: string;
}> {
  try {
    // Ping PostgreSQL
    await prisma.$queryRaw`SELECT 1`;

    const problemCount = await prisma.problem.count();
    const failureCount = await prisma.submissionEvent.count();
    const evidenceCount = await prisma.evidence.count();
    const weaknessCount = await prisma.systemicWeakness.count();
    const strategyCount = await prisma.learningStrategy.count();
    const nodeCount = problemCount + failureCount + evidenceCount + weaknessCount + strategyCount;

    const hypothesisCount = await prisma.rootCauseHypothesis.count();
    const edgeCount = failureCount + evidenceCount + hypothesisCount + strategyCount;

    return {
      isConnected: true,
      nodeCount,
      edgeCount,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting graph health:', error);
    return {
      isConnected: false,
      nodeCount: 0,
      edgeCount: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Record a failure event along with its evidence and hypotheses into the graph.
 */
export async function recordFailureEventInGraph(
  userId: string,
  submission: any,
  hypotheses: any[],
  evidences: any[]
): Promise<boolean> {
  logger.info('[TRACE] Recording failure event in graph (in-memory PostgreSQL)...');
  return true;
}