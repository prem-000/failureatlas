/**
 * POST /api/cheatsheet/generate
 *
 * Dynamically generates a personalized cheat sheet based on topic and weaknesses.
 * 
 * Body: { topic: string }
 * Response: { template: string, mistakes: string[], complexity: { time: string, space: string }, keyInsights: string[] }
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

    let body: { topic?: string } = {};
    try { body = await request.json(); } catch {}
    const topic = body.topic || 'General DSA';

    logger.info('🧠 Generating personalized cheat sheet', { userId, topic });

    // 1. Fetch user weaknesses and recent failures related to this topic
    const [weaknesses, failures] = await Promise.all([
      prisma.systemicWeakness.findMany({
        where: { diagnoses: { some: { userId } } },
        orderBy: { pageRankScore: 'desc' },
        take: 5,
      }),
      prisma.submissionEvent.findMany({
        where: { userId, status: { not: 'Accepted' } },
        include: { problem: true, evidence: { include: { rootCauseHypotheses: true } } },
        orderBy: { timestamp: 'desc' },
        take: 20,
      }),
    ]);

    const weaknessContext = weaknesses.map((w: any) => `- ${w.name}`).join('\n') || 'None';
    
    const relevantFailures = failures.filter((f: any) => 
      f.problem.topics.some((t: string) => t.toLowerCase().includes(topic.toLowerCase())) ||
      f.problem.title.toLowerCase().includes(topic.toLowerCase())
    );

    const failureContext = relevantFailures.map((f: any) => {
      const topHyp = f.evidence.flatMap((e: any) => e.rootCauseHypotheses)[0];
      return `- [${f.problem.title}] failed with ${f.status} due to: ${topHyp?.name || 'Unknown'}`;
    }).join('\n') || 'No specific failures for this topic.';

    const prompt = `You are an expert computer science educator. Create a personalized cheat sheet for the topic "${topic}".
Address the user's weaknesses and recent mistakes directly in the cheat sheet.

USER WEAKNESSES:
${weaknessContext}

RECENT MISTAKES ON THIS TOPIC:
${failureContext}

Respond with ONLY valid JSON in this format:
{
  "template": "def python_template():\\n    pass", // Write a robust python template
  "mistakes": ["List 3-4 common mistakes, explicitly mentioning the user's past mistakes"],
  "complexity": { "time": "O(...)", "space": "O(...)" },
  "keyInsights": ["List 3-4 key insights to remember"]
}`;

    // 3. Call Groq
    const raw = await callGroq(prompt);
    let cheatSheet;
    try {
      cheatSheet = JSON.parse(raw);
    } catch (e) {
      logger.error('Failed to parse Groq cheat sheet response', { raw });
      throw new Error('Failed to parse AI response');
    }

    return NextResponse.json({ success: true, data: cheatSheet });

  } catch (error) {
    logger.error('❌ Cheat sheet generation error:', error);
    return NextResponse.json({ success: false, error: 'Generation failed' }, { status: 500 });
  }
}
