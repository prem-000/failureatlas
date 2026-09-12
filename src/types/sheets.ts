export type SheetId = 'striver-sde' | 'basic-leetcode' | 'striver-a2z';

export interface SheetOption {
  id: SheetId;
  label: string;
  enabled: boolean;
}

export const SHEET_OPTIONS: SheetOption[] = [
  { id: 'striver-sde',    label: "Striver's SDE Sheet",       enabled: true },
  { id: 'basic-leetcode', label: 'Basic Problems (LeetCode)', enabled: true },
  { id: 'striver-a2z',    label: "Striver's A2Z Sheet",       enabled: false }, // Coming soon
];

export interface SheetProblem {
  id: string;              // stable id, e.g. "sde-d1-p1"
  leetcodeId: number;      // 287
  slug: string;            // "find-the-duplicate-number"
  title: string;           // "Find the Duplicate in an Array"
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];        // ["Array", "Binary Search"]
  whyThisProblem: string;  // shown in the detail drawer
  patterns: string[];      // ["binary-search"]
}

export interface SheetLevel {
  levelNumber: number;     // maps to the "Level N" pill
  label: string;           // section header shown above the node row, e.g. "Day 1 — Arrays"
  problems: SheetProblem[];        // nodes in this level, left-to-right order = edge order
  remediation?: SheetProblem[];    // optional second row (branching off main row)
}

export interface PracticeSheet {
  id: SheetId;
  name: string;
  source: string;          // attribution, e.g. "takeuforward.org — Striver's SDE Sheet"
  levels: SheetLevel[];
}
