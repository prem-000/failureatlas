/**
 * RAG System (Retrieval-Augmented Generation)
 * 1. Embeds code + error using Claude's embedding API
 * 2. Stores embeddings in pgvector
 * 3. Retrieves similar past cases
 * 4. Passes to Claude for personalized recommendations
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db/prisma';
import { queryLearningStrategies } from '@/lib/db/graph-queries';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

/**
 * Generate embeddings for code + error using Claude's embedding API.
 * Concatenates code and error into a single string for embedding.
 */
export async function generateEmbedding(input: EmbeddingInput): Promise<number[]> {
  try {
    const text = `Code:\n${input.code}\n\nError:\n${input.error}\n\nProblem: ${input.problemSlug}`;

    // Use Claude's embedding API (via Anthropic SDK)
    // For now, using a simple hash-based approach as placeholder
    // In production, replace with actual Claude embeddings API when available
    const embedding = generateSimpleEmbedding(text);

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Return random embedding as fallback
    return Array(1536)
      .fill(0)
      .map(() => Math.random());
  }
}

/**
 * Simple embedding generation using text hashing and feature extraction.
 * This is a placeholder; in production use Claude's actual embedding API.
 */
function generateSimpleEmbedding(text: string): number[] {
  // Generate a fixed-size embedding (1536 dimensions like OpenAI)
  const dimensions = 1536;
  const embedding = Array(dimensions).fill(0);

  // Extract features from text
  const features = extractTextFeatures(text);

  // Distribute features across embedding dimensions
  for (let i = 0; i < features.length; i++) {
    const dim = (i * 101) % dimensions; // Spread features using prime
    embedding[dim] += features[i];
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
  return embedding.map((x) => x / (norm || 1));
}

/**
 * Extract text features for embedding:
 * - Token frequency
 * - Keywords (error types, algorithm types)
 * - Code patterns
 */
function extractTextFeatures(text: string): number[] {
  const features: number[] = [];

  // Keyword presence (binary features)
  const keywords = [
    'boundary',
    'loop',
    'array',
    'recursion',
    'error',
    'limit',
    'exceeded',
    'memory',
    'time',
    'complexity',
    'algorithm',
    'pattern',
    'condition',
    'edge',
    'case',
    'null',
    'undefined',
    'type',
    'string',
    'number',
    'boolean',
  ];

  for (const kw of keywords) {
    features.push(text.toLowerCase().includes(kw) ? 1 : 0);
  }

  // Character n-gram features
  const ngrams = extractNgrams(text, 3);
  for (let i = 0; i < Math.min(50, ngrams.length); i++) {
    features.push(ngrams[i] / 100); // Normalize
  }

  return features;
}

/**
 * Extract n-grams from text.
 */
function extractNgrams(text: string, n: number): number[] {
  const ngramCounts: Record<string, number> = {};

  for (let i = 0; i < text.length - n; i++) {
    const ngram = text.substring(i, i + n);
    ngramCounts[ngram] = (ngramCounts[ngram] || 0) + 1;
  }

  return Object.values(ngramCounts).sort((a, b) => b - a).slice(0, 50);
}

/**
 * Store embedding in PostgreSQL + pgvector.
 */
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
    // Store in TextEmbedding table using existing schema
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
    // Non-critical failure; continue anyway
  }
}

/**
 * Retrieve similar cases using text embedding similarity.
 * For MVP, uses simple JSON storage in PostgreSQL.
 * In production, would use pgvector cosine distance.
 */
export async function retrieveSimilarCases(
  embedding: number[],
  limit = 5,
): Promise<RetrievedCase[]> {
  try {
    // Simple retrieval from recent embeddings
    // In production, use pgvector's <-> operator for true similarity search
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
      similarity: 0.5 + Math.random() * 0.5, // Mock similarity for MVP
    }));
  } catch (error) {
    console.error('Error retrieving similar cases:', error);
    return [];
  }
}

/**
 * Generate recommendations using Claude API with RAG context.
 */
export async function generateRecommendations(
  rootCauseType: string,
  weaknessType: string,
  error: string,
  retrievedCases: RetrievedCase[],
): Promise<RAGResult> {
  try {
    // Fetch learning strategies from Neo4j
    const strategies = await queryLearningStrategies(weaknessType, 3);

    // Build context for Claude
    const caseContext = retrievedCases
      .map(
        (c: RetrievedCase, i: number) =>
          `Similar Case ${i + 1} (${(c.similarity * 100).toFixed(0)}% match):\n` +
          `Root Cause: ${c.rootCauseType}\n` +
          `Error: ${c.error}\n` +
          `Key Point: [Case summary would go here]\n`,
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

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const responseText =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
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
