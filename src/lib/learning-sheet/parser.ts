/**
 * Zod Parser for Progressive Learning Sheet Data
 *
 * Validates and repairs Gemini JSON output using Zod schemas.
 * Converts structured visualization JSON into Excalidraw scene objects.
 */

import { z } from 'zod';
import { createHash } from 'crypto';
import type { LearningSheetData } from '@/types/learning-sheet';
import { buildExcalidrawScene } from './excalidraw-scene';

// ─── Excalidraw Scene Builder (re-exported for use in VisualizationRegistry) ──

export { buildExcalidrawScene } from './excalidraw-scene';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const PracticeProblemSchema = z.object({
  name: z.string(),
  difficulty: z.string().default('Medium'),
  url: z.string().optional(),
  hint: z.string().optional(),
});

const VisualMemoryHookSchema = z.object({
  analogyName: z.string().default(''),
  analogyDescription: z.string().default(''),
});

const PatternRecognitionSchema = z.object({
  decisionPath: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  explanation: z.string().default(''),
});


// Shared sub-schemas
const NodeSchema = z.object({
  id:          z.string(),
  label:       z.string(),
  explanation: z.string().optional(),
});

const EdgeSchema = z.object({
  from: z.string(),
  to:   z.string(),
});

const StepSchema = z.object({
  step:        z.number(),
  action:      z.string(),
  explanation: z.string(),
  left:        z.number().optional(),
  right:       z.number().optional(),
  pointers:    z.array(z.object({ name: z.string(), index: z.number() })).optional(),
  row:         z.number().optional(),
  col:         z.number().optional(),
  val:         z.string().optional(),
  state:       z.array(z.string()).optional(),
});

/**
 * Accepts both:
 *  - Graph schema:  { type, nodes, edges }
 *  - Step schema:   { type, steps, ... }
 *
 * Uses passthrough() so unknown AI fields are preserved rather than stripped.
 */
const InteractiveVisualizationSchema = z.object({
  type:      z.string().default('flowchart'),
  // Graph flowchart fields (optional — may not exist on legacy sheets)
  nodes:     z.array(NodeSchema).optional(),
  edges:     z.array(EdgeSchema).optional(),
  // Step/array flowchart fields
  array:     z.array(z.string()).optional(),
  rows:      z.array(z.string()).optional(),
  cols:      z.array(z.string()).optional(),
  structure: z.string().optional(),
  steps:     z.array(StepSchema).optional(),
}).passthrough();


const StateTimelineSchema = z.object({
  headers: z.array(z.string()).default([]),
  rows: z.array(z.array(z.string())).default([]),
});

const FundamentalsExtrasSchema = z.object({
  concept: z.string().default(''),
  whyItWorks: z.string().default(''),
});

const InterviewExtrasSchema = z.object({
  strategy: z.string().default(''),
  template: z.string().default(''),
  variants: z.array(z.string()).default([]),
  similarPatterns: z.array(z.object({
    name: z.string(),
    difference: z.string(),
  })).default([]),
});

const ExpertExtrasSchema = z.object({
  invariants: z.array(z.string()).default([]),
  edgeCases: z.array(z.string()).default([]),
  alternatives: z.array(z.object({
    name: z.string(),
    complexity: z.string(),
    prosCons: z.string(),
  })).default([]),
  followUps: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).default([]),
  productionApplications: z.array(z.object({
    system: z.string(),
    useCase: z.string(),
  })).default([]),
});

const LearningSheetSchema = z.object({
  schemaVersion: z.number().default(2),
  title: z.string().catch('Untitled'),
  coreIdea: z.string().default(''),
  analogy: VisualMemoryHookSchema.default({ analogyName: '', analogyDescription: '' }),
  recognition: PatternRecognitionSchema.default({ decisionPath: [], keywords: [], explanation: '' }),
  visualization: InteractiveVisualizationSchema,
  timeline: StateTimelineSchema.default({ headers: [], rows: [] }),
  complexity: z.object({
    time: z.string().default('O(?)'),
    timeExplanation: z.string().default(''),
    space: z.string().default('O(?)'),
    spaceExplanation: z.string().default(''),
  }).default({ time: 'O(?)', timeExplanation: '', space: 'O(?)', spaceExplanation: '' }),
  pitfalls: z.array(z.string()).default([]),
  practiceRoadmap: z.array(PracticeProblemSchema).default([]),
  
  // Progressive difficulty levels
  fundamentals: FundamentalsExtrasSchema.optional(),
  interview: InterviewExtrasSchema.optional(),
  expert: ExpertExtrasSchema.optional(),

  // Compatibility / Fallback properties
  recognitionClues: z.array(z.string()).optional(),
  excalidrawScene: z.any().optional(),
  mistakes: z.array(z.string()).optional(),
  practiceProblems: z.array(PracticeProblemSchema).optional(),
  personalizedMistakes: z.array(z.string()).optional(),
  personalizedRecommendations: z.array(z.string()).optional(),
});

// ─── JSON Extraction ──────────────────────────────────────────────────────────

function extractJsonString(raw: string): string {
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

  const openToken = target[startIdx];
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

  const lastBrace = target.lastIndexOf(closeToken);
  if (lastBrace !== -1 && lastBrace > startIdx) {
    return target.slice(startIdx, lastBrace + 1);
  }

  return target;
}

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

  if (inString) {
    repaired += '"';
  }

  repaired = repaired.trim();

  if (repaired.endsWith(':')) {
    repaired += ' null';
  }

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

  const result = LearningSheetSchema.safeParse(parsed);

  if (result.success) {
    const parsedData = result.data as LearningSheetData;
    
    // Convert structured visualization flowchart/tree/graph to Excalidraw scene
    const vis = parsedData.visualization as any;
    if (vis && (vis.type === 'flowchart' || vis.type === 'graph' || vis.type === 'tree') && vis.nodes && vis.edges) {
      parsedData.excalidrawScene = buildExcalidrawScene(vis);
    }

    // Populate old lists for backwards-compatibility fallbacks
    if (!parsedData.recognitionClues) {
      parsedData.recognitionClues = parsedData.recognition.keywords;
    }
    if (!parsedData.mistakes) {
      parsedData.mistakes = parsedData.pitfalls;
    }
    if (!parsedData.practiceProblems || parsedData.practiceProblems.length === 0) {
      parsedData.practiceProblems = parsedData.practiceRoadmap;
    }

    return parsedData;
  }

  // Fallback parsing (v1 support)
  const data = parsed as Record<string, any>;
  const repaired: LearningSheetData = {
    schemaVersion: 1,
    title: typeof data.title === 'string' ? data.title : 'Untitled',
    coreIdea: typeof data.coreIdea === 'string' ? data.coreIdea : '',
    analogy: { analogyName: '', analogyDescription: '' },
    recognition: { decisionPath: [], keywords: [], explanation: '' },
    visualization: { type: 'flowchart', steps: [] },
    timeline: { headers: [], rows: [] },
    complexity: { time: 'O(?)', timeExplanation: '', space: 'O(?)', spaceExplanation: '' },
    pitfalls: [],
    practiceRoadmap: [],
  };

  if (data.complexity && typeof data.complexity === 'object') {
    const c = data.complexity;
    repaired.complexity = {
      time: typeof c.time === 'string' ? c.time : 'O(?)',
      timeExplanation: typeof c.timeExplanation === 'string' ? c.timeExplanation : '',
      space: typeof c.space === 'string' ? c.space : 'O(?)',
      spaceExplanation: typeof c.spaceExplanation === 'string' ? c.spaceExplanation : '',
    };
  }

  return repaired;
}

export function generateHash(data: LearningSheetData): string {
  const str = JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
}

