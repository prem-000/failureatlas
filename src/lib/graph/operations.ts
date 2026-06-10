/**
 * src/lib/graph/operations.ts
 * Neo4j graph query operations and Cypher query builder
 */

import { executeQuery, executeWriteQuery, isNeo4jConnected } from '@/lib/db/neo4j';
import { logger } from '@/lib/logger';

export interface GraphNode {
  id: string;
  type: 'Problem' | 'FailureEvent' | 'RootCause' | 'Weakness' | 'LearningStrategy';
  label: string;
  properties?: Record<string, any>;
  confidence?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    isConnected: boolean;
  };
}

/**
 * Get user's complete failure subgraph (all failures and related entities)
 */
export async function getUserFailureSubgraph(
  userId: string,
  limit: number = 300
): Promise<GraphData> {
  const connected = await isNeo4jConnected();
  
  if (!connected) {
    logger.warn('Neo4j not connected. Returning empty graph.');
    return {
      nodes: [],
      edges: [],
      stats: { nodeCount: 0, edgeCount: 0, isConnected: false }
    };
  }

  const query = `
    MATCH (f:FailureEvent {userId: $userId})
    OPTIONAL MATCH (p:Problem)-[rel_pf:TRIGGERED]->(f)
    OPTIONAL MATCH (f)-[rel_fe:HAS_EVIDENCE]->(e:Evidence)
    OPTIONAL MATCH (e)-[rel_er:SUGGESTS]->(r:RootCause)
    OPTIONAL MATCH (f)-[rel_fr:SUGGESTS]->(r:RootCause)
    OPTIONAL MATCH (r)-[rel_rw:INDICATES]->(w:Weakness)
    OPTIONAL MATCH (w)-[rel_wl:ADDRESSED_BY]->(l:LearningStrategy)
    RETURN p, f, e, r, w, l, rel_pf, rel_fe, rel_er, rel_fr, rel_rw, rel_wl
    LIMIT $limit
  `;

  try {
    const results = await executeQuery<any>(query, { userId, limit });
    
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeMap = new Set<string>();

    // Process results
    for (const result of results) {
      // Problem nodes
      if (result.p && result.p.properties) {
        const nodeId = `problem-${result.p.properties.problemId}`;
        if (!nodeMap.has(nodeId)) {
          nodes.push({
            id: nodeId,
            type: 'Problem',
            label: result.p.properties.title || result.p.properties.problemId,
            properties: result.p.properties,
            severity: 'medium'
          });
          nodeMap.add(nodeId);
        }
      }

      // FailureEvent nodes
      if (result.f && result.f.properties) {
        const nodeId = `failure-${result.f.properties.eventId}`;
        if (!nodeMap.has(nodeId)) {
          nodes.push({
            id: nodeId,
            type: 'FailureEvent',
            label: `Failure: ${result.f.properties.submissionStatus}`,
            properties: result.f.properties,
            confidence: 0.8
          });
          nodeMap.add(nodeId);
        }
      }

      // Evidence nodes
      if (result.e && result.e.properties) {
        const nodeId = `evidence-${result.e.properties.evidenceId}`;
        if (!nodeMap.has(nodeId)) {
          nodes.push({
            id: nodeId,
            type: 'RootCause',
            label: result.e.properties.description,
            properties: result.e.properties,
            confidence: result.e.properties.confidence
          });
          nodeMap.add(nodeId);
        }
      }

      // RootCause nodes
      if (result.r && result.r.properties) {
        const nodeId = `rootcause-${result.r.properties.causeId}`;
        if (!nodeMap.has(nodeId)) {
          nodes.push({
            id: nodeId,
            type: 'RootCause',
            label: result.r.properties.name,
            properties: result.r.properties,
            severity: 'high'
          });
          nodeMap.add(nodeId);
        }
      }

      // Weakness nodes
      if (result.w && result.w.properties) {
        const nodeId = `weakness-${result.w.properties.weaknessId}`;
        if (!nodeMap.has(nodeId)) {
          nodes.push({
            id: nodeId,
            type: 'Weakness',
            label: result.w.properties.name,
            properties: result.w.properties,
            confidence: result.w.properties.pageRankScore
          });
          nodeMap.add(nodeId);
        }
      }

      // LearningStrategy nodes
      if (result.l && result.l.properties) {
        const nodeId = `strategy-${result.l.properties.strategyId}`;
        if (!nodeMap.has(nodeId)) {
          nodes.push({
            id: nodeId,
            type: 'LearningStrategy',
            label: result.l.properties.name,
            properties: result.l.properties
          });
          nodeMap.add(nodeId);
        }
      }

      // Add edges
      if (result.rel_pf) {
        const src = `problem-${result.p.properties.problemId}`;
        const tgt = `failure-${result.f.properties.eventId}`;
        edges.push({
          id: `${src}-${tgt}`,
          source: src,
          target: tgt,
          type: 'TRIGGERED'
        });
      }

      if (result.rel_fe) {
        const src = `failure-${result.f.properties.eventId}`;
        const tgt = `evidence-${result.e.properties.evidenceId}`;
        edges.push({
          id: `${src}-${tgt}`,
          source: src,
          target: tgt,
          type: 'HAS_EVIDENCE'
        });
      }

      if (result.rel_er) {
        const src = `evidence-${result.e.properties.evidenceId}`;
        const tgt = `rootcause-${result.r.properties.causeId}`;
        edges.push({
          id: `${src}-${tgt}`,
          source: src,
          target: tgt,
          type: 'SUGGESTS'
        });
      }

      if (result.rel_rw) {
        const src = `rootcause-${result.r.properties.causeId}`;
        const tgt = `weakness-${result.w.properties.weaknessId}`;
        edges.push({
          id: `${src}-${tgt}`,
          source: src,
          target: tgt,
          type: 'INDICATES'
        });
      }

      if (result.rel_wl) {
        const src = `weakness-${result.w.properties.weaknessId}`;
        const tgt = `strategy-${result.l.properties.strategyId}`;
        edges.push({
          id: `${src}-${tgt}`,
          source: src,
          target: tgt,
          type: 'ADDRESSED_BY'
        });
      }
    }

    return {
      nodes,
      edges,
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        isConnected: true
      }
    };
  } catch (error) {
    logger.error('Error fetching user failure subgraph:', error);
    return {
      nodes: [],
      edges: [],
      stats: { nodeCount: 0, edgeCount: 0, isConnected: false }
    };
  }
}

/**
 * Get top weaknesses by PageRank score
 */
export async function getTopWeaknesses(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  const connected = await isNeo4jConnected();
  if (!connected) return [];

  const query = `
    MATCH (w:Weakness)<-[:INDICATES]-(r:RootCause)<-[:SUGGESTS]-(e:Evidence)
    <-[:HAS_EVIDENCE]-(f:FailureEvent {userId: $userId})
    WITH w, count(f) as frequency, avg(w.pageRankScore) as avgPageRank
    RETURN w.weaknessId as id, w.name as name, w.description as description,
           frequency, avgPageRank as confidence,
           (frequency * 0.6 + avgPageRank * 0.4) as combinedScore
    ORDER BY combinedScore DESC
    LIMIT $limit
  `;

  try {
    return await executeQuery(query, { userId, limit });
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
  const connected = await isNeo4jConnected();
  if (!connected) return [];

  const query = `
    MATCH (p:Problem)-[rel:TRIGGERED]->(f:FailureEvent {userId: $userId})
    WHERE f.timestamp > datetime().epochMillis - ($days * 24 * 60 * 60 * 1000)
    OPTIONAL MATCH (f)-[:HAS_EVIDENCE]->(e:Evidence)-[:SUGGESTS]->(r:RootCause)
    RETURN p.problemId as problemId, p.title as problemTitle, p.difficulty as difficulty,
           f.eventId as eventId, f.submissionStatus as status, f.timestamp as timestamp,
           f.attemptNumber as attemptNumber, r.name as rootCause, e.confidence as confidence
    ORDER BY f.timestamp DESC
    LIMIT $limit
  `;

  try {
    return await executeQuery(query, { userId, days, limit });
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
  const connected = await isNeo4jConnected();
  if (!connected) return [];

  const query = `
    MATCH (currentF:FailureEvent {eventId: $failureEventId})
    -[:HAS_EVIDENCE]->(e1:Evidence)-[:SUGGESTS]->(r:RootCause)
    MATCH (r)<-[:SUGGESTS]-(e2:Evidence)<-[:HAS_EVIDENCE]-(similarF:FailureEvent)
    WHERE similarF.userId = $userId AND similarF <> currentF
    WITH similarF, count(r) as sharedRootCauses
    MATCH (currentF)-[:TRIGGERED]-(p1:Problem)-[:SIMILAR_TO {similarity: similarity}]-(p2:Problem)-[:TRIGGERED]-(similarF)
    RETURN similarF.eventId as eventId, similarF.submissionStatus as status,
           sharedRootCauses, similarity,
           (sharedRootCauses * 0.7 + similarity * 0.3) as relevanceScore
    ORDER BY relevanceScore DESC
    LIMIT $limit
  `;

  try {
    return await executeQuery(query, { failureEventId, userId, limit });
  } catch (error) {
    logger.error('Error fetching similar failures:', error);
    return [];
  }
}

/**
 * Create or update failure event in graph
 */
export async function createFailureEvent(
  eventData: {
    eventId: string;
    userId: string;
    problemSlug: string;
    submissionStatus: string;
    timestamp: number;
    attemptNumber: number;
    [key: string]: any;
  }
): Promise<boolean> {
  const connected = await isNeo4jConnected();
  if (!connected) {
    logger.warn('Neo4j not connected. Skipping failure event creation.');
    return false;
  }

  const query = `
    CREATE (f:FailureEvent $properties)
    RETURN f
  `;

  try {
    return await executeWriteQuery(query, { properties: eventData });
  } catch (error) {
    logger.error('Error creating failure event:', error);
    return false;
  }
}

/**
 * Link failure to problem
 */
export async function linkFailureToProblem(
  failureEventId: string,
  problemSlug: string,
  userId: string
): Promise<boolean> {
  const connected = await isNeo4jConnected();
  if (!connected) return false;

  const query = `
    MATCH (p:Problem {problemId: $problemSlug})
    MATCH (f:FailureEvent {eventId: $failureEventId})
    CREATE (p)-[:TRIGGERED {userId: $userId, frequency: 1}]->(f)
    RETURN true
  `;

  try {
    return await executeWriteQuery(query, { failureEventId, problemSlug, userId });
  } catch (error) {
    logger.error('Error linking failure to problem:', error);
    return false;
  }
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
  const connected = await isNeo4jConnected();

  if (!connected) {
    return {
      isConnected: false,
      nodeCount: 0,
      edgeCount: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  try {
    const nodeCountResult = await executeQuery<any>('MATCH (n) RETURN count(n) as count');
    const edgeCountResult = await executeQuery<any>('MATCH ()-[r]->() RETURN count(r) as count');

    return {
      isConnected: true,
      nodeCount: nodeCountResult[0]?.count || 0,
      edgeCount: edgeCountResult[0]?.count || 0,
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
 * Record a failure event along with its evidence and hypotheses into the Neo4j graph.
 */
export async function recordFailureEventInGraph(
  userId: string,
  submission: any,
  hypotheses: any[],
  evidences: any[]
): Promise<boolean> {
  const connected = await isNeo4jConnected();
  if (!connected) return false;

  try {
    // 1. Create Problem and FailureEvent nodes
    const baseQuery = `
      MERGE (p:Problem {problemId: $problemSlug})
      ON CREATE SET p.title = $problemTitle, p.difficulty = $difficulty
      CREATE (f:FailureEvent {
        eventId: $eventId,
        userId: $userId,
        submissionStatus: $status,
        timestamp: $timestamp,
        attemptNumber: $attemptNumber
      })
      CREATE (p)-[:TRIGGERED {userId: $userId}]->(f)
    `;
    await executeWriteQuery(baseQuery, {
      userId,
      problemSlug: submission.problemSlug,
      problemTitle: submission.problemTitle || submission.problemSlug,
      difficulty: submission.problemDifficulty || 'Unknown',
      eventId: submission.eventId,
      status: submission.submissionStatus,
      timestamp: submission.timestamp ? new Date(submission.timestamp).getTime() : Date.now(),
      attemptNumber: submission.attemptNumber || 1
    });

    // 2. Insert Evidences and RootCauses
    if (evidences && evidences.length > 0) {
      const evidenceQuery = `
        MATCH (f:FailureEvent {eventId: $eventId})
        UNWIND $evidences AS ev
        CREATE (e:Evidence {
          evidenceId: ev.evidenceId,
          type: ev.type,
          description: ev.description,
          confidence: ev.confidence
        })
        CREATE (f)-[:HAS_EVIDENCE]->(e)
        WITH f, e
        UNWIND $hypotheses AS hyp
        MERGE (r:RootCause {causeId: hyp.rootCause})
        ON CREATE SET r.name = hyp.name
        CREATE (e)-[:SUGGESTS {confidence: hyp.confidence}]->(r)
        CREATE (f)-[:SUGGESTS {confidence: hyp.confidence}]->(r)
      `;
      await executeWriteQuery(evidenceQuery, {
        eventId: submission.eventId,
        evidences: evidences.map(e => ({
          evidenceId: e.evidenceId || `ev-${Math.random()}`,
          type: e.type || 'unknown',
          description: e.description || '',
          confidence: e.confidence || 0
        })),
        hypotheses: (hypotheses || []).map(h => ({
          rootCause: h.rootCause || h.rootCauseType || 'unknown',
          name: h.name || 'Unknown',
          confidence: h.confidence || 0
        }))
      });
    }

    return true;
  } catch (error) {
    logger.error('Failed to record failure event in graph', error);
    return false;
  }
}