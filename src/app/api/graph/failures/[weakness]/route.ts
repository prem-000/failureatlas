import { NextRequest } from 'next/server';
import { queryWeaknessContext, querySimilarFailures } from '@/lib/db/graph-queries';
import { successResponse, errorResponse, ApiError } from '@/lib/auth/middleware';
import { WeaknessType } from '@/types';

export const runtime = 'nodejs';

/**
 * GET /api/graph/failures/[weakness]
 *
 * Retrieve graph data for React Flow visualization.
 * Returns nodes and edges representing:
 * - Weakness node (center)
 * - Root cause nodes (connected to weakness)
 * - Failure event nodes (connected to root causes)
 */
export async function GET(
  request: NextRequest,
  context: any,
) {
  try {
    const params = context?.params || {};
    const weaknessId = params.weakness as WeaknessType;

    // Validate weakness type
    const validWeaknesses: WeaknessType[] = [
      'edge-case-reasoning',
      'algorithmic-pattern-recognition',
      'performance-analysis',
      'implementation-precision',
    ];

    if (!validWeaknesses.includes(weaknessId)) {
      throw new ApiError(
        `Invalid weakness type. Must be one of: ${validWeaknesses.join(', ')}`,
        400,
      );
    }

    // Query weakness context from Neo4j
    const weaknessContext = await queryWeaknessContext(weaknessId);

    if (!weaknessContext) {
      throw new ApiError(`Weakness not found: ${weaknessId}`, 404);
    }

    // Build React Flow nodes and edges
    const nodes = [];
    const edges = [];

    // Central weakness node
    nodes.push({
      id: `weakness-${weaknessId}`,
      type: 'default',
      data: {
        label: weaknessContext.name,
        type: 'Weakness',
        severity: weaknessContext.severity,
      },
      position: { x: 0, y: 0 },
      style: {
        background: '#3b82f6', // Blue for weakness
        border: '2px solid #1e40af',
        borderRadius: '8px',
        padding: '10px',
        color: 'white',
        fontWeight: 'bold',
      },
    });

    // Root cause nodes
    for (let i = 0; i < weaknessContext.rootCauses.length; i++) {
      const cause = weaknessContext.rootCauses[i];
      const angle = (i / weaknessContext.rootCauses.length) * 2 * Math.PI;
      const radius = 200;

      nodes.push({
        id: `root-cause-${i}`,
        type: 'default',
        data: {
          label: cause.type.replace(/-/g, ' '),
          type: 'RootCause',
          confidence: cause.confidence,
        },
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        },
        style: {
          background: '#ef4444', // Red for root cause
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '10px',
          color: 'white',
          fontWeight: 'bold',
        },
      });

      // Edge from weakness to root cause
      edges.push({
        id: `edge-weakness-to-${i}`,
        source: `weakness-${weaknessId}`,
        target: `root-cause-${i}`,
        animated: true,
        label: `${(cause.confidence * 100).toFixed(0)}%`,
        style: {
          stroke: '#3b82f6',
          strokeWidth: 2,
        },
      });

      // Query similar failures for this root cause
      const failures = await querySimilarFailures(cause.type as any, 3);

      // Add failure nodes
      for (let j = 0; j < failures.length; j++) {
        const failure = failures[j];
        const failureAngle = angle + (j - failures.length / 2) * 0.5;
        const failureRadius = 400;

        nodes.push({
          id: `failure-${i}-${j}`,
          type: 'default',
          data: {
            label: `Failure #${j + 1}`,
            type: 'FailureEvent',
            status: failure.status,
            timestamp: failure.timestamp,
            confidence: failure.confidence,
          },
          position: {
            x: Math.cos(failureAngle) * failureRadius,
            y: Math.sin(failureAngle) * failureRadius,
          },
          style: {
            background: '#6b7280', // Gray for failure
            border: '2px solid #4b5563',
            borderRadius: '8px',
            padding: '8px',
            color: 'white',
            fontSize: '12px',
          },
        });

        // Edge from root cause to failure
        edges.push({
          id: `edge-cause-to-failure-${i}-${j}`,
          source: `root-cause-${i}`,
          target: `failure-${i}-${j}`,
          label: `${(failure.confidence * 100).toFixed(0)}%`,
          style: {
            stroke: '#ef4444',
            strokeWidth: 1,
          },
        });
      }
    }

    // Add learning strategy nodes
    for (let i = 0; i < weaknessContext.strategies.length; i++) {
      const strategy = weaknessContext.strategies[i];
      const angle = Math.PI + (i / weaknessContext.strategies.length) * Math.PI;
      const radius = 250;

      nodes.push({
        id: `strategy-${i}`,
        type: 'default',
        data: {
          label: strategy.name,
          type: 'LearningStrategy',
          estimatedTime: strategy.estimatedTime,
        },
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        },
        style: {
          background: '#10b981', // Green for strategy
          border: '2px solid #059669',
          borderRadius: '8px',
          padding: '10px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px',
        },
      });

      // Edge from weakness to strategy
      edges.push({
        id: `edge-weakness-to-strategy-${i}`,
        source: `weakness-${weaknessId}`,
        target: `strategy-${i}`,
        style: {
          stroke: '#10b981',
          strokeWidth: 2,
          strokeDasharray: '5,5', // Dashed for strategy edges
        },
      });
    }

    return successResponse({
      nodes,
      edges,
      metadata: {
        weaknessId,
        weaknessName: weaknessContext.name,
        severity: weaknessContext.severity,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
    });
  } catch (error) {
    console.error('Error in graph endpoint:', error);
    return errorResponse(error);
  }
}
