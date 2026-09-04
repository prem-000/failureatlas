/**
 * src/lib/diagnosis/problem-resolver.ts
 *
 * Problem resolution engine for FailureAtlas.
 * Matches user queries to problems in the database and retrieves the user's
 * specific attempt history (both failed and accepted) for targeted diagnosis.
 */

import { prisma } from '@/lib/db/prisma';
import type { SubmissionEvent as PrismaSubmissionEvent, Problem } from '@prisma/client';

export interface ProblemResolutionResult {
  targetProblem: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    topics: string[];
    url: string | null;
  } | null;
  targetProblemConfidence: number; // 0.0 to 1.0
  problemMentioned: boolean;
  userHasAttempted: boolean;
  attempts: (PrismaSubmissionEvent & { problem: Problem })[];
  latestAttempt: (PrismaSubmissionEvent & { problem: Problem }) | null;
  latestFailedAttempt: (PrismaSubmissionEvent & { problem: Problem }) | null;
  latestAcceptedAttempt: (PrismaSubmissionEvent & { problem: Problem }) | null;
}

// In-memory catalog cache with 10-minute TTL
interface ProblemSummary {
  id: string;
  slug: string;
  title: string;
  cleanTitle: string;
  problemNumber?: number;
  difficulty: string;
  topics: string[];
  url: string | null;
}

let cachedProblems: ProblemSummary[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function getProblemCatalog(): Promise<ProblemSummary[]> {
  const now = Date.now();
  if (cachedProblems && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedProblems;
  }

  try {
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        topics: true,
        url: true,
      },
    });

    cachedProblems = problems.map((p) => {
      // Extract number if title starts with "1. Two Sum" or similar
      const numMatch = p.title.match(/^(\d+)\.\s*(.*)$/);
      const problemNumber = numMatch ? parseInt(numMatch[1], 10) : undefined;
      const cleanTitle = numMatch ? numMatch[2].trim() : p.title.trim();

      return {
        id: p.id,
        slug: p.slug.toLowerCase().trim(),
        title: p.title,
        cleanTitle: cleanTitle.toLowerCase(),
        problemNumber,
        difficulty: p.difficulty,
        topics: p.topics,
        url: p.url,
      };
    });

    cacheTimestamp = now;
    return cachedProblems;
  } catch (err) {
    console.error('[ProblemResolver] Failed to load problem catalog:', err);
    return cachedProblems || [];
  }
}

/**
 * Normalizes query string for entity matching.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve target problem from user query and fetch user's attempts.
 */
export async function resolveProblemTarget(
  query: string,
  userId: string
): Promise<ProblemResolutionResult> {
  const emptyResult: ProblemResolutionResult = {
    targetProblem: null,
    targetProblemConfidence: 0.0,
    problemMentioned: false,
    userHasAttempted: false,
    attempts: [],
    latestAttempt: null,
    latestFailedAttempt: null,
    latestAcceptedAttempt: null,
  };

  if (!query || !query.trim()) {
    return emptyResult;
  }

  const catalog = await getProblemCatalog();
  if (catalog.length === 0) {
    return emptyResult;
  }

  const normalizedQuery = normalizeText(query);
  const queryTokens = normalizedQuery.split(' ');

  let bestMatch: ProblemSummary | null = null;
  let highestScore = 0.0;

  // 1. Check for Problem Number Patterns: #1, problem 1, leetcode 1, lc 1
  const numberRegexes = [
    /(?:problem|lc|leetcode|#)\s*(\d+)/i,
    /\b(\d+)\s*(?:st|nd|rd|th)?\s*problem\b/i,
  ];

  for (const regex of numberRegexes) {
    const match = query.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      const matchedByNum = catalog.find((p) => p.problemNumber === num);
      if (matchedByNum) {
        bestMatch = matchedByNum;
        highestScore = 0.95;
        break;
      }
    }
  }

  // 2. Exact slug matching
  if (!bestMatch) {
    for (const p of catalog) {
      if (
        normalizedQuery.includes(p.slug) ||
        normalizedQuery.includes(p.slug.replace(/-/g, ' '))
      ) {
        const score = 0.95;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = p;
        }
      }
    }
  }

  // 3. Exact clean title containment
  if (!bestMatch || highestScore < 0.9) {
    for (const p of catalog) {
      if (p.cleanTitle.length >= 3 && normalizedQuery.includes(p.cleanTitle)) {
        // Longer titles have higher specificity
        const score = Math.min(0.98, 0.85 + (p.cleanTitle.length / 50));
        if (score > highestScore) {
          highestScore = score;
          bestMatch = p;
        }
      }
    }
  }

  // 4. Token overlap scoring for multi-word titles (e.g. "two sum", "roman to integer")
  if (!bestMatch && queryTokens.length >= 2) {
    for (const p of catalog) {
      const titleTokens = p.cleanTitle.split(' ').filter((t) => t.length > 2);
      if (titleTokens.length === 0) continue;

      let matchedTokens = 0;
      for (const t of titleTokens) {
        if (queryTokens.includes(t)) {
          matchedTokens++;
        }
      }

      const ratio = matchedTokens / titleTokens.length;
      if (ratio >= 0.75 && matchedTokens >= 2) {
        const score = 0.75 + ratio * 0.15;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = p;
        }
      }
    }
  }

  // If no confident problem match found (< 0.70 threshold)
  if (!bestMatch || highestScore < 0.70) {
    return emptyResult;
  }

  // Hydrate user submissions for this problem from PostgreSQL
  try {
    const attempts = await prisma.submissionEvent.findMany({
      where: {
        userId,
        problemId: bestMatch.id,
      },
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        problem: true,
      },
    });

    const latestAttempt = attempts[0] || null;
    const latestFailedAttempt =
      attempts.find((a) => a.status !== 'Accepted') || null;
    const latestAcceptedAttempt =
      attempts.find((a) => a.status === 'Accepted') || null;

    return {
      targetProblem: {
        id: bestMatch.id,
        slug: bestMatch.slug,
        title: bestMatch.title,
        difficulty: bestMatch.difficulty,
        topics: bestMatch.topics,
        url: bestMatch.url,
      },
      targetProblemConfidence: highestScore,
      problemMentioned: true,
      userHasAttempted: attempts.length > 0,
      attempts,
      latestAttempt,
      latestFailedAttempt,
      latestAcceptedAttempt,
    };
  } catch (err) {
    console.error('[ProblemResolver] Error fetching attempts for problem:', err);
    return {
      targetProblem: {
        id: bestMatch.id,
        slug: bestMatch.slug,
        title: bestMatch.title,
        difficulty: bestMatch.difficulty,
        topics: bestMatch.topics,
        url: bestMatch.url,
      },
      targetProblemConfidence: highestScore,
      problemMentioned: true,
      userHasAttempted: false,
      attempts: [],
      latestAttempt: null,
      latestFailedAttempt: null,
      latestAcceptedAttempt: null,
    };
  }
}
