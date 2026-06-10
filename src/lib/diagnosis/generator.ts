import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import type { SubmissionEvent, LearningRecommendation, WeaknessType } from '@/types';
import type { RetrievedFailure } from '../rag/retrieval';
import type { WeaknessScore } from '../graph/pagerank';

export interface StructuredDiagnosis {
  primaryWeaknessId: WeaknessType;
  primaryWeaknessName: string;
  confidence: number;
  reasoningChain: string;
  learningRecommendations: Array<{
    name: string;
    description: string;
    estimatedTime: number; // minutes
    priority: 'high' | 'medium' | 'low';
    practiceProblems: Array<{
      problemSlug: string;
      title: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
    }>;
  }>;
}

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function getFallbackDiagnosis(
  current: SubmissionEvent,
  weaknessScores: WeaknessScore[]
): StructuredDiagnosis {
  // Static rule-based fallback if APIs are not configured/fail
  let primaryId: WeaknessType = 'edge-case-reasoning';
  let primaryName = 'Edge Case Reasoning';
  
  if (current.submissionStatus === 'Time Limit Exceeded') {
    primaryId = 'performance-analysis';
    primaryName = 'Performance Analysis';
  } else if (current.submissionStatus === 'Memory Limit Exceeded') {
    primaryId = 'performance-analysis';
    primaryName = 'Performance Analysis';
  } else if (weaknessScores.length > 0) {
    const highest = weaknessScores[0];
    if (highest) {
      primaryId = highest.id as WeaknessType;
      primaryName = highest.name;
    }
  }

  const recommendations: StructuredDiagnosis['learningRecommendations'] = [];
  
  if (primaryId === 'edge-case-reasoning') {
    recommendations.push({
      name: 'Boundary Testing Checklist',
      description: 'Before submitting, dry run with empty array [], single elements [x], and max/min inputs.',
      estimatedTime: 45,
      priority: 'high',
      practiceProblems: [
        { problemSlug: 'two-sum', title: 'Two Sum', difficulty: 'Easy' },
        { problemSlug: 'search-insert-position', title: 'Search Insert Position', difficulty: 'Easy' }
      ]
    });
  } else if (primaryId === 'performance-analysis') {
    recommendations.push({
      name: 'Complexity Constraints Verification',
      description: 'Verify O(N) or O(N log N) requirements matching LeetCode N <= 10^5 constraints.',
      estimatedTime: 60,
      priority: 'high',
      practiceProblems: [
        { problemSlug: 'longest-substring-without-repeating-characters', title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium' }
      ]
    });
  } else {
    recommendations.push({
      name: 'Targeted Concept Review',
      description: 'Read and implement standard template patterns for this problem topic.',
      estimatedTime: 90,
      priority: 'medium',
      practiceProblems: []
    });
  }

  return {
    primaryWeaknessId: primaryId,
    primaryWeaknessName: primaryName,
    confidence: 85,
    reasoningChain: 'Static rule-based heuristic fallback due to missing or failed LLM API keys.',
    learningRecommendations: recommendations
  };
}

export async function generateAIDiagnosis(
  current: SubmissionEvent,
  similarFailures: RetrievedFailure[],
  weaknessScores: WeaknessScore[]
): Promise<StructuredDiagnosis> {
  const anthropic = getAnthropicClient();
  const openai = getOpenAIClient();

  const prompt = `
You are analyzing a competitive programming failure to identify learning opportunities.

## Current Failure Context
Problem: ${current.problemTitle} (${current.problemDifficulty})
Topics: ${current.problemTopics.join(', ')}
Submission Status: ${current.submissionStatus}
Code:
\`\`\`
${current.submissionCode}
\`\`\`
${current.failedTestCase ? `Failed Test Case: ${current.failedTestCase}` : ''}

## Similar Past Failures
${similarFailures.map(sf => `- Problem: ${sf.problemTitle} (${sf.submissionStatus}). Score: ${sf.similarityScore.toFixed(2)}. Code: ${sf.code}`).join('\n')}

## Weakness Pattern Analysis (PageRank Scores)
${weaknessScores.map(ws => `- ${ws.name} (${ws.id}): PageRank = ${ws.pageRankScore.toFixed(3)}, Freq = ${ws.frequency}`).join('\n')}

## Instructions
Reason step by step about the root cause and compile a custom learning plan. Output your response as a valid, parsable JSON object matching the schema below. Do not wrap the JSON in Markdown formatting.

JSON Schema:
{
  "primaryWeaknessId": "edge-case-reasoning" | "algorithmic-pattern-recognition" | "performance-analysis" | "implementation-precision",
  "primaryWeaknessName": "Edge Case Reasoning" | "Algorithmic Pattern Recognition" | "Performance Analysis" | "Implementation Precision",
  "confidence": number (between 0 and 100),
  "reasoningChain": string (2-3 sentences explaining your reasoning),
  "learningRecommendations": [
    {
      "name": string,
      "description": string,
      "estimatedTime": number (in minutes),
      "priority": "high" | "medium" | "low",
      "practiceProblems": [
        {
          "problemSlug": string,
          "title": string,
          "difficulty": "Easy" | "Medium" | "Hard"
        }
      ]
    }
  ]
}
`;

  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const content = response.content[0];
      if (content && content.type === 'text') {
        const parsed = JSON.parse(content.text.trim());
        return parsed as StructuredDiagnosis;
      }
    } catch (err) {
      console.error('❌ Claude API diagnosis failed:', err);
    }
  }

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content.trim());
        return parsed as StructuredDiagnosis;
      }
    } catch (err) {
      console.error('❌ OpenAI API diagnosis failed:', err);
    }
  }

  // Fallback to rules-based system if both APIs fail or are unconfigured
  return getFallbackDiagnosis(current, weaknessScores);
}
