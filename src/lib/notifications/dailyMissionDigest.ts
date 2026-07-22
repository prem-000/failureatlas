import { prisma } from '@/lib/db/prisma';
import { generateDailyMission, getProblemStage } from '@/lib/missions/generator';
import type { DailyMissionEmailData } from '../email/templates/dailyMission';

export async function generateDailyMissionDigest(userId: string): Promise<DailyMissionEmailData> {
  const mission = await generateDailyMission(userId);

  const pastMissionsCount = await prisma.dailyMission.count({
    where: { userId },
  });
  const missionNumber = pastMissionsCount + 1;

  // Save mission record in DB
  await prisma.dailyMission.create({
    data: {
      userId,
      primaryProblemSlug: mission.primaryProblem.slug,
      secondaryProblemSlug: mission.secondaryProblem?.slug || null,
      failureRisk: mission.failureRisk,
      successProbability: mission.successProbability,
      aiHint: mission.aiHint,
      learningGain: mission.expectedLearningGain as any,
      missionDate: new Date(),
      completed: false,
    },
  });

  // Calculate stage completion rate
  const successfulSubmissions = await prisma.submissionEvent.findMany({
    where: { userId, status: 'Accepted' },
    include: { problem: true },
  });
  const solvedProblemSlugs = new Set(successfulSubmissions.map(s => s.problem.slug));

  const allProblems = await prisma.leetcodeProblem.findMany();
  const stageProblems = allProblems.filter(
    p => getProblemStage(p.topics, p.patterns) === mission.primaryProblem.stage
  );
  const solvedInStage = stageProblems.filter(p => solvedProblemSlugs.has(p.slug)).length;
  const roadmapCompletion = stageProblems.length > 0
    ? Math.round((solvedInStage / stageProblems.length) * 100)
    : 0;

  return {
    missionNumber,
    roadmapName: mission.primaryProblem.stage,
    roadmapCompletion,
    primaryTitle: mission.primaryProblem.title,
    primarySlug: mission.primaryProblem.slug,
    primaryDifficulty: mission.primaryProblem.difficulty,
    secondaryTitle: mission.secondaryProblem?.title,
    secondarySlug: mission.secondaryProblem?.slug,
    secondaryDifficulty: mission.secondaryProblem?.difficulty,
    secondaryWeakness: mission.secondaryProblem?.targetedWeakness,
    failureRisk: Math.round(mission.failureRisk * 100),
    successProbability: Math.round(mission.successProbability * 100),
    estimatedTimeMinutes: 25,
    aiHint: mission.aiHint,
    expectedLearningGain: mission.expectedLearningGain,
  };
}
