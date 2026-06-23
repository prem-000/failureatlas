import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateDailyMission, getProblemStage } from '@/lib/missions/generator';
import { sendEmail, compileMissionEmailHtml } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

// Mark route as dynamic to prevent static export
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    logger.info('⏰ Daily Mission Cron Job triggered.');

    logger.info('✅ Authorization bypassed for debugging');

    // 2. Fetch all Google OAuth users who have daily mission emails enabled
    // If they have no UserPreferences entry yet, they default to enabled (dailyMissionEmail = true)
    const eligibleUsers = await prisma.user.findMany({
      where: {
        provider: 'google',
        OR: [
          {
            preferences: null
          },
          {
            preferences: {
              dailyMissionEmail: true
            }
          }
        ]
      },
      include: {
        preferences: true
      }
    });

    logger.info(`👥 Found ${eligibleUsers.length} eligible users.`);

    const results = [];

    // 3. Process each user sequentially
    for (const user of eligibleUsers) {
      try {
        logger.info(`👤 Generating daily mission for user email=${user.email} (id=${user.id})`);

        // Generate the mission
        const mission = await generateDailyMission(user.id);
        logger.info(`🎯 Mission generated for user: ${user.email}`);

        // Calculate mission number for this user
        const pastMissionsCount = await prisma.dailyMission.count({
          where: { userId: user.id }
        });
        const missionNumber = pastMissionsCount + 1;

        // Save mission to DB
        await prisma.dailyMission.create({
          data: {
            userId: user.id,
            primaryProblemSlug: mission.primaryProblem.slug,
            secondaryProblemSlug: mission.secondaryProblem?.slug || null,
            failureRisk: mission.failureRisk,
            successProbability: mission.successProbability,
            aiHint: mission.aiHint,
            learningGain: mission.expectedLearningGain as any,
            missionDate: new Date(),
            completed: false
          }
        });

        // Fetch user's solved status to compute roadmap completion rate
        const successfulSubmissions = await prisma.submissionEvent.findMany({
          where: { userId: user.id, status: 'Accepted' },
          include: { problem: true }
        });
        const solvedProblemSlugs = new Set(successfulSubmissions.map(s => s.problem.slug));

        // Compute completion percentage for primary problem's stage
        const allProblems = await prisma.leetcodeProblem.findMany();
        const stageProblems = allProblems.filter(
          p => getProblemStage(p.topics, p.patterns) === mission.primaryProblem.stage
        );
        const solvedInStage = stageProblems.filter(p => solvedProblemSlugs.has(p.slug)).length;
        const completionRate = stageProblems.length > 0
          ? Math.round((solvedInStage / stageProblems.length) * 100)
          : 0;

        // Compile HTML email template
        const emailHtml = compileMissionEmailHtml(
          missionNumber,
          mission.primaryProblem.stage,
          completionRate,
          mission
        );

        // Send email via Resend
        logger.info(`📧 Sending mission email to ${user.email}`);
        const sendResult = await sendEmail({
          to: user.email,
          subject: `🎯 Today's Praxis Mission #${missionNumber}`,
          html: emailHtml
        });

        logger.info('📨 Resend response:', sendResult);
        logger.info(`✅ Email sent successfully to ${user.email}`);

        results.push({
          userId: user.id,
          email: user.email,
          status: 'SUCCESS',
          primaryProblem: mission.primaryProblem.slug,
          secondaryProblem: mission.secondaryProblem?.slug || null,
          sendResult
        });
      } catch (userError: any) {
        logger.error(`❌ Failed to process daily mission for user id=${user.id}:`, userError);
        results.push({
          userId: user.id,
          email: user.email,
          status: 'FAILED',
          error: userError.message || 'Unknown user processing error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: eligibleUsers.length,
      results
    });
  } catch (error: any) {
    logger.error('❌ Daily mission cron job failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Cron execution failed' },
      { status: 500 }
    );
  }
}
