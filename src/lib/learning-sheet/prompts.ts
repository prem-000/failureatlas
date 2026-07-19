/**
 * Upgraded Progressive Prompt Builder
 *
 * Builds a tailored prompt for Gemini to produce level-specific, high-retention JSON.
 *
 * PROMPT_VERSION controls cache invalidation: bumping this number causes
 * all existing cached sheets to be regenerated on the next request.
 */

import { getLevelsForTopic, getVisualizationTypeForTopic } from './topic-registry';
import type { SheetCategory } from '@/types/learning-sheet';

// ─── Version ──────────────────────────────────────────────────────────────────

/**
 * Increment this to force regeneration of all cached sheets.
 * The value is embedded in the DB slug: topic-difficulty-lang-pv{PROMPT_VERSION}
 */
export const PROMPT_VERSION = 4;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromptParams {
  topic: string;
  difficulty: string;
  category: SheetCategory;
  // Personalization context
  weaknesses?: Array<{ name: string; pageRankScore: number; frequency: number }>;
  recentFailures?: Array<{ problem: string; rootCause: string; status: string }>;
}

// ─── Visual & Schema Config helpers ───────────────────────────────────────────

function getVisualizationPromptInstructions(visType: string): string {
  switch (visType) {
    case 'pointer':
      return `"visualization": {
    "type": "pointer",
    "array": ["element1", "element2", "element3", "element4", "element5"], // Array/string elements (max 5)
    "steps": [
      {
        "step": 1,
        "action": "Initialize pointers",
        "explanation": "Start left and right pointers at index 0.",
        "left": 0,
        "right": 0,
        "pointers": [{ "name": "L", "index": 0 }, { "name": "R", "index": 0 }]
      }
    ]
  }`;
    case 'grid':
      return `"visualization": {
    "type": "grid",
    "rows": ["row0", "row1", "row2"], // row labels (max 3)
    "cols": ["col0", "col1", "col2"], // column labels (max 3)
    "steps": [
      {
        "step": 1,
        "action": "Initialize cell",
        "explanation": "Set base case dp[0][0] = 0.",
        "row": 0,
        "col": 0,
        "val": "0"
      }
    ]
  }`;
    case 'memory-layout':
      return `"visualization": {
    "type": "memory-layout",
    "structure": "stack", // stack | queue | heap
    "steps": [
      {
        "step": 1,
        "action": "Push item",
        "explanation": "Push active element onto the stack.",
        "state": ["item1", "item2"] // stack values from bottom to top (max 5)
      }
    ]
  }`;
    case 'tree':
      return `"visualization": {
    "type": "tree",
    "nodes": [
      { "id": "start", "label": "Start" }
    ],
    "edges": [
      { "from": "start", "to": "node1" }
    ],
    "steps": [
      {
        "step": 1,
        "action": "Highlight",
        "explanation": "Visiting the root node.",
        "state": ["start"] // Highlighted node IDs in active step (max 3)
      }
    ]
  }`;
    case 'graph':
      return `"visualization": {
    "type": "graph",
    "nodes": [
      { "id": "A", "label": "Node A" }
    ],
    "edges": [
      { "from": "A", "to": "B" }
    ],
    "steps": [
      {
        "step": 1,
        "action": "Highlight Node",
        "explanation": "Exploring Node A from queue.",
        "state": ["A"] // Highlighted node IDs (max 3)
      }
    ]
  }`;
    case 'flowchart':
    default:
      return `"visualization": {
    "type": "flowchart",
    "nodes": [
      { "id": "start", "label": "Start" }
    ],
    "edges": [
      { "from": "start", "to": "next" }
    ],
    "steps": [
      {
        "step": 1,
        "action": "Run process",
        "explanation": "Perform the first step of algorithm."
      }
    ]
  }`;
  }
}

function personalizationSection(params: PromptParams): string {
  const { weaknesses, recentFailures } = params;
  if ((!weaknesses || weaknesses.length === 0) && (!recentFailures || recentFailures.length === 0)) {
    return '';
  }

  const parts: string[] = ['\n--- PERSONALIZATION CONTEXT ---'];

  if (weaknesses && weaknesses.length > 0) {
    parts.push("\nUSER'S KNOWN WEAKNESSES:");
    for (const w of weaknesses.slice(0, 2)) {
      parts.push(`- ${w.name}`);
    }
  }

  if (recentFailures && recentFailures.length > 0) {
    parts.push('\nRECENT FAILURES:');
    for (const f of recentFailures.slice(0, 2)) {
      parts.push(`- [${f.problem}] due to: ${f.rootCause}`);
    }
  }

  parts.push(`
PERSONALIZATION RULES:
- Under 'pitfalls', highlight traps relevant to this user's weaknesses and recent failures.
- Make the mini example or templates directly target these failure modes.`);

  return parts.join('\n');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds a dynamic prompt requesting dynamic levels, visual step actions, and anti-hallucination rules.
 */
export function buildPrompt(params: PromptParams): string {
  const { topic, difficulty, category } = params;
  const visType = getVisualizationTypeForTopic(topic);
  const levels = getLevelsForTopic(topic);
  
  const normLevel = difficulty.toLowerCase().trim();

  // Define schemas
  const fundamentalsSchema = `"fundamentals": {
    "concept": "Simple zero-to-one explanation of the core concept. Under 60 words.",
    "whyItWorks": "Conceptual analogy of why the algorithm works. Under 65 words."
  }`;

  const interviewSchema = `"interview": {
    "strategy": "Core strategy and what interviewers look for. Under 60 words.",
    "template": "A language-independent logic template or clean generic pseudocode block (under 20 lines).",
    "variants": ["Variant name 1", "Variant name 2"], // max 3 variants
    "similarPatterns": [
      { "name": "Similar Pattern", "difference": "One sentence contrast." }
    ] // max 2
  }`;

  const expertSchema = `"expert": {
    "invariants": ["State invariant 1", "State invariant 2"], // Loop/state invariants (max 2)
    "edgeCases": ["Edge case 1", "Edge case 2"], // Sneaky/extreme conditions (max 3)
    "alternatives": [
      { "name": "Brute Force", "complexity": "Time/Space", "prosCons": "Pros/cons summary." }
    ], // max 2
    "followUps": [
      { "question": "Interviewer follow-up question?", "answer": "Optimal solution answer." }
    ], // max 2
    "productionApplications": [
      { "system": "Production System (e.g. Kafka)", "useCase": "How it is applied." }
    ] // max 2
  }`;

  // Progressive Schema builder
  let progressiveSchema = `{\n  "schemaVersion": 2,\n  "title": "Title for ${topic}",\n  "coreIdea": "Max 2 concise lines summary. Under 40 words.",\n  "analogy": {\n    "analogyName": "Short memorable name (e.g., Rubber Band)",\n    "analogyDescription": "One-sentence analogy explanation."\n  },\n  "recognition": {\n    "decisionPath": ["Question 1?", "Question 2?", "YES -> Pattern"], // step-by-step logic decision cards (max 3)\n    "keywords": ["keyword1", "keyword2", "keyword3"], // max 5 keywords\n    "explanation": "One-sentence explanation of when to recognize."\n  },\n  "complexity": {\n    "time": "O(N)",\n    "timeExplanation": "Explains why (under 25 words).",\n    "space": "O(1)",\n    "spaceExplanation": "Explains why (under 25 words)."\n  },\n  "pitfalls": ["Pitfall 1", "Pitfall 2"], // ranked traps (max 3)\n  "practiceRoadmap": [\n    { "name": "Problem Name", "difficulty": "Easy|Medium|Hard", "url": "https://leetcode.com/problems/slug-name/", "hint": "One-line hint" }\n  ], // max 3 real LeetCode problems\n  ${getVisualizationPromptInstructions(visType)},\n  "timeline": {\n    "headers": ["Step", "var1", "var2", "Action"], // max 5 headers\n    "rows": [\n      ["1", "val1", "val2", "Brief action text"]\n    ] // max 5 rows matching visualization steps\n  }`;

  let promptFocus = '';
  if (normLevel === 'fundamentals' || normLevel === 'beginner') {
    progressiveSchema += `,\n  ${fundamentalsSchema}\n}`;
    promptFocus = 'Build Fundamentals: Concept explanation and zero-to-one intuition.';
  } else if (normLevel === 'expert' || normLevel === 'cp' || normLevel === 'advanced') {
    progressiveSchema += `,\n  ${fundamentalsSchema},\n  ${interviewSchema},\n  ${expertSchema}\n}`;
    promptFocus = 'Build Expert: Deep engineering optimizations, loop invariants, real-world applications, and interview follow-up questions.';
  } else {
    // Default/interview/intermediate/advanced
    progressiveSchema += `,\n  ${fundamentalsSchema},\n  ${interviewSchema}\n}`;
    promptFocus = 'Build Interview Readiness: Optimal template code, pattern recognition, variants, and pitfalls.';
  }

  return `You are a world-class coding coach creating a high-retention learning reference sheet.

Topic: ${topic}
Category: ${category}
Selected Level: ${difficulty}
Valid Level Progression for this topic: ${levels.join(', ')}

LEVEL INSTRUCTION:
${promptFocus}

Return ONLY a valid JSON object matching this EXACT structure:
${progressiveSchema}

--- AI FORMATTING RULES ---
✅ Keep text extremely short. Maximum 80 words per paragraph.
✅ Maximum 5 bullets per list. Prefer short, punchy 3-word bullets where possible.
✅ Prefer visuals over text. Output structured timeline rows and visualization steps so the UI can animate them.
✅ For practice problems, ONLY use real, well-known LeetCode problems. Verify URLs match 'https://leetcode.com/problems/slug-name/'.
✅ Never use raw code formatting inside text fields (use normal text).
✅ Generate compact Excalidraw scenes:
   - Coordinates should remain between 0 and 1000.
   - Width and height must not exceed 300 pixels unless necessary.
   - Keep the complete scene within a 1200×800 virtual canvas.
   - Do not place elements extremely far apart.
   - Do not generate oversized rectangles.
   - Use compact spacing.
   - Never generate infinite or extremely large values.

--- ANTI-HALLUCINATION RULES ---
❌ Never invent time/space complexities. Use standard Big-O representation.
❌ Never invent LeetCode problems or invalid URLs. If unsure of the exact LeetCode URL, do not include it.
❌ Never invent theoretical proofs or false interview claims.
❌ If you do not have sufficient correct facts for a section, omit or leave empty.

Return ONLY the raw JSON object, no wrapping in code fences or markdown block formatting.
${personalizationSection(params)}`;
}

