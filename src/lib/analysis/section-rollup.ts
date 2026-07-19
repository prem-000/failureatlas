/**
 * Section Rollup
 *
 * Computes section-level mastery using plain SQL aggregates.
 * Section-level metrics (frequency, recency-weighted mastery score) are
 * computed at query time rather than stored in a graph database.
 *
 * Mastery formula:
 *   masteryScore = 1 - (recency_weighted_failure_rate)
 *   where recent failures (last 30 days) are weighted 0.7 and
 *   older failures are weighted 0.3
 */

import { PrismaClient } from '@prisma/client';
import { SECTIONS, getSectionsForWeakness } from './concept-mapper';
import type { EvidenceType } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SectionMastery {
  sectionSlug: string;
  sectionName: string;
  masteryScore: number;     // 0–1, higher = better
  frequency: number;        // total failure count
  recentFrequency: number;  // failures in last 30 days
  lastOccurrence: Date | null;
  isWeak: boolean;          // flagged if mastery < threshold
  topWeaknesses: Array<{
    type: EvidenceType;
    count: number;
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Section is considered weak if mastery falls below this threshold */
const WEAKNESS_THRESHOLD = 0.5;

/** Window for "recent" failures */
const RECENT_WINDOW_DAYS = 30;

/** Weight for recent vs. historical failures in mastery calculation */
const RECENT_WEIGHT = 0.7;
const HISTORICAL_WEIGHT = 0.3;

/** Maximum failures before mastery floors at 0 */
const MAX_FAILURE_COUNT = 50;

// ─── Rollup Computation ──────────────────────────────────────────────────────

/**
 * Compute mastery scores for all sections for a given user.
 * Uses Evidence records + concept mapping to roll up per section.
 *
 * @param prisma  Prisma client instance
 * @param userId  User to compute mastery for
 * @returns Array of SectionMastery, one per section with any failures
 */
export async function computeSectionMastery(
  prisma: PrismaClient,
  userId: string
): Promise<SectionMastery[]> {
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Fetch all evidence for the user's failed submissions
  const evidenceRecords = await prisma.evidence.findMany({
    where: {
      submission: {
        userId,
        status: {
          not: 'Accepted',
        },
      },
    },
    select: {
      type: true,
      extractedAt: true,
      submission: {
        select: {
          timestamp: true,
        },
      },
    },
  });

  // Build per-section failure counts
  const sectionData: Record<string, {
    total: number;
    recent: number;
    lastOccurrence: Date | null;
    weaknessCounts: Record<string, number>;
  }> = {};

  // Initialize all sections
  for (const slug of Object.keys(SECTIONS)) {
    sectionData[slug] = {
      total: 0,
      recent: 0,
      lastOccurrence: null,
      weaknessCounts: {},
    };
  }

  // Distribute evidence to sections via concept mapping
  for (const evidence of evidenceRecords) {
    const evidenceType = evidence.type as EvidenceType;
    const sections = getSectionsForWeakness(evidenceType);
    const ts = evidence.submission.timestamp;
    const isRecent = ts >= recentCutoff;

    for (const section of sections) {
      const data = sectionData[section.slug];
      if (!data) continue;

      data.total += 1;
      if (isRecent) data.recent += 1;
      if (!data.lastOccurrence || ts > data.lastOccurrence) {
        data.lastOccurrence = ts;
      }
      data.weaknessCounts[evidenceType] = (data.weaknessCounts[evidenceType] || 0) + 1;
    }
  }

  // Compute mastery scores
  const results: SectionMastery[] = [];

  for (const [slug, data] of Object.entries(sectionData)) {
    const sectionDef = SECTIONS[slug];
    if (!sectionDef) continue;

    // Mastery = 1 - weighted failure rate
    // Failure rate is capped at 1.0 (when failures >= MAX_FAILURE_COUNT)
    const recentRate = Math.min(1.0, data.recent / MAX_FAILURE_COUNT);
    const historicalRate = Math.min(1.0, data.total / MAX_FAILURE_COUNT);
    const weightedFailureRate = RECENT_WEIGHT * recentRate + HISTORICAL_WEIGHT * historicalRate;
    const masteryScore = Math.max(0, 1 - weightedFailureRate);

    // Top weaknesses by count
    const topWeaknesses = Object.entries(data.weaknessCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({
        type: type as EvidenceType,
        count,
      }));

    results.push({
      sectionSlug: slug,
      sectionName: sectionDef.name,
      masteryScore: Math.round(masteryScore * 1000) / 1000,
      frequency: data.total,
      recentFrequency: data.recent,
      lastOccurrence: data.lastOccurrence,
      isWeak: masteryScore < WEAKNESS_THRESHOLD,
      topWeaknesses,
    });
  }

  // Sort: weakest sections first
  results.sort((a, b) => a.masteryScore - b.masteryScore);

  return results;
}

/**
 * Update the Section table in the database with computed mastery scores.
 * Called periodically or after new evidence is ingested.
 */
export async function persistSectionMastery(
  prisma: PrismaClient,
  userId: string
): Promise<void> {
  const mastery = await computeSectionMastery(prisma, userId);

  for (const section of mastery) {
    await prisma.section.upsert({
      where: { slug: section.sectionSlug },
      create: {
        name: section.sectionName,
        slug: section.sectionSlug,
        description: SECTIONS[section.sectionSlug]?.description ?? '',
        masteryScore: section.masteryScore,
        frequency: section.frequency,
        lastOccurrence: section.lastOccurrence,
        isWeak: section.isWeak,
      },
      update: {
        masteryScore: section.masteryScore,
        frequency: section.frequency,
        lastOccurrence: section.lastOccurrence,
        isWeak: section.isWeak,
      },
    });
  }
}

/**
 * Get weak sections for a user (mastery < threshold).
 */
export async function getWeakSections(
  prisma: PrismaClient,
  userId: string
): Promise<SectionMastery[]> {
  const all = await computeSectionMastery(prisma, userId);
  return all.filter(s => s.isWeak);
}
