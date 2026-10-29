/**
 * src/lib/diagnosis/skill-inference.ts
 *
 * Evidence-based DSA skill and proficiency inference engine.
 * Infers user proficiency dynamically from submission history, difficulty breakdown,
 * failure patterns, and query complexity without forcing role selection.
 */

import { prisma } from '@/lib/db/prisma';

export type DSASkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Provisional';

export interface InferredSkillProfile {
  level: DSASkillLevel;
  confidence: number; // 0 - 100
  isProvisional: boolean;
  metrics: {
    totalSubmissions: number;
    acceptedCount: number;
    failedCount: number;
    acceptanceRate: number; // 0 - 100
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    dominantWeaknesses: string[];
    strongTopics: string[];
    repeatedAttemptAverage: number;
  };
  summary: string;
  rationale: string;
}

export class SkillInferenceEngine {
  /**
   * Infers proficiency from actual database submission events and failure records
   */
  async inferProficiency(userId: string, queryComplexity?: 'basic' | 'moderate' | 'complex'): Promise<InferredSkillProfile> {
    if (!userId) {
      return this.createProvisionalProfile('No user authenticated. Providing accessible foundation explanation.');
    }

    try {
      const submissions = await prisma.submissionEvent.findMany({
        where: { userId },
        include: {
          problem: {
            select: {
              difficulty: true,
              topics: true,
              title: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      if (submissions.length === 0) {
        return this.createProvisionalProfile(
          'No prior submissions recorded. Using provisional baseline with progressive, step-by-step guidance.'
        );
      }

      // Calculate concrete metrics
      const totalSubmissions = submissions.length;
      const acceptedSubs = submissions.filter((s) => s.status.toLowerCase() === 'accepted');
      const failedSubs = submissions.filter((s) => s.status.toLowerCase() !== 'accepted');
      const acceptedCount = acceptedSubs.length;
      const failedCount = failedSubs.length;
      const acceptanceRate = Math.round((acceptedCount / totalSubmissions) * 100);

      // Unique problems solved by difficulty
      const solvedProblems = new Map<string, string>();
      for (const sub of acceptedSubs) {
        if (sub.problem) {
          solvedProblems.set(sub.problemId, sub.problem.difficulty);
        }
      }

      let easySolved = 0;
      let mediumSolved = 0;
      let hardSolved = 0;

      for (const diff of solvedProblems.values()) {
        const d = diff.toLowerCase();
        if (d.includes('easy')) easySolved++;
        else if (d.includes('medium')) mediumSolved++;
        else if (d.includes('hard')) hardSolved++;
      }

      // Repeated attempts calculation
      const problemAttempts = new Map<string, number>();
      for (const s of submissions) {
        problemAttempts.set(s.problemId, (problemAttempts.get(s.problemId) || 0) + 1);
      }
      const attemptCounts = Array.from(problemAttempts.values());
      const avgAttempts = attemptCounts.length > 0
        ? Number((attemptCounts.reduce((a, b) => a + b, 0) / attemptCounts.length).toFixed(1))
        : 1.0;

      // Identify topic strengths vs recurring failure topics
      const topicFailures = new Map<string, number>();
      const topicSuccess = new Map<string, number>();

      for (const sub of submissions) {
        const topics = sub.problem?.topics || [];
        const isSuccess = sub.status.toLowerCase() === 'accepted';
        for (const t of topics) {
          if (isSuccess) {
            topicSuccess.set(t, (topicSuccess.get(t) || 0) + 1);
          } else {
            topicFailures.set(t, (topicFailures.get(t) || 0) + 1);
          }
        }
      }

      const dominantWeaknesses = Array.from(topicFailures.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([topic]) => topic);

      const strongTopics = Array.from(topicSuccess.entries())
        .filter(([topic, count]) => count >= 2 && (topicFailures.get(topic) || 0) <= count)
        .map(([topic]) => topic)
        .slice(0, 3);

      // Determine level and confidence
      let level: DSASkillLevel = 'Beginner';
      let confidence = 50;

      if (totalSubmissions < 3) {
        level = 'Provisional';
        confidence = 45;
      } else if (hardSolved >= 3 || (mediumSolved >= 15 && acceptanceRate >= 65)) {
        level = 'Advanced';
        confidence = Math.min(95, 75 + Math.min(20, hardSolved * 5));
      } else if (mediumSolved >= 3 || easySolved >= 8) {
        level = 'Intermediate';
        confidence = Math.min(90, 65 + Math.min(20, mediumSolved * 4));
      } else {
        level = 'Beginner';
        confidence = Math.min(85, 55 + Math.min(25, easySolved * 5));
      }

      const isProvisional = level === 'Provisional' || totalSubmissions < 3;

      const rationale = isProvisional
        ? `Provisional estimate based on ${totalSubmissions} recorded submission(s). Tailoring guidance with intuitive foundations.`
        : `Inferred ${level} proficiency based on ${totalSubmissions} submissions (${easySolved} Easy, ${mediumSolved} Medium, ${hardSolved} Hard solved) with ${acceptanceRate}% overall pass rate.`;

      const summary = `${level} (${confidence}% confidence)`;

      return {
        level,
        confidence,
        isProvisional,
        metrics: {
          totalSubmissions,
          acceptedCount,
          failedCount,
          acceptanceRate,
          easySolved,
          mediumSolved,
          hardSolved,
          dominantWeaknesses,
          strongTopics,
          repeatedAttemptAverage: avgAttempts,
        },
        summary,
        rationale,
      };
    } catch (err) {
      console.warn('[SkillInference] Error accessing submission history:', err);
      return this.createProvisionalProfile('History inspection unavailable. Using provisional general guidance.');
    }
  }

  private createProvisionalProfile(reason: string): InferredSkillProfile {
    return {
      level: 'Provisional',
      confidence: 40,
      isProvisional: true,
      metrics: {
        totalSubmissions: 0,
        acceptedCount: 0,
        failedCount: 0,
        acceptanceRate: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        dominantWeaknesses: [],
        strongTopics: [],
        repeatedAttemptAverage: 0,
      },
      summary: 'Provisional (Sparse History)',
      rationale: reason,
    };
  }
}

export const defaultSkillInference = new SkillInferenceEngine();
