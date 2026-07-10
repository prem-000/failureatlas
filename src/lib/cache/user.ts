import { safeRedisGet, safeRedisSet, safeRedisDel } from '../redis';

const USER_TTL = 30 * 60; // 30 minutes in seconds

export interface UserCacheDTO {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    apiKey: string | null;
    createdAt: string;
  };
  stats: {
    lastSubmissionAt: string | null;
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number;
    uniqueProblems: number;
    languageDistribution: Array<{ language: string; count: number }>;
    difficultyDistribution: Array<{ difficulty: string; count: number }>;
    activityTimeline: Array<{ date: string; count: number }>;
    topWeaknesses: Array<{
      name: string;
      severity: string;
      frequency: number;
      pageRankScore: number;
      lastOccurrence: string;
    }>;
  };
}

export async function getUserCache(userId: string): Promise<UserCacheDTO | null> {
  return safeRedisGet<UserCacheDTO>(`v1:user:${userId}`);
}

export async function setUserCache(userId: string, data: UserCacheDTO): Promise<void> {
  await safeRedisSet(`v1:user:${userId}`, data, USER_TTL);
}

export async function delUserCache(userId: string): Promise<void> {
  await safeRedisDel(`v1:user:${userId}`);
}
