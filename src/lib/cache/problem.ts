import { safeRedisGet, safeRedisSet, safeRedisDel } from '../redis';

const PROBLEM_TTL = 7 * 24 * 60 * 60; // 7 days in seconds (as requested in user feedback)

export interface ProblemDTO {
  id: string;
  leetcodeId: number;
  slug: string;
  title: string;
  difficulty: string;
  topics: string[];
  patterns: string[];
  prerequisites: string[];
  createdAt: string;
}

/**
 * Maps a Prisma LeetcodeProblem to a clean, serializable JSON DTO
 */
export function mapProblemToDTO(problem: any): ProblemDTO | null {
  if (!problem) return null;
  return {
    id: problem.id,
    leetcodeId: problem.leetcodeId,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    topics: problem.topics || [],
    patterns: problem.patterns || [],
    prerequisites: problem.prerequisites || [],
    createdAt: problem.createdAt instanceof Date ? problem.createdAt.toISOString() : problem.createdAt,
  };
}

export async function getProblemCache(slug: string): Promise<ProblemDTO | null> {
  return safeRedisGet<ProblemDTO>(`v1:problem:${slug}`);
}

export async function setProblemCache(slug: string, data: any): Promise<void> {
  const dto = mapProblemToDTO(data);
  if (dto) {
    await safeRedisSet(`v1:problem:${slug}`, dto, PROBLEM_TTL);
  }
}

export async function delProblemCache(slug: string): Promise<void> {
  await safeRedisDel(`v1:problem:${slug}`);
}
