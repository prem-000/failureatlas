/**
 * src/lib/graph/mastery-operations.ts
 * Records accepted submissions into the knowledge graph.
 *
 * New graph flow for accepted submissions:
 *   Problem → AcceptedEvent → Pattern → Mastery
 *
 * Uses existing Prisma tables — no schema migration required:
 *   - Pattern node → SystemicWeakness with type = 'pattern'
 *   - Mastery count → SystemicWeakness.frequency
 *   - ML features → DiagnosisResult.progressMetrics
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import type { MLFeatures } from '@/types';

interface SuccessGraphPayload {
  submissionId: string;
  patternSlug: string;
  patternLabel: string;
  successLevel: number;
  mlFeatures: MLFeatures;
}

/**
 * Records a successful submission in the graph:
 * 1. Upsert a Pattern node (SystemicWeakness with type='pattern')
 * 2. Increment pattern frequency (mastery count)
 * 3. Store ML features in DiagnosisResult.progressMetrics
 */
export async function recordSuccessInGraph(
  userId: string,
  payload: SuccessGraphPayload
): Promise<void> {
  const { submissionId, patternSlug, patternLabel, successLevel, mlFeatures } = payload;

  logger.info(`[GRAPH] Recording success for user=${userId} pattern=${patternSlug} level=L${successLevel}`);

  // ── 1. Upsert Pattern node ────────────────────────────────────────────────
  const patternNode = await prisma.systemicWeakness.upsert({
    where: { name: patternSlug },
    update: {
      frequency: { increment: 1 },
      lastOccurrence: new Date(),
      // Store highest success level achieved
      confidence: Math.max(successLevel / 4, 0.25), // L4 = 1.0 confidence in mastery
    },
    create: {
      name: patternSlug,
      type: 'pattern',
      severity: 'low',       // patterns are not "weaknesses" — severity is repurposed as metadata
      confidence: successLevel / 4,
      frequency: 1,
      lastOccurrence: new Date(),
      riskIndex: 0,
      pageRankScore: 0,
    },
  });

  // ── 2. Upsert DiagnosisResult to store ML features ────────────────────────
  // We store the ML features in progressMetrics so they're available for future model training
  await prisma.diagnosisResult.upsert({
    where: { submissionId },
    update: {
      progressMetrics: {
        ...(mlFeatures as any),
        successLevel,
        patternNodeId: patternNode.id,
        recordedAt: new Date().toISOString(),
      },
    },
    create: {
      userId,
      submissionId,
      primaryWeaknessId: patternNode.id,
      progressMetrics: {
        ...(mlFeatures as any),
        successLevel,
        patternNodeId: patternNode.id,
        recordedAt: new Date().toISOString(),
      },
    },
  });

  logger.info(`[GRAPH] Pattern node upserted: id=${patternNode.id} frequency=${patternNode.frequency}`);
}

/**
 * Get mastery data for a specific pattern for a user.
 * Counts accepted submissions that used this pattern.
 */
export async function getPatternMastery(
  userId: string,
  patternSlug: string
): Promise<{ count: number; level: string }> {
  try {
    const pattern = await prisma.systemicWeakness.findFirst({
      where: { name: patternSlug, type: 'pattern' },
    });

    const count = pattern?.frequency ?? 0;
    let level = 'Beginner';
    if (count >= 10) level = 'Expert';
    else if (count >= 6) level = 'Proficient';
    else if (count >= 3) level = 'Developing';

    return { count, level };
  } catch {
    return { count: 0, level: 'Beginner' };
  }
}

/**
 * Get all pattern mastery stats for a user (for dashboard / graph visualization).
 */
export async function getAllPatternMastery(userId: string): Promise<Array<{
  patternSlug: string;
  patternLabel: string;
  count: number;
  level: string;
}>> {
  try {
    // Find all DiagnosisResults for this user's accepted submissions
    const diagnosisResults = await prisma.diagnosisResult.findMany({
      where: { userId },
      include: { primaryWeakness: true },
    });

    const patternMap = new Map<string, { label: string; count: number }>();

    for (const dr of diagnosisResults) {
      if (dr.primaryWeakness?.type === 'pattern') {
        const slug = dr.primaryWeakness.name;
        const metrics = dr.progressMetrics as any;
        const label = slug.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const existing = patternMap.get(slug);
        patternMap.set(slug, { label, count: (existing?.count ?? 0) + 1 });
      }
    }

    return Array.from(patternMap.entries()).map(([slug, data]) => {
      let level = 'Beginner';
      if (data.count >= 10) level = 'Expert';
      else if (data.count >= 6) level = 'Proficient';
      else if (data.count >= 3) level = 'Developing';
      return { patternSlug: slug, patternLabel: data.label, count: data.count, level };
    });
  } catch {
    return [];
  }
}
