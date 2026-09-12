import crypto from 'crypto';

export interface RecommendationItem {
  strategyId?: string;
  id?: string;
  name: string;
  description: string;
  estimatedTime?: number | string;
  priority?: string | number;
  practiceProblems?: any[];
  [key: string]: any;
}

const STOP_WORDS = new Set([
  'mastery', 'pattern', 'checklist', 'drill', 'fundamentals',
  'guide', 'consolidation', 'based', 'technique', 'review',
  'practice', 'understanding', 'approach', 'problems', 'learn',
  'with', 'and', 'for', 'the', 'core', 'handling', 'error',
]);

/**
 * Extracts significant tokens from name and description for semantic near-duplicate matching
 */
export function extractSignificantTokens(name: string, description: string): string[] {
  const words = `${name || ''} ${description || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  return Array.from(new Set(words)).sort();
}

/**
 * Normalizes text for semantic near-duplicate matching:
 * lowercases, removes filler words, and hashes/joins significant keywords
 */
export function normalizeRecommendationKey(name: string, description: string): string {
  const tokens = extractSignificantTokens(name, description);
  if (tokens.length > 0) {
    // Pick top keywords
    return tokens.slice(0, 3).join('-');
  }

  const raw = `${(name || '').trim().toLowerCase()}|${(description || '').trim().toLowerCase()}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

/**
 * Computes Jaccard similarity between two token sets
 */
function tokenSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Deduplicates an array of recommendation items by strategyId or normalized title+description.
 * Preserves higher priority or merges problem lists when duplicates are encountered.
 */
export function deduplicateRecommendations<T extends RecommendationItem>(recommendations: T[]): T[] {
  if (!Array.isArray(recommendations) || recommendations.length <= 1) {
    return recommendations || [];
  }

  const result: T[] = [];
  const tokenMap: { item: T; tokens: string[] }[] = [];

  for (const item of recommendations) {
    if (!item) continue;

    const tokens = extractSignificantTokens(item.name, item.description);

    // 1. Check if matching strategyId exists
    const matchById = item.strategyId
      ? result.find((r) => r.strategyId === item.strategyId)
      : null;

    // 2. Check if near duplicate by token similarity (Jaccard >= 0.5 or subset of single significant token)
    let matchByTokens: T | null = null;
    if (!matchById) {
      for (const entry of tokenMap) {
        const sim = tokenSimilarity(entry.tokens, tokens);
        const sharesSignificant =
          entry.tokens.length > 0 &&
          tokens.length > 0 &&
          (entry.tokens.some((t) => tokens.includes(t)) && (sim >= 0.33 || entry.tokens.includes('stack') && tokens.includes('stack')));

        if (sim >= 0.5 || sharesSignificant) {
          matchByTokens = entry.item;
          break;
        }
      }
    }

    const existing = matchById || matchByTokens;

    if (existing) {
      // Merge with existing
      const mergedProblems = [
        ...(existing.practiceProblems || []),
        ...(item.practiceProblems || []),
      ];

      const uniqueProblems = Array.from(
        new Map(
          mergedProblems.map((p) => [
            typeof p === 'string' ? p : p?.problemSlug || JSON.stringify(p),
            p,
          ])
        ).values()
      );

      existing.practiceProblems = uniqueProblems;

      // Keep richer description
      if ((item.description?.length || 0) > (existing.description?.length || 0)) {
        existing.description = item.description;
      }
    } else {
      const copy = { ...item };
      result.push(copy);
      tokenMap.push({ item: copy, tokens });
    }
  }

  return result;
}
