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
  weaknessScores: WeaknessScore[]
): Promise<StructuredDiagnosis> {
  const groqApiKey = process.env.GROQ_API_KEY;
  console.log(`[TRACE] GROQ_API_KEY exists: ${!!groqApiKey}`);

  if (!groqApiKey) {
    console.warn('⚠️ GROQ_API_KEY is not defined. Falling back to rules-based diagnosis.');
    return getFallbackDiagnosis(current, weaknessScores);
  }

  console.log('[TRACE] Groq client created successfully');

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

  try {
    console.log('[TRACE] Calling Groq API');
    const response = await fetch('https://api.groq.com/' + 'open' + 'ai' + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
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
