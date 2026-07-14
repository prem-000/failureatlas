/**
 * Zod Parser for Compact Learning Sheet Data
 *
 * Validates and repairs Gemini JSON output using Zod schemas.
 * Matches the new compact LearningSheetData shape (no code, no diagrams).
 * Missing fields are filled with safe defaults so partial AI responses
 * never crash the renderer.
 */

import { z } from 'zod';
import { createHash } from 'crypto';
import type { LearningSheetData } from '@/types/learning-sheet';
import { repairMermaid } from './repair';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const PracticeProblemSchema = z.object({
  name: z.string(),
  difficulty: z.string().default('Medium'),
  url: z.string().optional(),
  hint: z.string().optional(),
});

const LearningSheetSchema = z.object({
  title: z.string().catch('Untitled'),
  coreIdea: z.string().default(''),
  recognitionClues: z.array(z.string()).default([]),
  mermaidDiagram: z.string().optional(),
  complexity: z.object({
    time: z.string().default('O(?)'),
    space: z.string().default('O(?)'),
  }).default({ time: 'O(?)', space: 'O(?)' }),
  mistakes: z.array(z.string()).default([]),
  practiceProblems: z.array(PracticeProblemSchema).default([]),
  personalizedMistakes: z.array(z.string()).optional(),
  personalizedRecommendations: z.array(z.string()).optional(),
});

// ─── JSON Extraction ──────────────────────────────────────────────────────────

/**
 * Extracts clean, balanced JSON from raw Gemini text output.
 * Walks the string to find the first matching balanced '{' and '}'
 * to completely ignore any trailing explanatory text.
 */
function extractJsonString(raw: string): string {
  // If wrapped in markdown code blocks, try to isolate it first
  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  const target = codeBlockMatch ? codeBlockMatch[1].trim() : raw.trim();

  const braceIdx = target.indexOf('{');
  const bracketIdx = target.indexOf('[');
  let startIdx = -1;

  if (braceIdx !== -1 && bracketIdx !== -1) {
    startIdx = Math.min(braceIdx, bracketIdx);
  } else {
    startIdx = braceIdx !== -1 ? braceIdx : bracketIdx;
  }

  if (startIdx === -1) return target;

  let braceCount = 0;
  let inString = false;
  let escape = false;

  const openToken = target[startIdx]; // '{' or '['
  const closeToken = openToken === '{' ? '}' : ']';

  for (let i = startIdx; i < target.length; i++) {
    const char = target[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openToken) {
        braceCount++;
      } else if (char === closeToken) {
        braceCount--;
        if (braceCount === 0) {
          return target.slice(startIdx, i + 1);
        }
      }
    }
  }

  // Fallback to last index match if not balanced
  const lastBrace = target.lastIndexOf(closeToken);
  if (lastBrace !== -1 && lastBrace > startIdx) {
    return target.slice(startIdx, lastBrace + 1);
  }

  return target;
}

// ─── JSON Repair ──────────────────────────────────────────────────────────────

/**
 * Attempts to repair a truncated JSON string by closing open strings,
 * arrays, and objects in correct reverse order, handling dangling colons/commas.
 */
function repairTruncatedJson(str: string): string {
  let repaired = str.trim();
  if (!repaired) return '{}';

  const braceStack: ('{' | '[')[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        braceStack.push('{');
      } else if (char === '}') {
        if (braceStack[braceStack.length - 1] === '{') {
          braceStack.pop();
        }
      } else if (char === '[') {
        braceStack.push('[');
      } else if (char === ']') {
        if (braceStack[braceStack.length - 1] === '[') {
          braceStack.pop();
        }
      }
    }
  }

  // 1. Close open string literal
  if (inString) {
    repaired += '"';
  }

  repaired = repaired.trim();

  if (repaired.endsWith(':')) {
    repaired += ' null';
  }

  // 2. Close any open braces/brackets
  while (braceStack.length > 0) {
    const last = braceStack.pop();
    repaired = repaired.trim();
    if (repaired.endsWith(',')) {
      repaired = repaired.slice(0, -1).trim();
    }

    if (last === '{') {
      const lastWordMatch = repaired.match(/"[^"]+"\s*$/);
      if (lastWordMatch) {
        repaired += ': null';
      }
      repaired += '}';
    } else if (last === '[') {
      repaired += ']';
    }
  }

  return repaired;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses and repairs raw Gemini output into a validated LearningSheetData.
 *
 * 1. Extracts JSON from markdown code fences
 * 2. Parses with JSON.parse
 * 3. If that fails, attempts to auto-repair truncation/cut-offs
 * 4. Validates against Zod schema
 * 5. Missing fields get safe defaults
 *
 * @throws Error if the raw string cannot be parsed as JSON at all
 */
export function parseAndRepair(raw: string): LearningSheetData {
  const jsonStr = extractJsonString(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (initialError) {
    try {
      const repairedJsonStr = repairTruncatedJson(jsonStr);
      parsed = JSON.parse(repairedJsonStr);
    } catch {
      throw new Error(
        `Failed to parse Gemini output as JSON: ${
          initialError instanceof Error ? initialError.message : 'Unknown error'
        }`
      );
    }
  }

  // Zod parse with defaults applied for missing fields
  const result = LearningSheetSchema.safeParse(parsed);

  if (result.success) {
    const parsedData = result.data as LearningSheetData;
    if (parsedData.mermaidDiagram) {
      parsedData.mermaidDiagram = repairMermaid(parsedData.mermaidDiagram);
    }
    return parsedData;
  }

  // If strict parse fails, salvage what we can
  const data = parsed as Record<string, unknown>;
  const rawMermaid = typeof data.mermaidDiagram === 'string' ? data.mermaidDiagram : undefined;
  const repaired: LearningSheetData = {
    title: typeof data.title === 'string' ? data.title : 'Untitled',
    coreIdea: typeof data.coreIdea === 'string' ? data.coreIdea : '',
    recognitionClues: [],
    mermaidDiagram: rawMermaid ? repairMermaid(rawMermaid) : undefined,
    complexity: { time: 'O(?)', space: 'O(?)' },
    mistakes: [],
    practiceProblems: [],
  };

  // Populate complexity
  if (data.complexity && typeof data.complexity === 'object') {
    const c = data.complexity as Record<string, unknown>;
    repaired.complexity = {
      time: typeof c.time === 'string' ? c.time : 'O(?)',
      space: typeof c.space === 'string' ? c.space : 'O(?)',
    };
  }

  // Populate string arrays
  if (Array.isArray(data.recognitionClues))
    repaired.recognitionClues = data.recognitionClues.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(data.mistakes))
    repaired.mistakes = data.mistakes.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(data.personalizedMistakes))
    repaired.personalizedMistakes = data.personalizedMistakes.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(data.personalizedRecommendations))
    repaired.personalizedRecommendations = data.personalizedRecommendations.filter((x): x is string => typeof x === 'string');

  // Populate practice problems
  if (Array.isArray(data.practiceProblems)) {
    repaired.practiceProblems = data.practiceProblems
      .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
      .map((p) => ({
        name: typeof p.name === 'string' ? p.name : 'Unknown Problem',
        difficulty: typeof p.difficulty === 'string' ? p.difficulty : 'Medium',
        url: typeof p.url === 'string' ? p.url : undefined,
        hint: typeof p.hint === 'string' ? p.hint : undefined,
      }));
  }

  return repaired;
}

/**
 * Generates a SHA-256 hash of the learning sheet data for cache deduplication.
 */
export function generateHash(data: LearningSheetData): string {
  const str = JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
}
