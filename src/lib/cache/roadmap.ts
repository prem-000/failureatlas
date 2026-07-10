import { safeRedisGet, safeRedisSet, safeRedisDel } from '../redis';

const ROADMAP_TTL = 24 * 60 * 60; // 24 hours in seconds

export interface RoadmapStateDTO {
  id: string;
  userId: string;
  topic: string;
  currentLevel: number;
  levels: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * Maps a Prisma RoadmapState to a clean, serializable JSON DTO
 */
export function mapRoadmapToDTO(state: any): RoadmapStateDTO | null {
  if (!state) return null;
  return {
    id: state.id,
    userId: state.userId,
    topic: state.topic,
    currentLevel: state.currentLevel,
    levels: state.levels,
    createdAt: state.createdAt instanceof Date ? state.createdAt.toISOString() : state.createdAt,
    updatedAt: state.updatedAt instanceof Date ? state.updatedAt.toISOString() : state.updatedAt,
  };
}

/**
 * Retrieves a topic-specific roadmap for a user from their dictionary cache
 */
export async function getRoadmapCache(userId: string, topic: string): Promise<RoadmapStateDTO | null> {
  const dictionary = await safeRedisGet<Record<string, RoadmapStateDTO | null>>(`v1:roadmap:${userId}`);
  if (dictionary && dictionary[topic] !== undefined) {
    return dictionary[topic];
  }
  return null;
}

/**
 * Stores a topic-specific roadmap for a user inside their dictionary cache
 */
export async function setRoadmapCache(userId: string, topic: string, data: any): Promise<void> {
  let dictionary = await safeRedisGet<Record<string, RoadmapStateDTO | null>>(`v1:roadmap:${userId}`);
  if (!dictionary) {
    dictionary = {};
  }
  dictionary[topic] = mapRoadmapToDTO(data);
  await safeRedisSet(`v1:roadmap:${userId}`, dictionary, ROADMAP_TTL);
}

/**
 * Clears the entire roadmap cache for a user
 */
export async function delRoadmapCache(userId: string): Promise<void> {
  await safeRedisDel(`v1:roadmap:${userId}`);
}
