/**
 * src/lib/db/neo4j.ts
 * Neo4j connection handler with connection pooling and error handling
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import { logger } from '@/lib/logger';

let driver: Driver | null = null;
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  encrypted?: boolean;
}

/**
 * Initialize Neo4j connection
 */
export async function initNeo4j(config?: Neo4jConfig): Promise<Driver | null> {
  try {
    const neo4jConfig = config || {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password',
      encrypted: process.env.NODE_ENV === 'production'
    };

    logger.info('🔌 Initializing Neo4j connection...', {
      uri: neo4jConfig.uri,
      username: neo4jConfig.username
    });

    driver = neo4j.driver(
      neo4jConfig.uri,
      neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30000,
        connectionLivenessCheckTimeout: 30000,
        maxTransactionRetryTime: 30000,
        encrypted: neo4jConfig.encrypted ? true : false,
      }
    );

    // Test connection
    const session = driver.session();
    await session.run('RETURN "Neo4j Connected" as message');
    await session.close();

    logger.info('✅ Neo4j connected successfully');
    connectionAttempts = 0; // Reset attempts on success
    return driver;
  } catch (error) {
    logger.error('❌ Neo4j connection failed', {
      error: error instanceof Error ? error.message : String(error),
      attempt: connectionAttempts + 1,
      maxRetries: MAX_RETRIES
    });

    connectionAttempts++;

    if (connectionAttempts < MAX_RETRIES) {
      logger.info(`🔄 Retrying Neo4j connection in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return initNeo4j(config);
    }

    logger.warn('⚠️ Max Neo4j connection retries exceeded. Running in fallback mode.');
    driver = null;
    return null;
  }
}

/**
 * Get Neo4j driver instance
 */
export function getNeo4jDriver(): Driver | null {
  if (!driver) {
    logger.warn('⚠️ Neo4j driver not initialized. Please call initNeo4j() first.');
    return null;
  }
  return driver;
}

/**
 * Execute Cypher query with automatic session management
 */
export const runQuery = executeQuery;
export async function executeQuery<T>(
  query: string,
  params?: Record<string, any>,
  options?: {
    database?: string;
    retryAttempts?: number;
  }
): Promise<T[]> {
  if (!driver) {
    logger.error('⚠️ Neo4j is offline. Query skipped:', query);
    return [];
  }

  const session = driver.session({
    database: options?.database || 'neo4j',
    defaultAccessMode: neo4j.session.READ
  });

  try {
    const result = await session.run(query, params);
    return result.records.map(record => {
      // Convert Neo4j types to plain JavaScript objects
      const obj: any = {};
      for (const key of record.keys) {
        const value = record.get(key);
        obj[key] = convertNeo4jValue(value);
      }
      return obj as T;
    });
  } catch (error) {
    logger.error('Neo4j query error:', {
      error: error instanceof Error ? error.message : String(error),
      query: query.substring(0, 200)
    });
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Execute write query
 */
export async function executeWriteQuery(
  query: string,
  params?: Record<string, any>
): Promise<boolean> {
  if (!driver) {
    logger.error('⚠️ Neo4j is offline. Write query skipped.');
    return false;
  }

  const session = driver.session({
    defaultAccessMode: neo4j.session.WRITE
  });

  try {
    const result = await session.writeTransaction(tx => tx.run(query, params));
    return result.summary.counters.updates().nodesCreated > 0 ||
           result.summary.counters.updates().nodesDeleted > 0 ||
           result.summary.counters.updates().propertiesSet > 0;
  } catch (error) {
    logger.error('Neo4j write query error:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  } finally {
    await session.close();
  }
}

/**
 * Check if Neo4j is connected
 */
export async function isNeo4jConnected(): Promise<boolean> {
  if (!driver) return false;

  try {
    const session = driver.session();
    await session.run('RETURN 1');
    await session.close();
    return true;
  } catch (error) {
    logger.warn('Neo4j health check failed');
    return false;
  }
}

/**
 * Close Neo4j connection (call on app shutdown)
 */
export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    logger.info('Neo4j connection closed');
  }
}

/**
 * Convert Neo4j native types to JavaScript types
 */
function convertNeo4jValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Neo4j Integer
  if (neo4j.isInt(value)) {
    return neo4j.integer.toNumber(value);
  }

  // Handle Neo4j Node
  if (neo4j.isNode(value)) {
    return {
      id: neo4j.integer.toNumber(value.identity),
      labels: value.labels,
      properties: value.properties
    };
  }

  // Handle Neo4j Relationship
  if (neo4j.isRelationship(value)) {
    return {
      id: neo4j.integer.toNumber(value.identity),
      type: value.type,
      properties: value.properties
    };
  }

  // Handle Neo4j Path
  if (neo4j.isPath(value)) {
    return {
      segments: value.segments.map((segment: any) => ({
        start: convertNeo4jValue(segment.start),
        relationship: convertNeo4jValue(segment.relationship),
        end: convertNeo4jValue(segment.end)
      }))
    };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(convertNeo4jValue);
  }

  // Handle objects
  if (typeof value === 'object') {
    const converted: any = {};
    for (const key in value) {
      converted[key] = convertNeo4jValue(value[key]);
    }
    return converted;
  }

  return value;
}

/**
 * Get basic Neo4j statistics
 */
export async function getNeo4jStats(): Promise<{
  nodeCount: number;
  relationshipCount: number;
  isConnected: boolean;
} | null> {
  if (!driver) return null;

  try {
    const session = driver.session();
    const nodeResult = await session.run(
      'MATCH (n) RETURN count(n) as count'
    );
    const relResult = await session.run(
      'MATCH ()-[r]->() RETURN count(r) as count'
    );
    await session.close();

    const nodeCount = neo4j.integer.toNumber(nodeResult.records[0].get('count'));
    const relCount = neo4j.integer.toNumber(relResult.records[0].get('count'));

    return {
      nodeCount,
      relationshipCount: relCount,
      isConnected: true
    };
  } catch (error) {
    logger.error('Failed to get Neo4j stats:', error);
    return null;
  }
}