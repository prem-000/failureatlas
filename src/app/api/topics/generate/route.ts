/**
 * POST /api/topics/generate
 *
 * Dynamically generates personalized learning topics based on user's LeetCode submissions,
 * failures, and weaknesses.
 * 
 * Response: { topics: Array<{ id: string, label: string, reason: string }> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { logger } from '@/lib/logger';

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || undefined);
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    const userId = payload.userId;

    logger.info('🧠 Generating dynamic topics for user', { userId });

    // 1. Fetch user context
    const [weaknesses, recentSubmissions] = await Promise.all([
      prisma.systemicWeakness.findMany({
        where: { diagnoses: { some: { userId } } },
        orderBy: { pageRankScore: 'desc' },
        take: 5,
      }),
      prisma.submissionEvent.findMany({
        where: { userId },
        include: { problem: true, evidence: { include: { rootCauseHypotheses: true } } },
        orderBy: { timestamp: 'desc' },
        take: 30,
      }),
    ]);

    // 2. Build context
    const weaknessContext = weaknesses.map(w => `- ${w.name} (freq: ${w.frequency})`).join('\n') || 'None';
    
    const submissionContext = recentSubmissions.map(s => {
      const topHyp = s.evidence.flatMap(e => e.rootCauseHypotheses)[0];
      return `- [${s.problem.slug}] ${s.problem.title} (${s.status}) - Root Cause: ${topHyp?.name || 'None'}`;
    }).join('\n') || 'None';

    const prompt = `You are an expert LeetCode coach. Analyze the user's weaknesses and recent submissions to generate 4-6 highly personalized study topics.

WEAKNESSES:
${weaknessContext}

RECENT SUBMISSIONS:
${submissionContext}

Generate specific, granular topics that directly target their behavior (e.g., "Boundary Conditions in Binary Search", "Sliding Window on Strings", "Fast/Slow Pointers").
Do not just output generic topics like "Binary Search" unless their behavior justifies it.

Respond with ONLY valid JSON in this format:
{
  "topics": [
    { "id": "boundary-conditions-bs", "label": "Boundary Conditions in Binary Search", "reason": "You struggled with off-by-one errors in problems X and Y" }
  ]
}`;

    // 3. Call Groq
    const raw = await callGroq(prompt);
    let topics = [];
    try {
      const parsed = JSON.parse(raw);
      topics = parsed.topics || [];
    } catch (e) {
      logger.error('Failed to parse Groq topics response', { raw });
      throw new Error('Failed to parse AI response');
    }

    if (topics.length === 0) {
      topics = [{ id: 'arrays', label: 'Arrays & Hashing', reason: 'Fallback core topic' }];
    }

    return NextResponse.json({ success: true, topics });

  } catch (error) {
    logger.error('❌ Topic generation error:', error);
    return NextResponse.json({ success: false, error: 'Generation failed' }, { status: 500 });
  }
}
