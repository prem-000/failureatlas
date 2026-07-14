/**
 * Compact Prompt Builder
 *
 * Builds a single, uniform prompt for all categories that produces a
 * concise cheat-sheet (~200-250 words) with one visual Mermaid flowchart.
 *
 * PROMPT_VERSION controls cache invalidation: bumping this number causes
 * all existing cached sheets to be regenerated on the next request.
 */

import type { Difficulty, SheetCategory } from '@/types/learning-sheet';

// ─── Version ──────────────────────────────────────────────────────────────────

/**
 * Increment this to force regeneration of all cached sheets.
 * The value is embedded in the DB slug: topic-difficulty-lang-pv{PROMPT_VERSION}
 */
export const PROMPT_VERSION = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromptParams {
  topic: string;
  difficulty: Difficulty;
  category: SheetCategory;
  // Personalization context (optional — populated from user data)
  weaknesses?: Array<{ name: string; pageRankScore: number; frequency: number }>;
  recentFailures?: Array<{ problem: string; rootCause: string; status: string }>;
}

// ─── Difficulty context ───────────────────────────────────────────────────────

const DIFFICULTY_FOCUS: Record<Difficulty, string> = {
  fundamentals: 'Focus on beginners: essential pattern recognition and the simplest mental model.',
  interview:    'Focus on interview readiness: optimal approach, common traps, and must-know complexity.',
  expert:       'Focus on advanced insight: subtle edge cases, complexity nuances, and advanced variants.',
};

// ─── Personalization section ──────────────────────────────────────────────────

function personalizationSection(params: PromptParams): string {
  const { weaknesses, recentFailures } = params;
  if ((!weaknesses || weaknesses.length === 0) && (!recentFailures || recentFailures.length === 0)) {
    return '';
  }

  const parts: string[] = ['\n--- PERSONALIZATION CONTEXT ---'];

  if (weaknesses && weaknesses.length > 0) {
    parts.push("\nUSER'S KNOWN WEAKNESSES:");
    for (const w of weaknesses.slice(0, 3)) {
      parts.push(`- ${w.name} (score: ${w.pageRankScore.toFixed(3)}, occurrences: ${w.frequency})`);
    }
  }

  if (recentFailures && recentFailures.length > 0) {
    parts.push('\nRECENT FAILURES:');
    for (const f of recentFailures.slice(0, 3)) {
      parts.push(`- [${f.problem}] → ${f.status} due to: ${f.rootCause}`);
    }
  }

  parts.push(`
PERSONALIZATION RULES:
- In the "mistakes" array, include mistakes this specific user tends to make
- Add a "personalizedMistakes" field (string array) with warnings for this user's patterns
- Add a "personalizedRecommendations" field (string array) with targeted study advice`);

  return parts.join('\n');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds a compact Gemini prompt that produces a ~200-250 word cheat sheet.
 * Single uniform structure regardless of category.
 */
export function buildPrompt(params: PromptParams): string {
  const { topic, difficulty, category } = params;

  return `You are a competitive programming coach creating a quick-reference cheat sheet.

Topic: ${topic}
Category: ${category}
Difficulty: ${DIFFICULTY_FOCUS[difficulty]}

Generate ONLY the following compact JSON. No implementation code. No external links. No tutorials.
Stay under 250 words total.

Return ONLY valid JSON matching this EXACT structure (no extra fields):
{
  "title": "Pattern Name",
  "coreIdea": "Max 2 concise lines explaining the core concept and when to use it.",
  "recognitionClues": [
    "Clue 1 — what hints at this pattern",
    "Clue 2",
    "Clue 3",
    "Clue 4",
    "Clue 5"
  ],
  "mermaidDiagram": "flowchart TD\\nStart --> Node1\\nNode1 --> Node2...",
  "complexity": {
    "time": "O(...) — one-line explanation",
    "space": "O(...) — one-line explanation"
  },
  "mistakes": [
    "Common mistake 1",
    "Common mistake 2",
    "Common mistake 3",
    "Common mistake 4",
    "Common mistake 5"
  ],
  "practiceProblems": [
    { "name": "Problem Name", "difficulty": "Easy|Medium|Hard", "url": "https://leetcode.com/problems/...", "hint": "One-line hint" },
    { "name": "Problem Name", "difficulty": "Easy|Medium|Hard", "url": "https://leetcode.com/problems/...", "hint": "One-line hint" },
    { "name": "Problem Name", "difficulty": "Easy|Medium|Hard", "url": "https://leetcode.com/problems/...", "hint": "One-line hint" }
  ]
}

Rules:
- recognitionClues: exactly 3–5 bullets
- mistakes: exactly 3–5 bullets
- practiceProblems: exactly 3–5 problems
- mermaidDiagram: Exactly one compact, valid Mermaid.js flowchart explaining the algorithm or pattern workflow. Use simple nodes and arrows (flowchart LR or flowchart TD). Limit to less than 10 nodes. You MUST wrap ALL node text labels in double quotes (e.g. A["Query Range [i, j]"] instead of A[Query Range [i, j]]) to prevent syntax errors with brackets, parenthesis, or punctuation. Make sure it is valid, compile-safe Mermaid code.
- NO implementation code blocks
- NO LaTeX formulas
- NO external reference links (only leetcode.com URLs in practiceProblems)
- NO markdown tables
- Return ONLY the JSON object, nothing else
${personalizationSection(params)}`;
}
