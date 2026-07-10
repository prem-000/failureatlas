import { safeRedisGet, safeRedisSet, safeRedisDel } from '../redis';

const GRAPH_TTL = 15 * 60; // 15 minutes in seconds (as requested in user feedback)

export interface SubgraphDTO {
  nodes: any[];
  edges: any[];
  stats: {
    problems: number;
    failures: number;
    weaknesses: number;
    strategies: number;
    nodeCount?: number;
    edgeCount?: number;
  };
}

/**
 * Recursively converts Dates to strings to make subgraph data safe for JSON DTO caching
 */
function sanitizeItem(val: any): any {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) return val.map(sanitizeItem);
  if (typeof val === 'object') {
    const copy: Record<string, any> = {};
    for (const k of Object.keys(val)) {
      copy[k] = sanitizeItem(val[k]);
    }
    return copy;
  }
  return val;
}

/**
 * Maps sub-graph nodes, edges, and stats to a clean serializable DTO
 */
export function mapSubgraphToDTO(data: any): SubgraphDTO {
  return {
    nodes: sanitizeItem(data.nodes || []),
    edges: sanitizeItem(data.edges || []),
    stats: sanitizeItem(data.stats || { problems: 0, failures: 0, weaknesses: 0, strategies: 0 }),
  };
}

export async function getGraphCache(userId: string): Promise<SubgraphDTO | null> {
  return safeRedisGet<SubgraphDTO>(`v1:graph:${userId}`);
}

export async function setGraphCache(userId: string, data: any): Promise<void> {
  const dto = mapSubgraphToDTO(data);
  await safeRedisSet(`v1:graph:${userId}`, dto, GRAPH_TTL);
}

export async function delGraphCache(userId: string): Promise<void> {
  await safeRedisDel(`v1:graph:${userId}`);
}
