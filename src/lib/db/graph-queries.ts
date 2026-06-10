/**
 * Neo4j Graph Query Functions
 * Performs semantic queries on the failure ontology.
 *
 * Used by:
 * - Bayesian engine (fetch priors)
 * - Analysis API (find similar failures)
 * - RAG system (retrieve learning strategies)
 */

import { runQuery } from './neo4j';
import { RootCauseType } from '../../types';

/**
 * Fetch prior probabilities for all root cause types from Neo4j.
 * Returns a map of rootCauseType -> probability.
 *
 * Query: MATCH (r:RootCause) RETURN r.type, r.confidence AS probability
 */
export async function queryRootCausePriors(): Promise<Record<RootCauseType, number>> {
  try {
    const results = await runQuery(
      `MATCH (r:RootCause) 
       RETURN r.type as type, r.confidence as probability`,
    );

    const rows = Array.isArray(results) ? (results as any[]) : [];
    const priors: Record<RootCauseType, number> = {} as Record<RootCauseType, number>;

    for (const record of rows) {
      const rec: any = record;
      const type = rec.type as RootCauseType;
      const probability = parseFloat(String(rec.probability)) || 0.1;
      priors[type] = probability;
    }

    // Ensure all 8 root cause types are present; use defaults if missing
    const allTypes: RootCauseType[] = [
      'boundary-condition-error',
      'algorithm-selection-mistake',
      'pattern-recognition-gap',
      'time-complexity-oversight',
      'space-complexity-oversight',
      'data-structure-mismatch',
      'implementation-detail-error',
      'input-output-handling-error',
    ];

    for (const type of allTypes) {
      if (!(type in priors)) {
        priors[type] = 0.125; // Uniform default (1/8)
      }
    }

    return priors;
  } catch (error) {
    console.error('Error fetching root cause priors from Neo4j:', error);
    // Return uniform priors as fallback
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
}

/**
 * Find similar past failures for a given root cause type.
 * Returns up to limit failures with metadata.
 *
 * Query: MATCH (r:RootCause {type})-[INDICATES]->(w:Weakness)<-[INDICATES]-(r2:RootCause)<-[rel:CO_OCCURS]-(f:FailureEvent)
 *        RETURN f.id, f.timestamp, f.status, r2.type, ...
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
    const results = await runQuery(
      `MATCH (r:RootCause {type: $rootCauseType})-[rel:INDICATES]->(w:Weakness)
       OPTIONAL MATCH (f:FailureEvent)-[ref:REFERENCES]->(r)
       RETURN 
         f.eventId as id,
         f.timestamp as timestamp,
         f.status as status,
         r.type as rootCauseType,
         w.severity as severity,
         ref.confidence as confidence
       ORDER BY f.timestamp DESC
       LIMIT $limit`,
      { rootCauseType, limit },
    );

    const rows = Array.isArray(results) ? (results as any[]) : [];

    return rows.map((record: any) => ({
      id: record.id || '',
      timestamp: record.timestamp || new Date().toISOString(),
      status: record.status || 'unknown',
      rootCauseType: (record.rootCauseType as RootCauseType) || rootCauseType,
      severity: record.severity || 'medium',
      confidence: parseFloat(String(record.confidence)) || 0.5,
    }));
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
 *
 * Query: MATCH (w:Weakness {id})-[rel:INDICATES]-(r:RootCause)
 *        OPTIONAL MATCH (w)-[rel2:ADDRESSED_BY]->(s:LearningStrategy)
 *        RETURN w.id, w.name, w.severity, collect(r) as rootCauses, collect(s) as strategies
 */
export async function queryWeaknessContext(weaknessId: string): Promise<{
  id: string;
  name: string;
  severity: string;
  rootCauses: Array<{ type: RootCauseType; confidence: number }>;
  strategies: Array<{ id: string; name: string; estimatedTime: number }>;
} | null> {
  try {
    const results = await runQuery(
      `MATCH (w:Weakness {id: $weaknessId})
       OPTIONAL MATCH (r:RootCause)-[rel:INDICATES]->(w)
       OPTIONAL MATCH (w)-[rel2:ADDRESSED_BY]->(s:LearningStrategy)
       RETURN 
         w.id as weaknessId,
         w.name as weaknessName,
         w.severity as severity,
         collect({type: r.type, confidence: rel.strength}) as rootCauses,
         collect({id: s.id, name: s.name, time: s.estimatedTime}) as strategies`,
      { weaknessId },
    );

    const rows = Array.isArray(results) ? (results as any[]) : [];
    if (rows.length === 0) {
      return null;
    }

    const record: any = rows[0];

    return {
      id: record.weaknessId || weaknessId,
      name: record.weaknessName || '',
      severity: record.severity || 'medium',
      rootCauses: (record.rootCauses || []).filter((r: any) => r?.type),
      strategies: (record.strategies || []).filter((s: any) => s?.id),
    };
  } catch (error) {
    console.error(`Error querying weakness context for ${weaknessId}:`, error);
    return null;
  }
}

/**
 * Get all learning recommendations for a specific weakness type.
 * Used by RAG system to enrich Claude prompts.
 *
 * Query: MATCH (w:Weakness {type})-[rel:ADDRESSED_BY]->(s:LearningStrategy)
 *        RETURN s.id, s.name, s.description, s.estimatedTime, s.practiceProblems
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
    const results = await runQuery(
      `MATCH (w:Weakness {type: $weaknessType})-[rel:ADDRESSED_BY]->(s:LearningStrategy)
       RETURN 
         s.id as id,
         s.name as name,
         s.description as description,
         s.estimatedTime as estimatedTime,
         s.practiceProblems as practiceProblems
       ORDER BY s.priority DESC
       LIMIT $limit`,
      { weaknessType, limit },
    );

    const rows = Array.isArray(results) ? (results as any[]) : [];

    return rows.map((record: any) => ({
      id: record.id || '',
      name: record.name || '',
      description: record.description || '',
      estimatedTime: parseInt(String(record.estimatedTime)) || 0,
      practiceProblems: Array.isArray(record.practiceProblems)
        ? record.practiceProblems
        : [],
    }));
  } catch (error) {
    console.error(
      `Error querying learning strategies for weakness ${weaknessType}:`,
      error,
    );
    return [];
  }
}

/**
 * Health check: verify Neo4j connectivity by counting root cause nodes.
 */
export async function checkNeo4jHealth(): Promise<boolean> {
  try {
    const results = await runQuery(
      'MATCH (r:RootCause) RETURN count(r) as count',
    );

    const rows = Array.isArray(results) ? (results as any[]) : [];
    if (rows.length > 0 && Number(rows[0].count) > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Neo4j health check failed:', error);
    return false;
  }
}
