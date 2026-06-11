import type { SubmissionEvent, WeaknessType } from '@/types';
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

function getFallbackDiagnosis(
  current: SubmissionEvent,
  weaknessScores: WeaknessScore[]
): StructuredDiagnosis {
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
  weaknessScores: WeaknessScore[],
  userQuery?: string
): Promise<StructuredDiagnosis> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey || groqApiKey === 'your_groq_key_here') {
    console.warn('⚠️ GROQ_API_KEY is not defined or is a placeholder. Falling back to rules-based diagnosis.');
    return getFallbackDiagnosis(current, weaknessScores);
  }

  console.log('[TRACE] Groq client created successfully');

  const prompt = `
You are an AI Failure Analyst for competitive programming. You help users understand their coding weaknesses by analyzing their submission history.

## Current Failure Context
Problem: ${current.problemTitle} (${current.problemDifficulty})
Topics: ${current.problemTopics.join(', ')}
Submission Status: ${current.submissionStatus}
Code:
\`\`\`
${current.submissionCode}
\`\`\`
${current.failedTestCase ? `Failed Test Case: ${current.failedTestCase}` : ''}

## Similar Past Failures (from embedding search)
${similarFailures.length > 0
  ? similarFailures.map(sf => `- Problem: ${sf.problemTitle} (${sf.submissionStatus}). Similarity: ${sf.similarityScore.toFixed(2)}. Code snippet: ${sf.code?.slice(0, 200)}`).join('\n')
  : '- No similar past failures found.'}

## Weakness Pattern Analysis (PageRank Scores)
${weaknessScores.length > 0
  ? weaknessScores.map(ws => `- ${ws.name} (${ws.id}): PageRank = ${ws.pageRankScore.toFixed(3)}, Frequency = ${ws.frequency}`).join('\n')
  : '- No weakness patterns computed yet.'}
${userQuery ? `\n## User's Specific Question\nThe user is asking: "${userQuery}"\nMake sure your reasoningChain directly addresses this question using the evidence above.\n` : ''}
## Instructions
Reason step by step about the root cause. If the user asked a specific question, answer it directly in the reasoningChain field. Compile a custom learning plan tailored to their weaknesses. Output your response as a valid, parsable JSON object matching the schema below. Do not wrap the JSON in Markdown formatting.

JSON Schema:
{
  "primaryWeaknessId": "edge-case-reasoning" | "algorithmic-pattern-recognition" | "performance-analysis" | "implementation-precision",
  "primaryWeaknessName": "Edge Case Reasoning" | "Algorithmic Pattern Recognition" | "Performance Analysis" | "Implementation Precision",
  "confidence": number (between 0 and 100),
  "reasoningChain": string (2-3 sentences that answer the user question and explain your reasoning),
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

  try {
    console.log('[TRACE] Calling Groq API');
    const response = await fetch('https://api.groq.com/' + 'open' + 'ai' + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API returned status ${response.status}: ${errorText}`);
    }

    console.log('[TRACE] Parsing Groq response...');
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      const parsed = JSON.parse(content.trim());
      return parsed as StructuredDiagnosis;
    }
    
    throw new Error('Groq response contains no choices content');
  } catch (err) {
    console.error('❌ Groq API diagnosis failed:', err);
    return getFallbackDiagnosis(current, weaknessScores);
  }
}
