/**
 * POST /api/knowledge/generate
 *
 * Dynamically generates a knowledge graph (nodes, edges, concepts) based on a search query
 * and user weaknesses.
 * 
 * Body: { query: string }
 * Response: { nodes: any[], edges: any[] }
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
      max_tokens: 2048,
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

    let body: { query?: string } = {};
    try { body = await request.json(); } catch {}
    const query = body.query || 'Data Structures and Algorithms';

    logger.info('🧠 Generating knowledge graph', { userId, query });

    // 1. Fetch user weaknesses
    const weaknesses = await prisma.systemicWeakness.findMany({
      where: { diagnoses: { some: { userId } } },
      orderBy: { pageRankScore: 'desc' },
      take: 5,
    });

    const weaknessContext = weaknesses.map(w => `- ${w.name}`).join('\n') || 'None';

    const prompt = `You are an expert computer science educator. The user is searching for the concept: "${query}".
Build a directed knowledge graph explaining this concept. Tailor it to address these specific weaknesses the user has:
${weaknessContext}

Generate nodes representing concepts, subconcepts, patterns, techniques, pitfalls, and complexities.
Generate edges explaining the relationships.

Respond with ONLY valid JSON in this exact format:
{
  "nodes": [
    {
      "id": "node-1",
      "label": "Concept Name",
      "kind": "concept", // one of: concept, subconcept, pattern, technique, pitfall, complexity
      "description": "Short explanation",
      "x": 400, // x coordinate (roughly 0 to 800)
      "y": 0    // y coordinate (roughly 0 to 600, top to bottom flow)
    }
  ],
  "edges": [
    { "source": "node-1", "target": "node-2", "label": "requires" }
  ]
}`;

    // 3. Call Groq
    const raw = await callGroq(prompt);
    let graphData = { nodes: [], edges: [] };
    try {
      graphData = JSON.parse(raw);
    } catch (e) {
      console.error("RAW KNOWLEDGE GENERATION RESPONSE:");
      console.error(JSON.stringify(raw));
      logger.error('Failed to parse Groq knowledge response', { raw });
      throw new Error('Failed to parse AI response');
    }

    return NextResponse.json({ success: true, data: graphData });

  } catch (error) {
    logger.error('❌ Knowledge generation error:', error);
    return NextResponse.json({ success: false, error: 'Generation failed' }, { status: 500 });
  }
}
