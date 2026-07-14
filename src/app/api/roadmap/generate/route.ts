/**
 * POST /api/roadmap/generate
 *
 * Generates a personalized LeetCode roadmap graph (nodes, edges, clusters).
 *
 * Body: { topic: string, level: number, excludeSlugs?: string[] }
 * Response: { topic, level, nodes, edges, clusters, learningGoal, weaknessTarget, generatedAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { logger } from '@/lib/logger';
import { delRoadmapCache } from '@/lib/cache/roadmap';
import { getProblemCache, setProblemCache } from '@/lib/cache/problem';

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
      max_tokens: 3000,
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

    let body: { topic?: string; level?: number; excludeSlugs?: string[] } = {};
    try { body = await request.json(); } catch {}

    const topic = body.topic || 'General DSA';
    const level = body.level || 1;
    const excludeSlugs = body.excludeSlugs || [];

    logger.info('🗺️ Generating dynamic roadmap graph', { userId, topic, level });

    // 1. Fetch user context
    const [weaknesses, recentFailures] = await Promise.all([
      prisma.systemicWeakness.findMany({
        where: { diagnoses: { some: { userId } } },
        orderBy: { pageRankScore: 'desc' },
        take: 5,
      }),
      prisma.submissionEvent.findMany({
        where: {
          userId,
          NOT: { status: 'Accepted' },
          timestamp: { gte: new Date(Date.now() - 30 * 86400000) },
        },
        include: { problem: true, evidence: { include: { rootCauseHypotheses: true } } },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    // 2. Get candidate problems from DB
    // @ts-ignore
    const candidateProblems = await prisma.leetcodeProblem.findMany({
      where: { slug: { notIn: excludeSlugs } },
      orderBy: { leetcodeId: 'asc' },
      take: 200, // Fetch more to allow Groq to choose
    });

    // We filter candidates loosely by topic if they match title/topics
    const looseCandidates = candidateProblems.filter((p: any) => 
      p.topics.some((t: string) => t.toLowerCase().includes(topic.toLowerCase())) ||
      p.patterns.some((pt: string) => pt.toLowerCase().includes(topic.toLowerCase())) ||
      p.title.toLowerCase().includes(topic.toLowerCase())
    );

    const activeCandidates = looseCandidates.length > 10 ? looseCandidates : candidateProblems.slice(0, 50);

    const weaknessContext = weaknesses.map(w => `- ${w.name} (freq: ${w.frequency})`).join('\n') || 'None';
    const failureContext = recentFailures.map(f => {
      const topHyp = f.evidence.flatMap(e => e.rootCauseHypotheses)[0];
      return `- ${f.problem.title} (${f.status}) due to: ${topHyp?.name || 'unknown'}`;
    }).join('\n') || 'None';

    const problemList = activeCandidates
      .map((p: any) => `[ID: ${p.leetcodeId}] Slug: ${p.slug} | Title: ${p.title} | Diff: ${p.difficulty}`)
      .join('\n');

    const prompt = `You are a LeetCode learning roadmap architect. Analyze the user's weaknesses and failures to generate a directed acyclic graph (DAG) of problems for Level ${level} of the topic "${topic}".

USER WEAKNESSES:
${weaknessContext}

RECENT FAILURES:
${failureContext}

CANDIDATE PROBLEMS FROM DATABASE (use ONLY these exact slugs):
${problemList}

Design a graph structure. Group problems into clusters (e.g. "Binary Search Core", "Advanced Patterns").
Select 8-12 problems. Return ONLY valid JSON in this exact format:
{
  "learningGoal": "Master sliding window dynamic sizing",
  "weaknessTarget": "Focuses on off-by-one boundary conditions",
  "clusters": ["Basics", "Dynamic Sizing"],
  "nodes": [
    { "slug": "two-sum", "cluster": "Basics", "reason": "Fundamental map usage", "importance": 0.95 }
  ],
  "edges": [
    { 
      "source": "two-sum", 
      "target": "three-sum",
      "type": "mastery_path",
      "confidence": 0.92,
      "reason": "Extends 2Sum logic to 3 elements"
    }
  ]
}

CRITICAL EDGE RULES:
1. Every edge MUST have "type", "confidence" (0.0 to 1.0), and "reason".
2. You MUST define EXACTLY ONE primary path spanning multiple nodes using the type "mastery_path". This path connects the core progression of the level.
3. For remediation branches (addressing failed problems or weaknesses), use the type "remediation".
4. For other connections, use types like "prerequisite", "pattern_progression", "knowledge_transfer".
`;

    // 4. Call Groq
    const raw = await callGroq(prompt);
    let graphData: any = { nodes: [], edges: [], clusters: [], learningGoal: '', weaknessTarget: '' };
    try {
      const parsed = JSON.parse(raw);
      graphData = {
        nodes: parsed.nodes || [],
        edges: parsed.edges || [],
        clusters: parsed.clusters || [],
        learningGoal: parsed.learningGoal || '',
        weaknessTarget: parsed.weaknessTarget || ''
      };
    } catch (e) {
      console.error("RAW ROADMAP GENERATION RESPONSE:");
      console.error(JSON.stringify(raw));
      logger.error('Groq roadmap parsing failed', { error: e });
      throw new Error('Failed to parse graph output');
    }

    // 5. Cross-reference with user submissions to set node state
    const userSubmissions = await prisma.submissionEvent.findMany({
      where: { userId },
      include: { problem: true },
      orderBy: { timestamp: 'desc' },
    });

    const submissionBySlug: Record<string, { hasAccepted: boolean; attempts: number; lastStatus: string }> = {};
    for (const sub of userSubmissions) {
      const slug = sub.problem.slug;
      if (!submissionBySlug[slug]) {
        submissionBySlug[slug] = { hasAccepted: false, attempts: 0, lastStatus: sub.status };
      }
      submissionBySlug[slug].attempts++;
      if (sub.status === 'Accepted') submissionBySlug[slug].hasAccepted = true;
    }

    // 6. Build full nodes
    const finalNodes = (await Promise.all(graphData.nodes.map(async (nodeInfo: any) => {
      let dbProb = await getProblemCache(nodeInfo.slug);
      if (!dbProb) {
        const foundProb = activeCandidates.find((p: any) => p.slug === nodeInfo.slug) || 
                          candidateProblems.find((p: any) => p.slug === nodeInfo.slug);
        if (foundProb) {
          await setProblemCache(nodeInfo.slug, foundProb);
          dbProb = await getProblemCache(nodeInfo.slug); // load clean DTO
        }
      }
      
      if (!dbProb) return null;

      const userSub = submissionBySlug[dbProb.slug];
      
      // Auto-compute state based on edges (this will be done fully on frontend or simply initialized here)
      // Since states are now 100% submission driven:
      let nodeState = 'available';
      if (userSub) {
        if (userSub.hasAccepted) {
          nodeState = 'solved'; // or previously_solved
        } else if (userSub.attempts > 0) {
          nodeState = 'failed';
        }
      }

      return {
        leetcodeId: dbProb.leetcodeId,
        slug: dbProb.slug,
        title: dbProb.title,
        difficulty: dbProb.difficulty,
        topics: dbProb.topics,
        patterns: dbProb.patterns,
        reason: nodeInfo.reason || `Practice ${topic}`,
        cluster: nodeInfo.cluster || 'General',
        nodeState,
        userAttempts: userSub?.attempts,
        userStatus: userSub?.lastStatus,
      };
    }))).filter(Boolean);

    logger.info('✅ Dynamic Roadmap generated', { count: finalNodes.length, topic, level });

    // Invalidate Cache
    await delRoadmapCache(userId);

    return NextResponse.json({
      success: true,
      topic,
      level,
      nodes: finalNodes,
      edges: graphData.edges,
      clusters: graphData.clusters,
      learningGoal: graphData.learningGoal,
      weaknessTarget: graphData.weaknessTarget,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('❌ Roadmap generation error:', error);
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : 'Generation failed' } },
      { status: 500 }
    );
  }
}
