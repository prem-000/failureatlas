import { safeRedisGet, safeRedisSet, safeRedisDel } from '../redis';

const DASHBOARD_TTL = 2 * 60; // 2 minutes in seconds (as requested in user feedback)

export interface DashboardStatsDTO {
  stats: {
    totalSubmissions: number;
    acceptedSubmissions: number;
    weaknesses: number;
    acceptanceRate: number;
  };
  recentSubmissions: Array<{
    id: string;
    problemTitle: string;
    problemSlug: string;
    difficulty: string;
    status: string;
    language: string;
    timestamp: string; // ISO string
    attemptNumber: number;
  }>;
}

export async function getDashboardCache(userId: string): Promise<DashboardStatsDTO | null> {
  return safeRedisGet<DashboardStatsDTO>(`v1:dashboard:${userId}`);
}

export async function setDashboardCache(userId: string, data: DashboardStatsDTO): Promise<void> {
  await safeRedisSet(`v1:dashboard:${userId}`, data, DASHBOARD_TTL);
}

export async function delDashboardCache(userId: string): Promise<void> {
  await safeRedisDel(`v1:dashboard:${userId}`);
}
