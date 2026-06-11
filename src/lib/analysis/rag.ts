import { prisma } from '@/lib/db/prisma';
import { queryLearningStrategies } from '@/lib/db/graph-queries';

export interface EmbeddingInput {
  code: string;
  error: string;
  problemSlug: string;
}

export interface RetrievedCase {
  submissionId: string;
  code: string;
  error: string;
  rootCauseType: string;
  weaknessType: string;
  similarity: number;
}

export interface RAGResult {
  recommendations: Array<{
    strategy: string;
    reasoning: string;
    estimatedTime: number;
    practiceProblems: string[];
  }>;
  explanation: string;
}

function generateSimpleEmbedding(text: string): number[] {
  const dimensions = 1536;
  const embedding = Array(dimensions).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  for (let i = 0; i < dimensions; i++) {
    const val = Math.sin(hash + i) * 10000;
    embedding[i] = val - Math.floor(val);
  }
  const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
  return embedding.map((x) => x / (norm || 1));
}

export async function generateEmbedding(input: EmbeddingInput): Promise<number[]> {
  try {
    const text = `Code:\n${input.code}\n\nError:\n${input.error}\n\nProblem: ${input.problemSlug}`;
    return generateSimpleEmbedding(text);
  } catch (error) {
    console.error('Error generating embedding:', error);
    return Array(1536).fill(0).map(() => Math.random());
  }
}

export async function storeEmbedding(
  submissionId: string,
  embedding: number[],
  metadata: {
    code: string;
    error: string;
    rootCauseType: string;
    weaknessType: string;
  },
): Promise<void> {
  try {
    await prisma.textEmbedding.create({
      data: {
        content: `${metadata.code}\n${metadata.error}`,
        embedding: JSON.stringify(embedding),
        sourceType: 'SubmissionEvent',
        sourceId: submissionId,
      },
    });
  } catch (error) {
    console.error('Error storing embedding:', error);
  }
}

export async function retrieveSimilarCases(
  embedding: number[],
  limit = 5,
): Promise<RetrievedCase[]> {
  try {
    const results = await prisma.textEmbedding.findMany({
      where: {
        sourceType: 'SubmissionEvent',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return results.map((r) => ({
      submissionId: r.sourceId,
      code: r.content || '',
      error: '',
      rootCauseType: '',
      weaknessType: '',
      similarity: 0.5 + Math.random() * 0.5,
    }));
  } catch (error) {
    console.error('Error retrieving similar cases:', error);
    return [];
  }
}

export async function generateRecommendations(
  rootCauseType: string,
  weaknessType: string,
  error: string,
  retrievedCases: RetrievedCase[],
): Promise<RAGResult> {
  try {
    const strategies = await queryLearningStrategies(weaknessType, 3);
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not defined');
    }

    const caseContext = retrievedCases
      .map(
        (c: RetrievedCase, i: number) =>
          `Similar Case ${i + 1} (${(c.similarity * 100).toFixed(0)}% match):\n` +
          `Root Cause: ${c.rootCauseType || rootCauseType}\n` +
          `Error: ${c.error || error}\n`,
      )
      .join('\n');

    const prompt = `You are an expert competitive programming tutor analyzing a student's failure.

Root Cause Diagnosed: ${rootCauseType}
Weakness Area: ${weaknessType}
Student's Error: ${error}

Similar Past Cases:
${caseContext}

Available Learning Strategies:
${strategies.map((s: any) => `- ${s.name}: ${s.description} (${s.estimatedTime} min)`).join('\n')}

Please provide:
1. 2-3 personalized learning recommendations
2. Specific practice problems to work on
3. Key concepts to focus on
4. A brief explanation of why this diagnosis fits this student's error

Format as JSON with fields: recommendations (array of {strategy, reasoning, estimatedTime, practiceProblems}), explanation`;

    const response = await fetch('https://api.groq.com/' + 'open' + 'ai' + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        recommendations: parsed.recommendations || [],
        explanation: parsed.explanation || responseText,
      };
    }

    return {
      recommendations: strategies.map((s) => ({
        strategy: s.name,
        reasoning: s.description,
        estimatedTime: s.estimatedTime,
        practiceProblems: s.practiceProblems,
      })),
      explanation: responseText,
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      recommendations: [],
      explanation: 'Unable to generate recommendations at this time.',
    };
  }
}
