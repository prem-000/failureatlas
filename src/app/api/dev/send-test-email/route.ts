import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { emailService } from '@/lib/email/email.service';
import { NotificationType, NotificationCategory } from '@/lib/email/types';

import * as welcomeTemplate from '@/lib/email/templates/welcome';
import * as dailyFailureTemplate from '@/lib/email/templates/dailyFailureSummary';
import * as dailyMissionTemplate from '@/lib/email/templates/dailyMission';
import * as practiceReminderTemplate from '@/lib/email/templates/practiceReminder';
import * as weeklyDigestTemplate from '@/lib/email/templates/weeklyDigest';
import * as engagementTemplate from '@/lib/email/templates/engagementReminder';
import type { EngagementReminderEmailData } from '@/lib/email/templates/engagementReminder';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email } = body;

    const recipient = email || process.env.GMAIL_USER || 'test@example.com';
    const emailType: NotificationType = type || NotificationType.WELCOME;

    let subject = 'Praxis Test Email';
    let html = '';
    let text = '';
    let category: NotificationCategory = NotificationCategory.SYSTEM;
    let templateVersion = 1;

    switch (emailType) {
      case NotificationType.WELCOME: {
        category = NotificationCategory.WELCOME;
        templateVersion = welcomeTemplate.TEMPLATE_VERSION;
        const data = { name: 'Test Developer' };
        subject = 'Welcome to Praxis 🚀';
        html = welcomeTemplate.generateHtml(data);
        text = welcomeTemplate.generateText(data);
        break;
      }

      case NotificationType.FAILURE_SUMMARY: {
        category = NotificationCategory.REPORT;
        templateVersion = dailyFailureTemplate.TEMPLATE_VERSION;
        const sampleData: dailyFailureTemplate.DailyFailureSummaryData = {
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          totalAttempted: 5,
          acceptedCount: 3,
          failedCount: 2,
          failedProblems: [
            {
              title: '704. Binary Search',
              slug: 'binary-search',
              verdict: 'Wrong Answer',
              rootCause: 'Off-by-one boundary index overflow',
              category: 'Boundary Conditions',
              confidence: 92,
              aiSuggestion: 'Verify middle index calculation using low + Math.floor((high - low) / 2).',
            },
            {
              title: '200. Number of Islands',
              slug: 'number-of-islands',
              verdict: 'Time Limit Exceeded',
              rootCause: 'Infinite DFS recursion loop without visited grid mutation',
              category: 'Graph Traversal',
              confidence: 88,
              aiSuggestion: 'Mutate cell to "0" immediately upon entering DFS recursion.',
            },
          ],
          categoryTrends: [
            { category: 'Boundary Conditions', change: '↓18%', direction: 'down' },
            { category: 'Graph Traversal', change: '↑11%', direction: 'up' },
          ],
          aiInsight: 'Your boundary condition checks improved significantly, but grid search recursion remains prone to TLE loops.',
          recommendedConcepts: ['Binary Search Invariants', 'Grid DFS Visited State'],
        };
        subject = `❌ Praxis Daily Failure Summary — ${sampleData.date}`;
        html = dailyFailureTemplate.generateHtml(sampleData);
        text = dailyFailureTemplate.generateText(sampleData);
        break;
      }

      case NotificationType.DAILY_MISSION: {
        category = NotificationCategory.LEARNING;
        templateVersion = dailyMissionTemplate.TEMPLATE_VERSION;
        const sampleData: dailyMissionTemplate.DailyMissionEmailData = {
          missionNumber: 42,
          roadmapName: 'Graphs & Trees',
          roadmapCompletion: 65,
          primaryTitle: '207. Course Schedule',
          primarySlug: 'course-schedule',
          primaryDifficulty: 'Medium',
          secondaryTitle: '210. Course Schedule II',
          secondarySlug: 'course-schedule-ii',
          secondaryDifficulty: 'Medium',
          secondaryWeakness: 'Cycle Detection in Directed Graphs',
          failureRisk: 35,
          successProbability: 65,
          estimatedTimeMinutes: 25,
          aiHint: '1. Use Kahn\'s algorithm (indegree array + queue).\n2. If processed nodes < total courses, a cycle exists.',
          expectedLearningGain: ['Kahn\'s Topological Sorting', 'Directed Acyclic Graph Invariants'],
        };
        subject = `🎯 Today's Praxis Mission #${sampleData.missionNumber}`;
        html = dailyMissionTemplate.generateHtml(sampleData);
        text = dailyMissionTemplate.generateText(sampleData);
        break;
      }

      case NotificationType.PRACTICE_REMINDER: {
        category = NotificationCategory.REMINDER;
        templateVersion = practiceReminderTemplate.TEMPLATE_VERSION;
        const sampleData: practiceReminderTemplate.PracticeReminderEmailData = {
          dueCount: 4,
          dueTopics: ['Binary Search', 'Sliding Window', 'Two Pointers'],
          estimatedTimeMinutes: 15,
        };
        subject = '🧠 Time To Practice';
        html = practiceReminderTemplate.generateHtml(sampleData);
        text = practiceReminderTemplate.generateText(sampleData);
        break;
      }

      case NotificationType.WEEKLY_DIGEST: {
        category = NotificationCategory.REPORT;
        templateVersion = weeklyDigestTemplate.TEMPLATE_VERSION;
        const sampleData: weeklyDigestTemplate.WeeklyDigestEmailData = {
          problemsSolved: 14,
          acceptanceRate: 78,
          streakDays: 6,
          strongestTopic: 'Two Pointers & Arrays',
          weakestTopic: 'Dynamic Programming',
          graphNodesUnlocked: 18,
          sm2RetentionRate: 88,
          estimatedMasteryPercentage: 74,
          aiRecommendation: 'Review 1D knapsack state reductions before tackling 2D grid DP problems.',
        };
        subject = '📊 Your Praxis Weekly Progress Report';
        html = weeklyDigestTemplate.generateHtml(sampleData);
        text = weeklyDigestTemplate.generateText(sampleData);
        break;
      }

      case NotificationType.ENGAGEMENT_REMINDER: {
        category = NotificationCategory.REMINDER;
        templateVersion = engagementTemplate.TEMPLATE_VERSION;
        const sampleData: EngagementReminderEmailData = {
          userName: 'Developer',
          daysInactive: 1,
          yesterdaySubmissionCount: 0,
          currentStreak: 0,
          suggestedDifficulty: 'Easy',
          estimatedPracticeTime: 15,
        };
        subject = '👋 We Missed You Yesterday';
        html = engagementTemplate.generateHtml(sampleData);
        text = engagementTemplate.generateText(sampleData);
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Invalid email type: ${type}` }, { status: 400 });
    }

    const sendResult = await emailService.sendEmail({
      to: recipient,
      subject: `[TEST] ${subject}`,
      html,
      text,
      emailType,
      category,
      templateVersion,
    });

    return NextResponse.json({
      success: sendResult.success,
      type: emailType,
      recipient,
      messageId: sendResult.messageId,
      error: sendResult.error,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
