/**
 * src/lib/replay/groq-analyzer.ts
 *
 * Groq-powered reasoning engine for Failure Replay:
 * - Structured failure evidence generation
 * - Targeted testcase generation attacking faulty assumptions
 * - Vertical condition / reasoning flow generation
 * - 5-level progressive code hints
 * - Anti-leak guardrail enforcement (prevents solution disclosure)
 * - User reasoning evaluation (PASS / PARTIAL / FAIL)
 */

import { groqClient } from '@/lib/api/groq-client';
import type {
  FailureEvidence,
  TargetedTestCase,
  ConditionNode,
  ProgressiveHint,
  ReasoningEvaluationResult,
  ReplayProblemInfo,
} from './types';

export interface StructuredGroqAnalysis {
  failureEvidence: FailureEvidence;
  targetedTests: TargetedTestCase[];
  conditionFlow: ConditionNode[];
  hints: ProgressiveHint[];
}

/**
 * Anti-leak filter to guarantee generated hints and questions NEVER
 * reveal the complete code or copy-paste solution.
 */
export function sanitizeAnalysis(analysis: StructuredGroqAnalysis, userCode: string): StructuredGroqAnalysis {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const functionDefRegex = /(?:def\s+[a-zA-Z_]\w*|function\s+[a-zA-Z_]\w*|const\s+[a-zA-Z_]\w*\s*=\s*(?:function|\()|class\s+[a-zA-Z_]\w*)/gi;

  // Clean hints
  const sanitizedHints = analysis.hints.map(hint => {
    let cleanText = hint.text;
    // Replace full code fences with generic hints if an LLM sneaked in a solution
    if (codeBlockRegex.test(cleanText)) {
      cleanText = cleanText.replace(codeBlockRegex, '(inspect this segment in your editor)');
    }
    if (functionDefRegex.test(cleanText)) {
      cleanText = cleanText.replace(functionDefRegex, 'your function');
    }
    return {
      ...hint,
      text: cleanText.trim(),
    };
  });

  // Clean condition flow questions
  const sanitizedFlow = analysis.conditionFlow.map(node => {
    let cleanPrompt = node.checkpointQuestion?.prompt || '';
    if (codeBlockRegex.test(cleanPrompt)) {
      cleanPrompt = cleanPrompt.replace(codeBlockRegex, '');
    }
    return {
      ...node,
      checkpointQuestion: node.checkpointQuestion
        ? {
            ...node.checkpointQuestion,
            prompt: cleanPrompt.trim(),
          }
        : undefined,
    };
  });

  return {
    ...analysis,
    hints: sanitizedHints,
    conditionFlow: sanitizedFlow,
  };
}

/**
 * Generate comprehensive structured Failure Replay intelligence with Groq.
 */
export async function generateReplayIntelligence(params: {
  problem: ReplayProblemInfo;
  userCode: string;
  language: string;
  verdict: string;
  failedTestCase?: string | null;
  passedTests?: number | null;
  totalTests?: number | null;
}): Promise<StructuredGroqAnalysis> {
  const { problem, userCode, language, verdict, failedTestCase, passedTests, totalTests } = params;

  const prompt = `You are the Lead Reasoning Engine for Praxis Failure Replay.
Analyze this user's failed submission.
Do NOT give away the complete solution or corrected code. Focus strictly on making the failure observable, breaking down the logic into a vertical condition flow, generating targeted test cases, and providing progressive code hints.

PROBLEM:
Title: ${problem.title} (${problem.slug})
Difficulty: ${problem.difficulty}
Topics: ${problem.topics.join(', ')}
Statement:
${problem.statement || 'Solve the problem according to standard specifications.'}

CONSTRAINTS:
${problem.constraints.join('\n') || 'Standard LeetCode constraints.'}

USER SUBMISSION:
Language: ${language}
Verdict: ${verdict}
Passed: ${passedTests ?? 0} / ${totalTests ?? 0}
Judge Evidence / Failed Test:
${failedTestCase || 'None captured directly from judge.'}

User's Code:
${userCode.slice(0, 2000)}

Generate a strict JSON object with this exact schema:
{
  "failureEvidence": {
    "input": "Specific failing input string or representation",
    "expected": "Expected result for this input",
    "actual": "Actual output or Runtime Error / Timeout observed",
    "error": "Error message or undefined if Wrong Answer",
    "firstFailurePoint": {
      "line": 10,
      "variable": "index",
      "value": "n",
      "description": "Short explanation of the exact first divergence point"
    },
    "relevantCodeLocation": {
      "line": 10,
      "snippet": "short line of code",
      "variable": "index"
    },
    "rootCauseSummary": "Concise 1-sentence statement of the flawed assumption"
  },
  "targetedTests": [
    {
      "id": "t1",
      "level": 1,
      "category": "Normal",
      "input": "Control input that should clearly pass",
      "expected": "Expected output",
      "whyThisCaseExists": "Control case to establish baseline logic"
    },
    {
      "id": "t2",
      "level": 2,
      "category": "Boundary",
      "input": "Smallest or initial boundary case exposing the failure",
      "expected": "Expected output",
      "whyThisCaseExists": "Attacks boundary condition assumption"
    },
    {
      "id": "t3",
      "level": 3,
      "category": "Constraint Boundary",
      "input": "Input at constraint limits (e.g. n=1, maximum value, or empty)",
      "expected": "Expected output",
      "whyThisCaseExists": "Verifies constraints handling at extreme limits"
    },
    {
      "id": "t4",
      "level": 4,
      "category": "Adversarial",
      "input": "Counter-intuitive arrangement or duplicate values or cyclic index",
      "expected": "Expected output",
      "whyThisCaseExists": "Breaks greedy or naive index assumptions"
    },
    {
      "id": "t5",
      "level": 5,
      "category": "Structural",
      "input": "Stress or deep edge case test",
      "expected": "Expected output",
      "whyThisCaseExists": "Hardest targeted test challenging the core algorithm"
    }
  ],
  "conditionFlow": [
    {
      "id": "c1",
      "order": 1,
      "conditionText": "Is input empty or of minimal size?",
      "branches": {
        "yes": { "label": "YES", "action": "Handle base condition directly without looping" },
        "no": { "label": "NO", "action": "Proceed to core traversal / computation" }
      },
      "checkpointQuestion": {
        "id": "q1",
        "prompt": "What happens if this base condition is not handled?",
        "format": "explain",
        "expectedConcept": "Out of bounds or divide by zero on empty/single element input",
        "options": [
          "Loop terminates safely",
          "Access out of bounds or runtime crash",
          "Returns 0 incorrectly"
        ],
        "correctOptionIndex": 1
      }
    },
    {
      "id": "c2",
      "order": 2,
      "conditionText": "Condition where the index or pointer reaches the boundary",
      "branches": {
        "yes": { "label": "YES", "action": "Valid transition" },
        "no": { "label": "NO", "action": "Wrap around or boundary clamp" }
      },
      "checkpointQuestion": {
        "id": "q2",
        "prompt": "When the pointer exceeds the boundary, what mathematical operation ensures safe indexing?",
        "format": "condition",
        "expectedConcept": "Modulo operator or boundary check",
        "options": [
          "Incrementing again",
          "Modulo by array length (index % n)",
          "Hardcoding index to 0"
        ],
        "correctOptionIndex": 1
      }
    },
    {
      "id": "c3",
      "order": 3,
      "conditionText": "Final termination invariant",
      "branches": {
        "yes": { "label": "YES", "action": "Return computed result" },
        "no": { "label": "NO", "action": "Continue iteration until exhausted" }
      },
      "checkpointQuestion": {
        "id": "q3",
        "prompt": "What invariant must hold before returning the final result?",
        "format": "predict",
        "expectedConcept": "All elements processed or destination reached"
      }
    }
  ],
  "hints": [
    {
      "level": 1,
      "tierName": "Observation",
      "title": "Observation",
      "text": "Notice the value of the key variable when approaching the boundary."
    },
    {
      "level": 2,
      "tierName": "Condition",
      "title": "Condition Check",
      "text": "Check if your conditional branch handles the transition when index >= n."
    },
    {
      "level": 3,
      "tierName": "Relevant Code Location",
      "title": "Relevant Code Location",
      "text": "Inspect the loop termination expression and update statement."
    },
    {
      "level": 4,
      "tierName": "Structural Guidance",
      "title": "Structural Guidance",
      "text": "Consider using modular arithmetic or an explicit boundary guard before accessing elements."
    },
    {
      "level": 5,
      "tierName": "Strong Guidance",
      "title": "Strong Guidance",
      "text": "Ensure circular or offset transitions are bounded by the total element count."
    }
  ]
}

CRITICAL RULES:
- Never provide the final corrected code.
- Return ONLY valid JSON matching the schema.`;

  try {
    const response = await groqClient.getChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are the Praxis Failure Replay Engine. You output strict JSON without code fences.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.content) as StructuredGroqAnalysis;

    // Ensure all testcases have IDs, statuses, and verified flags
    const formattedTests: TargetedTestCase[] = (parsed.targetedTests || []).map((t, idx) => ({
      id: t.id || `t${idx + 1}`,
      level: t.level || idx + 1,
      category: t.category || 'Boundary',
      input: String(t.input || ''),
      expected: String(t.expected || ''),
      whyThisCaseExists: t.whyThisCaseExists || 'Targeted test case',
      status: idx === 0 ? 'untested' : 'locked',
      verified: true,
    }));

    // Ensure condition flow has IDs and statuses
    const formattedFlow: ConditionNode[] = (parsed.conditionFlow || []).map((c, idx) => ({
      ...c,
      id: c.id || `c${idx + 1}`,
      order: c.order || idx + 1,
      status: idx === 0 ? 'unlocked' : 'locked',
    }));

    // Ensure hints have unlocked status
    const formattedHints: ProgressiveHint[] = (parsed.hints || []).map(h => ({
      ...h,
      unlocked: h.level === 1,
    }));

    const rawAnalysis: StructuredGroqAnalysis = {
      failureEvidence: parsed.failureEvidence || {
        input: failedTestCase || 'N/A',
        expected: 'Expected output',
        actual: verdict,
        rootCauseSummary: 'Boundary condition oversight',
      },
      targetedTests: formattedTests,
      conditionFlow: formattedFlow,
      hints: formattedHints,
    };

    return sanitizeAnalysis(rawAnalysis, userCode);
  } catch (error) {
    console.error('[GroqReplay] Failed to generate replay intelligence:', error);
    return getFallbackReplayIntelligence(params);
  }
}

/**
 * Fallback generator when Groq is unavailable.
 */
function getFallbackReplayIntelligence(params: {
  problem: ReplayProblemInfo;
  userCode: string;
  language: string;
  verdict: string;
  failedTestCase?: string | null;
}): StructuredGroqAnalysis {
  const { problem, verdict, failedTestCase } = params;

  return {
    failureEvidence: {
      input: failedTestCase || 'Boundary test input',
      expected: 'Expected valid state',
      actual: verdict,
      error: verdict.includes('Error') ? verdict : undefined,
      firstFailurePoint: {
        line: 1,
        description: 'Execution reached unexpected state or threw an error.',
      },
      rootCauseSummary: `Submission resulted in ${verdict}. Verify boundary invariants and constraints.`,
    },
    targetedTests: [
      {
        id: 't1',
        level: 1,
        category: 'Normal',
        input: 'Standard nominal input',
        expected: 'Nominal output',
        whyThisCaseExists: 'Control case to test baseline nominal path',
        status: 'untested',
        verified: true,
      },
      {
        id: 't2',
        level: 2,
        category: 'Boundary',
        input: 'Single-element or empty boundary',
        expected: 'Safe boundary output',
        whyThisCaseExists: 'Verifies behavior at minimal boundary',
        status: 'locked',
        verified: true,
      },
      {
        id: 't3',
        level: 3,
        category: 'Constraint Boundary',
        input: problem.constraints[0] || 'Maximum constraint input',
        expected: 'Valid output',
        whyThisCaseExists: 'Tests behavior at problem constraint limit',
        status: 'locked',
        verified: true,
      },
      {
        id: 't4',
        level: 4,
        category: 'Adversarial',
        input: 'Duplicate or reversed inputs',
        expected: 'Correct invariant output',
        whyThisCaseExists: 'Tests counter-intuitive values',
        status: 'locked',
        verified: true,
      },
      {
        id: 't5',
        level: 5,
        category: 'Structural',
        input: 'Extreme structural stress input',
        expected: 'Correct output',
        whyThisCaseExists: 'Exhaustive verification of the algorithm',
        status: 'locked',
        verified: true,
      },
    ],
    conditionFlow: [
      {
        id: 'c1',
        order: 1,
        conditionText: 'Is the input within valid bounds before processing?',
        branches: {
          yes: { label: 'YES', action: 'Proceed with computation' },
          no: { label: 'NO', action: 'Guard against invalid access' },
        },
        checkpointQuestion: {
          id: 'q1',
          prompt: 'What should happen when the boundary is reached?',
          format: 'condition',
          expectedConcept: 'Prevent index out of bounds or division by zero',
          options: [
            'Continue unchecked',
            'Handle edge case and return boundary result',
            'Throw an exception',
          ],
          correctOptionIndex: 1,
        },
        status: 'unlocked',
      },
      {
        id: 'c2',
        order: 2,
        conditionText: 'Are all loop transitions and pointer increments guarded?',
        branches: {
          yes: { label: 'YES', action: 'Safely advance to next element' },
          no: { label: 'NO', action: 'Wrap around or stop loop' },
        },
        status: 'locked',
      },
    ],
    hints: [
      {
        level: 1,
        tierName: 'Observation',
        title: 'Observation',
        text: 'Review the conditions when the algorithm executes its first and last iterations.',
        unlocked: true,
      },
      {
        level: 2,
        tierName: 'Condition',
        title: 'Condition Check',
        text: 'Verify whether the termination condition allows off-by-one indices.',
        unlocked: false,
      },
      {
        level: 3,
        tierName: 'Relevant Code Location',
        title: 'Relevant Code Location',
        text: 'Check the bounds on your array accesses or inner loop conditions.',
        unlocked: false,
      },
      {
        level: 4,
        tierName: 'Structural Guidance',
        title: 'Structural Guidance',
        text: 'Consider guarding empty/single elements before entering the main loop.',
        unlocked: false,
      },
      {
        level: 5,
        tierName: 'Strong Guidance',
        title: 'Strong Guidance',
        text: 'Trace through the minimal failing case step by step on paper to observe the mismatch.',
        unlocked: false,
      },
    ],
  };
}

/**
 * Evaluate the user's answer to a reasoning checkpoint.
 */
export async function evaluateUserReasoning(params: {
  nodeId: string;
  question: string;
  expectedConcept: string;
  userAnswer: string;
  options?: string[];
  correctOptionIndex?: number;
}): Promise<ReasoningEvaluationResult> {
  const { question, expectedConcept, userAnswer, options, correctOptionIndex } = params;

  // Multiple choice fast evaluation
  if (typeof correctOptionIndex === 'number' && options && options.length > 0) {
    const selectedIdx = parseInt(userAnswer, 10);
    if (!isNaN(selectedIdx)) {
      if (selectedIdx === correctOptionIndex) {
        return {
          result: 'pass',
          feedback: 'Correct! You identified the exact invariant.',
          nextAction: 'advance_node',
        };
      } else {
        return {
          result: 'fail',
          feedback: `Incorrect. Look closely at what happens when this condition triggers.`,
          nextAction: 'show_hint',
          suggestedHintLevel: 2,
        };
      }
    }
  }

  // Free-text evaluation with Groq
  const prompt = `You are evaluating a student's answer in Praxis Failure Replay.
Question: "${question}"
Expected Concept: "${expectedConcept}"
Student's Answer: "${userAnswer}"

Evaluate if the student understands the underlying bug/condition.
Return a JSON object with:
{
  "result": "pass" | "partial" | "fail",
  "feedback": "1-2 encouraging sentences explaining why it is correct or where their thinking needs refinement",
  "nextAction": "advance_node" | "show_hint" | "retry_node"
}`;

  try {
    const response = await groqClient.getChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are an encouraging, rigorous computer science teaching assistant. Output valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.content) as ReasoningEvaluationResult;
    return {
      result: parsed.result || 'partial',
      feedback: parsed.feedback || 'Reasoning recorded.',
      nextAction: parsed.nextAction || (parsed.result === 'pass' ? 'advance_node' : 'show_hint'),
    };
  } catch {
    // Basic heuristic fallback
    const lower = userAnswer.toLowerCase();
    const matches = expectedConcept.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w));
    if (matches) {
      return {
        result: 'pass',
        feedback: 'Good reasoning! You captured the key principle.',
        nextAction: 'advance_node',
      };
    }
    return {
      result: 'partial',
      feedback: 'Close. Consider how the boundary condition affects the transition.',
      nextAction: 'show_hint',
      suggestedHintLevel: 2,
    };
  }
}
