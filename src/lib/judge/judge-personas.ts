/**
 * src/lib/judge/judge-personas.ts
 *
 * Four distinct judge personas, each with its own goal, mutation preferences,
 * and prompt fragment. The persona shapes what the LLM prioritizes when generating tests.
 */

import type { JudgePersona } from '@/types';

export interface PersonaConfig {
  id: JudgePersona;
  displayName: string;
  emoji: string;
  tagline: string;
  primaryGoal: string;
  mutationPreferences: string[];
  difficultyBias: number;   // 0–1, multiplier on target difficulty stage
  systemInstruction: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

export const JUDGE_PERSONAS: Record<JudgePersona, PersonaConfig> = {
  leetcode: {
    id: 'leetcode',
    displayName: 'LeetCode',
    emoji: '🎯',
    tagline: 'Implementation Correctness',
    primaryGoal: 'Verify that the implementation handles all edge cases correctly — boundary conditions, empty inputs, single elements, duplicates, and off-by-one errors.',
    mutationPreferences: ['Duplicate Values', 'Prefix Mutation', 'Suffix Mutation', 'Minimum Constraints'],
    difficultyBias: 0.8,
    systemInstruction: `You are a LeetCode judge. Your goal is IMPLEMENTATION CORRECTNESS.
Focus on: boundary conditions (n=0, n=1), off-by-one errors, duplicate values, empty inputs,
integer edge cases (INT_MIN, INT_MAX), and common implementation mistakes.
Prefer minimal, instructive counterexamples. Every test must show WHY a flawed implementation breaks.
Avoid adversarial complexity attacks — focus on correctness over stress.`,
    color: '#f97316',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    bgColor: 'rgba(249, 115, 22, 0.08)',
  },

  codeforces: {
    id: 'codeforces',
    displayName: 'Codeforces',
    emoji: '⚡',
    tagline: 'Algorithm Destruction',
    primaryGoal: 'Destroy incorrect algorithms with adversarial inputs — worst-case orderings, degenerate structures, hash collisions, and complexity traps.',
    mutationPreferences: ['Adversarial Ordering', 'Worst Case Complexity', 'Reverse', 'Oscillating', 'Dense Distribution'],
    difficultyBias: 1.4,
    systemInstruction: `You are a Codeforces problem setter. Your goal is ALGORITHM DESTRUCTION.
Focus on: adversarial input orderings that break greedy assumptions, worst-case time complexity inputs,
hash collision attacks (anti-hash tests), recursion depth stack overflows, degenerate tree structures
(linear chains, all-left trees), maximum constraint stress tests, and inputs that cause TLE in O(n²) solutions.
Generate tests that ELIMINATE incorrect algorithms — not just test edge cases.
Prefer large, structured adversarial inputs over minimal examples.`,
    color: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },

  icpc: {
    id: 'icpc',
    displayName: 'ICPC',
    emoji: '🧮',
    tagline: 'Mathematical Correctness',
    primaryGoal: 'Verify mathematical correctness — overflow arithmetic, precision issues, modular arithmetic, and proof-level invariant verification.',
    mutationPreferences: ['Overflow Mutation', 'Extreme Constraints', 'Maximum Constraints', 'Stable Ordering'],
    difficultyBias: 1.2,
    systemInstruction: `You are an ICPC problem setter. Your goal is MATHEMATICAL CORRECTNESS.
Focus on: integer overflow (values near 2^31, 2^63), precision edge cases, modular arithmetic errors,
off-by-one in mathematical formulas, incorrect handling of negative numbers, division by zero,
mathematical invariant violations, and cases where the formula is correct but the implementation
loses precision. Generate tests that verify the algorithm's mathematical foundation, not just its code.
Each test must target a specific mathematical property or invariant.`,
    color: '#a855f7',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    bgColor: 'rgba(168, 85, 247, 0.08)',
  },

  hackerrank: {
    id: 'hackerrank',
    displayName: 'HackerRank',
    emoji: '📊',
    tagline: 'Constraint Coverage',
    primaryGoal: 'Ensure full constraint coverage — test at minimum, maximum, and boundary constraint values. Verify scalability under declared constraints.',
    mutationPreferences: ['Maximum Constraints', 'Sparse Distribution', 'Large Equal Blocks', 'Alternating Pattern'],
    difficultyBias: 1.0,
    systemInstruction: `You are a HackerRank judge. Your goal is CONSTRAINT COVERAGE.
Focus on: testing at exact constraint boundaries (n=1, n=N_MAX, values at INT_MIN/INT_MAX),
sparse vs dense input distributions, uniform inputs (all same value), alternating patterns,
large blocks of equal elements, performance scalability at declared constraint limits,
and memory usage under maximum constraints. Generate a progression of tests that systematically
cover the full declared constraint space. Each test must represent a distinct region of the constraint space.`,
    color: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    bgColor: 'rgba(16, 185, 129, 0.08)',
  },
};

export function getPersonaConfig(persona: JudgePersona): PersonaConfig {
  return JUDGE_PERSONAS[persona];
}

export function formatPersonaForPrompt(persona: JudgePersona): string {
  const p = JUDGE_PERSONAS[persona];
  return `Judge Persona: ${p.displayName}
Primary Goal: ${p.primaryGoal}
System Instruction: ${p.systemInstruction}
Preferred Mutations: ${p.mutationPreferences.join(', ')}`;
}
