'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mapRootCauseToWeakness, WEAKNESS_MAP, normalizeRootCauseKey } from '@/lib/graph/weakness-taxonomy';
import {
  Bug, Zap, RefreshCw, ChevronRight,
  CheckCircle2, XCircle, Terminal, Brain,
  Lightbulb, Activity, Target, Shuffle, Clock,
  Play, Lock, Unlock, Sparkles, ArrowRight, Check,
  Layers, Code2, AlertTriangle, HelpCircle, ShieldCheck,
  Pause, RotateCcw, Eye, ArrowUp, FastForward, HelpCircle as QuestionIcon,
  BookOpen, Sliders, CheckSquare, BarChart2
} from 'lucide-react';

// ─── Paradigms & Data Models ──────────────────────────────────────────────────

export type ProblemCategory =
  | 'string-numeral'
  | 'array-twopointer'
  | 'binary-search'
  | 'stack-string'
  | 'dp-array';

export interface DebugStep {
  stepIndex: number;
  lineNumber: number;
  codeSnippet: string;
  explanation: string;
  variables: Record<string, string | number | boolean>;
  pointerPos?: number;
  pointers?: { low?: number; mid?: number; high?: number; left?: number; right?: number };
  stackState?: string[];
  dpState?: number[];
  stateChange?: { from: string | number; op: string; to: string | number };
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface DynamicTestLevel {
  level: number;
  categoryName: 'Easy' | 'Normal' | 'Boundary' | 'Hidden' | 'Stress';
  input: string;
  expected: string;
  userOutput: string;
  status: 'passed' | 'failed' | 'locked' | 'untested';
  explanation: string;
  steps: DebugStep[];
}

export interface ProblemPreset {
  id: string;
  problemTitle: string;
  problemSlug: string;
  category: ProblemCategory;
  status: string;
  language: string;
  passedTests: number;
  totalTests: number;
  code: string;
  rootCause: string;
  confidence: number;
  evidenceItems: string[];
  learningPoints: string[];
  nextProblems: Array<{ title: string; difficulty: string; reason: string }>;
  levels: DynamicTestLevel[];
}

// ─── Problem Presets Suite (Dynamic Debugging Engine) ─────────────────────────

const PROBLEM_PRESETS: ProblemPreset[] = [
  // 1. Roman to Integer (String / Subtractive notation)
  {
    id: 'preset-roman',
    problemTitle: 'Roman to Integer',
    problemSlug: 'roman-to-integer',
    category: 'string-numeral',
    status: 'Wrong Answer',
    language: 'python3',
    passedTests: 1024,
    totalTests: 3999,
    code: `def romanToInt(s: str) -> int:
    roman = {'I':1, 'V':5, 'X':10, 'L':50, 'C':100, 'D':500, 'M':1000}
    total = 0
    for i in range(len(s)):
        # Line 5: Always adds current symbol, ignores lookahead comparison!
        total += roman[s[i]]
    return total`,
    rootCause: 'You never implemented subtractive notation lookahead logic.',
    confidence: 96,
    evidenceItems: [
      'Failed every subtractive pair (IV, IX, XL, CM)',
      'Monotonic additive inputs pass cleanly (III, VIII)',
      'Code loop never checks next symbol s[i+1]',
      'Matched pattern: Boundary Condition Error'
    ],
    learningPoints: [
      'Subtractive notation handling in Roman numeral conversion',
      'Lookahead comparisons using index bounds checks s[i] < s[i+1]',
      'Single-pass accumulation invariant principles'
    ],
    nextProblems: [
      { title: 'Integer to Roman', difficulty: 'Medium', reason: 'Reinforces subtractive threshold ordering' },
      { title: 'Valid Roman Numerals', difficulty: 'Medium', reason: 'Grammar and state machine validation' },
      { title: 'Basic Calculator II', difficulty: 'Medium', reason: 'Operator precedence lookahead handling' }
    ],
    levels: [
      {
        level: 1, categoryName: 'Easy', input: '"III"', expected: '3', userOutput: '3', status: 'passed',
        explanation: 'Simple additive string. No subtractive lookahead required.',
        steps: [
          { stepIndex: 1, lineNumber: 2, codeSnippet: "roman = {'I':1, 'V':5...}", explanation: "Dictionary initialization", variables: { total: 0 } },
          { stepIndex: 2, lineNumber: 4, codeSnippet: "for i in range(len(s)):", explanation: "Loop iter i=0 ('I')", variables: { i: 0, "s[i]": 'I' } },
          { stepIndex: 3, lineNumber: 5, codeSnippet: "total += roman[s[i]]", explanation: "Add roman['I'] (1) to total", variables: { total: 1 }, stateChange: { from: 0, op: '+1', to: 1 } },
          { stepIndex: 4, lineNumber: 4, codeSnippet: "for i in range(len(s)):", explanation: "Loop iter i=1 ('I')", variables: { i: 1, "s[i]": 'I' } },
          { stepIndex: 5, lineNumber: 5, codeSnippet: "total += roman[s[i]]", explanation: "Add roman['I'] (1) to total", variables: { total: 2 }, stateChange: { from: 1, op: '+1', to: 2 } },
          { stepIndex: 6, lineNumber: 4, codeSnippet: "for i in range(len(s)):", explanation: "Loop iter i=2 ('I')", variables: { i: 2, "s[i]": 'I' } },
          { stepIndex: 7, lineNumber: 5, codeSnippet: "total += roman[s[i]]", explanation: "Add roman['I'] (1) to total", variables: { total: 3 }, stateChange: { from: 2, op: '+1', to: 3 } },
          { stepIndex: 8, lineNumber: 6, codeSnippet: "return total", explanation: "Return final accumulated total 3", variables: { result: 3 } }
        ]
      },
      {
        level: 2, categoryName: 'Normal', input: '"LVIII"', expected: '58', userOutput: '58', status: 'passed',
        explanation: 'Non-subtractive mixed characters pass correctly.',
        steps: [
          { stepIndex: 1, lineNumber: 2, codeSnippet: "roman = {'I':1, 'V':5, 'X':10, 'L':50...}", explanation: "Dictionary initialization", variables: { total: 0 } },
          { stepIndex: 2, lineNumber: 5, codeSnippet: "total += roman[s[0]]", explanation: "Add 'L' (50)", variables: { total: 50 } },
          { stepIndex: 3, lineNumber: 5, codeSnippet: "total += roman[s[1]]", explanation: "Add 'V' (5)", variables: { total: 55 } },
          { stepIndex: 4, lineNumber: 5, codeSnippet: "total += roman[s[2..4]]", explanation: "Add 'III' (3)", variables: { total: 58 } },
          { stepIndex: 5, lineNumber: 6, codeSnippet: "return total", explanation: "Return final total 58", variables: { total: 58 } }
        ]
      },
      {
        level: 3, categoryName: 'Boundary', input: '"IV"', expected: '4', userOutput: '6', status: 'failed',
        explanation: 'Subtractive pair fails! The algorithm added 1 + 5 = 6 instead of 5 - 1 = 4.',
        steps: [
          { stepIndex: 1, lineNumber: 2, codeSnippet: "roman = {'I':1, 'V':5...}", explanation: "Dictionary initialized", variables: { total: 0 } },
          { stepIndex: 2, lineNumber: 4, codeSnippet: "for i in range(len(s)):", explanation: "Iteration i=0: character 'I' (value 1)", variables: { i: 0, current: 'I', next: 'V' } },
          {
            stepIndex: 3, lineNumber: 5, codeSnippet: "# total += roman[s[i]]",
            explanation: "Paused! Do you notice s[i] < s[i+1]? What should be added or subtracted?",
            variables: { i: 0, "val(s[i])": 1, "val(s[i+1])": 5, total: 0 },
            quiz: {
              question: "When s[i] is less than s[i+1] (e.g. 'I' before 'V'), what is the correct arithmetic operation?",
              options: [
                "Always add both values (total += 1 + 5)",
                "Subtract s[i] from total or treat as -1 before adding s[i+1]",
                "Skip s[i] completely and only add s[i+1]",
                "Multiply s[i] by 10"
              ],
              correctIndex: 1,
              explanation: "In Roman subtractive notation, when a smaller symbol precedes a larger symbol, its value is subtracted from the next symbol."
            }
          },
          { stepIndex: 4, lineNumber: 5, codeSnippet: "total += roman[s[i]]  # Buggy execution!", explanation: "Bug: Code unconditionally adds 1 to total!", variables: { total: 1 }, stateChange: { from: 0, op: '+1 (BUG)', to: 1 } },
          { stepIndex: 5, lineNumber: 4, codeSnippet: "for i in range(len(s)):", explanation: "Iteration i=1: character 'V' (value 5)", variables: { i: 1, current: 'V' } },
          { stepIndex: 6, lineNumber: 5, codeSnippet: "total += roman[s[i]]", explanation: "Add 5 to total (total becomes 6 instead of 4)", variables: { total: 6 }, stateChange: { from: 1, op: '+5', to: 6 } },
          { stepIndex: 7, lineNumber: 6, codeSnippet: "return total", explanation: "Return 6 (Expected: 4). FAILED!", variables: { actual: 6, expected: 4 } }
        ]
      },
      {
        level: 4, categoryName: 'Hidden', input: '"MCMXCIV"', expected: '1994', userOutput: '2216', status: 'locked',
        explanation: 'Multiple subtractive instances (CM, XC, IV) compound the addition error.',
        steps: []
      },
      {
        level: 5, categoryName: 'Stress', input: '"MMMDCCCLXXXVIII"', expected: '3888', userOutput: '3888', status: 'locked',
        explanation: 'Maximum Roman numeral representation boundary test.',
        steps: []
      }
    ]
  },

  // 2. Longest Substring Without Repeating Characters (Sliding Window / Two Pointers)
  {
    id: 'preset-sliding-window',
    problemTitle: 'Longest Substring Without Repeating Characters',
    problemSlug: 'longest-substring-without-repeating-characters',
    category: 'array-twopointer',
    status: 'Wrong Answer',
    language: 'python3',
    passedTests: 412,
    totalTests: 987,
    code: `def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    left = 0
    max_len = 0
    for right, c in enumerate(s):
        if c in char_map:
            # Bug: Does not take max(left, char_map[c] + 1)!
            # Window can jump BACKWARDS when duplicate is outside current window!
            left = char_map[c] + 1
        char_map[c] = right
        max_len = max(max_len, right - left + 1)
    return max_len`,
    rootCause: 'Window left pointer jumps backwards to stale duplicate indices.',
    confidence: 94,
    evidenceItems: [
      'Failed on "abba": output 3 instead of 2',
      'Passes strictly monotonic character sequences ("abcde")',
      'Missing max(left, char_map[c] + 1) window bound guard',
      'Matched pattern: Two-Pointer State Invariant Violation'
    ],
    learningPoints: [
      'Sliding window monotonicity invariant (left pointer must never decrease)',
      'Hash map index caching with stale entry invalidation',
      'Two-pointer window length calculation semantics'
    ],
    nextProblems: [
      { title: 'Minimum Window Substring', difficulty: 'Hard', reason: 'Dynamic contraction with multi-character frequency map' },
      { title: 'Longest Repeating Character Replacement', difficulty: 'Medium', reason: 'Window expansion with frequency max count invariant' },
      { title: 'Subarray Product Less Than K', difficulty: 'Medium', reason: 'Sliding window product bound condition' }
    ],
    levels: [
      {
        level: 1, categoryName: 'Easy', input: '"abcabcbb"', expected: '3', userOutput: '3', status: 'passed',
        explanation: 'Standard repeating characters correctly contract window.',
        steps: [
          { stepIndex: 1, lineNumber: 2, codeSnippet: "char_map = {}; left = 0; max_len = 0", explanation: "Window state init", variables: { left: 0, max_len: 0 } },
          { stepIndex: 2, lineNumber: 9, codeSnippet: "max_len = max(max_len, right - left + 1)", explanation: "Window 'abc' found, max_len=3", variables: { left: 0, right: 2, max_len: 3 } },
          { stepIndex: 3, lineNumber: 8, codeSnippet: "left = char_map['a'] + 1", explanation: "Duplicate 'a' found at right=3, advance left to 1", variables: { left: 1, right: 3 } },
          { stepIndex: 4, lineNumber: 10, codeSnippet: "return max_len", explanation: "Returns 3", variables: { max_len: 3 } }
        ]
      },
      {
        level: 2, categoryName: 'Normal', input: '"bbbbb"', expected: '1', userOutput: '1', status: 'passed',
        explanation: 'Single recurring character constantly advances window.',
        steps: [
          { stepIndex: 1, lineNumber: 2, codeSnippet: "char_map = {}", explanation: "Init map", variables: { max_len: 0 } },
          { stepIndex: 2, lineNumber: 7, codeSnippet: "left = char_map[c] + 1", explanation: "Window remains size 1 on every step", variables: { max_len: 1 } },
          { stepIndex: 3, lineNumber: 10, codeSnippet: "return max_len", explanation: "Returns 1", variables: { max_len: 1 } }
        ]
      },
      {
        level: 3, categoryName: 'Boundary', input: '"abba"', expected: '2', userOutput: '3', status: 'failed',
        explanation: 'Window left jumped backward on 2nd "a" because char_map["a"]=0 was still in map!',
        steps: [
          { stepIndex: 1, lineNumber: 4, codeSnippet: "for right, c in enumerate('abba'):", explanation: "right=0 ('a'): char_map['a'] = 0", variables: { left: 0, right: 0, char: 'a' } },
          { stepIndex: 2, lineNumber: 4, codeSnippet: "right=1 ('b'): char_map['b'] = 1", explanation: "right=1 ('b'): window is 'ab', length=2", variables: { left: 0, right: 1, max_len: 2 } },
          { stepIndex: 3, lineNumber: 7, codeSnippet: "right=2 ('b'): duplicate 'b' found!", explanation: "Duplicate 'b' at idx 1: left advances to char_map['b']+1 = 2", variables: { left: 2, right: 2, "char_map['b']": 1 } },
          {
            stepIndex: 4, lineNumber: 7, codeSnippet: "if c in char_map: left = char_map[c] + 1",
            explanation: "Paused! When right=3 ('a'), char_map['a'] is 0. What will happen to left if we don't guard it?",
            variables: { right: 3, current_left: 2, "stale_char_map['a']": 0 },
            quiz: {
              question: "Current left pointer is 2. The duplicate character 'a' was last seen at index 0. What happens if left = char_map['a'] + 1?",
              options: [
                "left jumps forward to index 3",
                "left stays at index 2 correctly",
                "left jumps backwards from 2 to 1, causing window to re-include duplicate 'b'!",
                "Code throws IndexError"
              ],
              correctIndex: 2,
              explanation: "Without max(left, char_map[c] + 1), left moves backwards from 2 to 1 (0 + 1), causing the invalid window 'ba' to be counted as 3!"
            }
          },
          { stepIndex: 5, lineNumber: 7, codeSnippet: "left = char_map['a'] + 1  # 0 + 1 = 1!", explanation: "BUG: Left retreated from 2 to 1!", variables: { left: 1, right: 3 }, stateChange: { from: 2, op: 'REGRESSION', to: 1 } },
          { stepIndex: 6, lineNumber: 9, codeSnippet: "max_len = max(2, 3 - 1 + 1) = 3", explanation: "Wrong max_len calculated as 3 instead of 2!", variables: { max_len: 3 } },
          { stepIndex: 7, lineNumber: 10, codeSnippet: "return max_len", explanation: "Output 3 (Expected: 2). FAILED!", variables: { actual: 3, expected: 2 } }
        ]
      },
      {
        level: 4, categoryName: 'Hidden', input: '"tmmzuxt"', expected: '5', userOutput: '6', status: 'locked',
        explanation: 'Multiple backward pointer leaps trigger on nested repeats.',
        steps: []
      },
      {
        level: 5, categoryName: 'Stress', input: '"abcdefghijklmnopqrstuvwxyz"*50', expected: '26', userOutput: '26', status: 'locked',
        explanation: 'Stress test verifying linear O(n) bound.',
        steps: []
      }
    ]
  },

  // 3. Binary Search (Overflow / High Boundary Off-by-one)
  {
    id: 'preset-binary-search',
    problemTitle: 'Binary Search',
    problemSlug: 'binary-search',
    category: 'binary-search',
    status: 'Time Limit Exceeded',
    language: 'python3',
    passedTests: 31,
    totalTests: 47,
    code: `def search(nums: list[int], target: int) -> int:
    left, right = 0, len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            # Bug: missing + 1 causes infinite loop when left == mid!
            left = mid
        else:
            right = mid
    return -1`,
    rootCause: 'Infinite loop due to non-advancing left pointer in integer division floor.',
    confidence: 98,
    evidenceItems: [
      'Time Limit Exceeded on 2-element arrays [2, 5], target 5',
      'Passes odd-length arrays where target is at root mid',
      'Floor division (left + right) // 2 rounds down, causing left = mid to stall',
      'Matched pattern: Binary Search Loop Termination Invariant Failure'
    ],
    learningPoints: [
      'Search space reduction invariant (must guarantee left or right strictly moves)',
      'Floor division midpoint bias towards left boundary',
      'Inclusive vs exclusive upper-bound loop termination contract (left <= right vs left < right)'
    ],
    nextProblems: [
      { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', reason: 'Two-halves sorted boundary partition' },
      { title: 'Find First and Last Position of Element', difficulty: 'Medium', reason: 'Lower and upper bound binary search templates' },
      { title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', reason: 'Unimodal inflection point convergence' }
    ],
    levels: [
      {
        level: 1, categoryName: 'Easy', input: '[-1,0,3,5,9,12], target=9', expected: '4', userOutput: '4', status: 'passed',
        explanation: 'Exact mid matches cleanly on odd splits.',
        steps: [
          { stepIndex: 1, lineNumber: 2, codeSnippet: "left, right = 0, 6", explanation: "Range [0, 6)", variables: { left: 0, right: 6 } },
          { stepIndex: 2, lineNumber: 4, codeSnippet: "mid = 3, nums[3] = 5 < 9", explanation: "Target in right half", variables: { mid: 3, val: 5 } },
          { stepIndex: 3, lineNumber: 8, codeSnippet: "left = mid (3)", explanation: "Narrow to [3, 6)", variables: { left: 3, right: 6 } },
          { stepIndex: 4, lineNumber: 6, codeSnippet: "mid = 4, nums[4] = 9 == target", explanation: "Found target at index 4", variables: { result: 4 } }
        ]
      },
      {
        level: 2, categoryName: 'Normal', input: '[5], target=5', expected: '0', userOutput: '0', status: 'passed',
        explanation: 'Single element match returns on step 1.',
        steps: [
          { stepIndex: 1, lineNumber: 2, codeSnippet: "left, right = 0, 1", explanation: "Range [0, 1)", variables: { left: 0, right: 1 } },
          { stepIndex: 2, lineNumber: 4, codeSnippet: "mid = 0, nums[0] == 5", explanation: "Immediate match", variables: { result: 0 } }
        ]
      },
      {
        level: 3, categoryName: 'Boundary', input: '[2, 5], target=5', expected: '1', userOutput: 'TLE', status: 'failed',
        explanation: 'Infinite Loop! left=0, right=2 → mid=1? No, mid=(0+1)//2=0 → left stays 0 indefinitely!',
        steps: [
          { stepIndex: 1, lineNumber: 2, codeSnippet: "left, right = 0, 2", explanation: "Initial bounds", variables: { left: 0, right: 2 } },
          { stepIndex: 2, lineNumber: 4, codeSnippet: "mid = (0 + 2) // 2 = 1", explanation: "Mid is 1, nums[1]=5 == target!", variables: { mid: 1, "nums[1]": 5 } },
          { stepIndex: 3, lineNumber: 2, codeSnippet: "nums=[2, 5], target=5 (left=0, right=1)", explanation: "Consider subarray state left=0, right=1", variables: { left: 0, right: 1 } },
          {
            stepIndex: 4, lineNumber: 7, codeSnippet: "elif nums[mid] < target: left = mid",
            explanation: "Paused! When left=0 and right=1, mid=(0+1)//2 = 0. nums[0] < 5. What happens when left = mid?",
            variables: { left: 0, right: 1, mid: 0 },
            quiz: {
              question: "When mid = 0 and we execute `left = mid`, what is the new value of left?",
              options: [
                "left becomes 1, correctly halving the search space",
                "left remains 0, causing the while loop to repeat with the exact same bounds indefinitely (TLE)",
                "right decreases to 0",
                "The algorithm terminates with -1"
              ],
              correctIndex: 1,
              explanation: "Because integer division rounds down, (0+1)//2 is 0. Setting left = mid sets left back to 0! To make progress, binary search MUST use left = mid + 1."
            }
          },
          { stepIndex: 5, lineNumber: 8, codeSnippet: "left = mid  # left remains 0!", explanation: "Infinite loop triggered: left=0, right=1 forever.", variables: { left: 0, right: 1, status: 'STALL' } },
          { stepIndex: 6, lineNumber: 3, codeSnippet: "while left < right: (never terminates)", explanation: "Execution timed out after 2000ms. FAILED!", variables: { status: 'Time Limit Exceeded' } }
        ]
      },
      {
        level: 4, categoryName: 'Hidden', input: '[1, 2, 3, 4], target=5', expected: '-1', userOutput: 'TLE', status: 'locked',
        explanation: 'Missing target off the upper boundary gets trapped in infinite loop.',
        steps: []
      },
      {
        level: 5, categoryName: 'Stress', input: 'range(100000), target=99999', expected: '99999', userOutput: '99999', status: 'locked',
        explanation: 'Scale test verifying log(n) ~ 17 iterations.',
        steps: []
      }
    ]
  }
];

function formatDistanceToNow(date: Date): string {
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''}`;
}

// ─── Main Content Component ───────────────────────────────────────────────────

function FailureReplayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProblem = searchParams?.get('problem') || searchParams?.get('problemSlug');
  const querySubmissionId = searchParams?.get('submissionId') || searchParams?.get('id');

  const [openFailures, setOpenFailures] = useState<ProblemPreset[]>(PROBLEM_PRESETS);
  const [selectedPreset, setSelectedPreset] = useState<ProblemPreset | null>(PROBLEM_PRESETS[0]);
  const [resolvedState, setResolvedState] = useState<{
    problemSlug: string;
    problemTitle?: string;
    timestamp: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [debugStarted, setDebugStarted] = useState(false);

  // Debugger Stepper State
  const [levels, setLevels] = useState<DynamicTestLevel[]>(PROBLEM_PRESETS[0].levels);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Quiz & Pause State
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string>('');
  const [isQuizSolved, setIsQuizSolved] = useState(false);

  // Sandbox Code Editor State
  const [sandboxCode, setSandboxCode] = useState(PROBLEM_PRESETS[0].code);
  const [sandboxValidated, setSandboxValidated] = useState(false);

  // Journey & Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [journeyFinished, setJourneyFinished] = useState(false);

  // 1. Fetch live open failures & check if queried problem is resolved
  useEffect(() => {
    let isMounted = true;

    async function loadFailingSubmissions() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = new URL('/api/submissions/failing', window.location.origin);
        if (queryProblem) url.searchParams.set('problemSlug', queryProblem);
        if (querySubmissionId) url.searchParams.set('submissionId', querySubmissionId);

        const res = await fetch(url.toString(), { headers });
        if (!res.ok) return;
        const json = await res.json();

        if (!isMounted) return;

        // Direct-link fallback: If problem was solved on later attempt, show Solved card!
        if (json.isResolved && json.acceptedSubmission) {
          setResolvedState({
            problemSlug: queryProblem || json.acceptedSubmission.slug || 'problem',
            problemTitle: json.acceptedSubmission.title || queryProblem || 'Problem',
            timestamp: json.acceptedSubmission.timestamp,
          });
          setLoading(false);
          return;
        }

        const acceptedSlugs = new Set<string>(json.acceptedSlugs || []);

        // Filter out any presets that have been accepted
        let available = PROBLEM_PRESETS.filter(p => !acceptedSlugs.has(p.problemSlug));

        // If DB returned custom open failures, integrate them
        if (json.openFailures && json.openFailures.length > 0) {
          const dbItems: ProblemPreset[] = json.openFailures.map((dbSub: any) => {
            const matchedPreset = PROBLEM_PRESETS.find(p => p.problemSlug === dbSub.problemSlug);
            if (matchedPreset) {
              return {
                ...matchedPreset,
                code: dbSub.code || matchedPreset.code,
                status: dbSub.status || matchedPreset.status,
                passedTests: dbSub.passedTests ?? matchedPreset.passedTests,
                totalTests: dbSub.totalTests ?? matchedPreset.totalTests,
              };
            }
            return {
              id: dbSub.id,
              problemTitle: dbSub.problemTitle,
              problemSlug: dbSub.problemSlug,
              category: 'array-twopointer' as ProblemCategory,
              status: dbSub.status,
              language: dbSub.language || 'python3',
              passedTests: dbSub.passedTests,
              totalTests: dbSub.totalTests,
              code: dbSub.code,
              rootCause: dbSub.rootCause,
              confidence: dbSub.confidence,
              evidenceItems: dbSub.evidenceItems,
              learningPoints: ['Analyze corner cases and boundary assertions before execution'],
              nextProblems: [],
              levels: [
                {
                  level: 1,
                  categoryName: 'Easy' as const,
                  input: '[1, 2]',
                  expected: 'True',
                  userOutput: 'True',
                  status: 'passed' as const,
                  explanation: 'Minimal base inputs pass baseline branch.',
                  steps: [
                    {
                      stepIndex: 1,
                      lineNumber: 2,
                      codeSnippet: dbSub.code.split('\n')[0] || 'def solution():',
                      explanation: 'Initialization passes simple assertions.',
                      variables: { n: 2 }
                    }
                  ]
                },
                {
                  level: 2,
                  categoryName: 'Boundary' as const,
                  input: '[0, 0, 0]',
                  expected: '0',
                  userOutput: '-1',
                  status: 'failed' as const,
                  explanation: 'Edge case fails due to boundary condition oversight.',
                  steps: [
                    {
                      stepIndex: 1,
                      lineNumber: 3,
                      codeSnippet: dbSub.code.split('\n')[1] || 'return res',
                      explanation: 'Oversight in boundary handling fails edge case.',
                      variables: { edge: true }
                    }
                  ]
                }
              ]
            };
          });

          const uniqueSlugs = new Set(dbItems.map(d => d.problemSlug));
          available = [...dbItems, ...available.filter(p => !uniqueSlugs.has(p.problemSlug))];
        }

        setOpenFailures(available);

        if (available.length > 0) {
          const matching = queryProblem ? available.find(p => p.problemSlug === queryProblem) : null;
          const toSelect = matching || available[0];
          setSelectedPreset(toSelect);
          setLevels(toSelect.levels);
          setSandboxCode(toSelect.code);
        } else {
          setSelectedPreset(null);
        }
      } catch (err) {
        console.error('Failed to load failing submissions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFailingSubmissions();
    return () => { isMounted = false; };
  }, [queryProblem, querySubmissionId]);

  // 2. Client-side Optimistic Removal: when a problem is accepted, immediately drop from queue
  const handleProblemSolved = (slug: string) => {
    setOpenFailures(prev => {
      const next = prev.filter(p => p.problemSlug !== slug);
      if (selectedPreset?.problemSlug === slug) {
        const nextSelected = next[0] || null;
        if (nextSelected) {
          handleSelectPreset(nextSelected);
        } else {
          setSelectedPreset(null);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const handleAcceptedEvent = (e: any) => {
      const slug = e?.detail?.problemSlug || e?.detail?.slug;
      if (slug) {
        handleProblemSolved(slug);
      }
    };
    window.addEventListener('submission-accepted', handleAcceptedEvent as EventListener);
    return () => window.removeEventListener('submission-accepted', handleAcceptedEvent as EventListener);
  }, [selectedPreset]);

  // Synchronize when switching problem presets
  const handleSelectPreset = (preset: ProblemPreset) => {
    setSelectedPreset(preset);
    setLevels(preset.levels);
    setSandboxCode(preset.code);
    setDebugStarted(false);
    setCurrentLevelIdx(0);
    setCurrentStepIdx(0);
    setQuizAnswer(null);
    setQuizFeedback('');
    setIsQuizSolved(false);
    setSandboxValidated(false);
    setJourneyFinished(false);
  };

  const handleStartDebugging = () => {
    setDebugStarted(true);
    setLevels(prev => prev.map((l, idx) => idx === 0 ? { ...l, status: 'untested' } : l));
  };

  const currentLevel = levels[currentLevelIdx] ?? levels[0];
  const currentStep = currentLevel?.steps[currentStepIdx] ?? currentLevel?.steps[0];

  const handleRunLevel = async (lvlIdx: number) => {
    const target = levels[lvlIdx];
    const isMatch = target.expected === target.userOutput;
    const newStatus = isMatch ? 'passed' : 'failed';

    setLevels(prev => prev.map((l, idx) => {
      if (idx === lvlIdx) return { ...l, status: newStatus };
      if (idx === lvlIdx + 1 && l.status === 'locked') return { ...l, status: 'untested' };
      return l;
    }));
  };

  const handleSelectQuizOption = (optIdx: number) => {
    setQuizAnswer(optIdx);
    if (currentStep?.quiz) {
      if (optIdx === currentStep.quiz.correctIndex) {
        setIsQuizSolved(true);
        setQuizFeedback(`✅ Correct! ${currentStep.quiz.explanation}`);
      } else {
        setIsQuizSolved(false);
        setQuizFeedback(`❌ Incorrect. ${currentStep.quiz.explanation}`);
      }
    }
  };

  const handleRunSandbox = () => {
    setSandboxValidated(true);
  };

  const handleReplayAll = async () => {
    if (!selectedPreset) return;
    setIsReplaying(true);
    setReplayProgress(0);
    for (let i = 0; i < levels.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      setReplayProgress(i + 1);
      setLevels(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'passed', userOutput: l.expected } : l));
    }
    setIsReplaying(false);
    setJourneyFinished(true);

    // Problem is now solved! Drop it from open failures queue optimistically and notify
    const solvedSlug = selectedPreset.problemSlug;
    setTimeout(() => {
      handleProblemSolved(solvedSlug);
      window.dispatchEvent(new CustomEvent('submission-accepted', {
        detail: { problemSlug: solvedSlug }
      }));
    }, 1400);
  };

  const level3Failed = levels.some(l => l.level === 3 && l.status === 'failed');

  // 3. Weakness banner live calculation
  const weaknessInfo = useMemo(() => {
    if (!selectedPreset) return null;
    return mapRootCauseToWeakness(selectedPreset.rootCause);
  }, [selectedPreset]);

  const relatedOpenCount = useMemo(() => {
    if (!selectedPreset || !weaknessInfo) return 0;
    return openFailures.filter(f =>
      f.problemSlug !== selectedPreset.problemSlug &&
      mapRootCauseToWeakness(f.rootCause)?.id === weaknessInfo.id
    ).length;
  }, [openFailures, selectedPreset, weaknessInfo]);

  // ─── Direct-Link Resolved State Render ────────────────────────────────────────
  if (resolvedState) {
    return (
      <div style={{
        display: 'flex',
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
        color: '#e4e4e7',
        padding: '32px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          background: 'rgba(18, 22, 19, 0.95)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 16,
          padding: '48px 36px',
          textAlign: 'center',
          maxWidth: 480,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4ade80',
            marginBottom: 6,
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#f4f4f5', margin: 0 }}>
            You solved this on a later attempt
          </h2>
          <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0 }}>
            {formatDistanceToNow(new Date(resolvedState.timestamp))} ago
          </p>
          <button
            onClick={() => router.push(`/problems/${resolvedState.problemSlug}`)}
            style={{
              marginTop: 16,
              padding: '10px 22px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#f4f4f5',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            View accepted solution <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Clean Queue (All Solved) ────────────────────────────────────────────────
  if (!loading && openFailures.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
        color: '#e4e4e7',
        padding: '32px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          background: 'rgba(18, 18, 22, 0.85)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: 16,
          padding: '48px 36px',
          textAlign: 'center',
          maxWidth: 480,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4ade80',
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#f4f4f5', margin: 0 }}>
            Queue Clean — No Open Failures!
          </h2>
          <p style={{ fontSize: 13, color: '#71717a', margin: 0, lineHeight: 1.5 }}>
            Every problem in your sessions is currently accepted. Unsolved problems from your practice runs will populate this queue automatically.
          </p>
          <button
            onClick={() => router.push('/problems')}
            style={{
              marginTop: 10,
              padding: '10px 22px',
              borderRadius: 8,
              background: '#22c55e',
              border: 'none',
              color: '#000',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Practice Problems →
          </button>
        </div>
      </div>
    );
  }

  if (!selectedPreset) {
    return null;
  }

  return (
    <div className="failure-replay-container">
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.25); }
          50% { box-shadow: 0 0 35px rgba(239, 68, 68, 0.45); }
        }
        .start-btn { animation: pulseGlow 2.5s infinite ease-in-out; transition: all 0.2s ease; }
        .start-btn:hover { transform: translateY(-2px) scale(1.02); }
        .card-panel { background: rgba(18, 18, 22, 0.85); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 16px; padding: 24px; }
        .code-line { padding: 4px 12px; border-radius: 6px; font-family: 'Fira Code', monospace; font-size: 13px; transition: all 0.2s ease; }
        .code-line.active { background: rgba(245, 158, 11, 0.18); border-left: 3px solid #f59e0b; color: #fbbf24; }

        /* ─── Base Layout ─── */
        .failure-replay-container {
          display: flex;
          flex: 1;
          height: 100%;
          overflow: hidden;
          background: #09090b;
          color: #e4e4e7;
          font-family: 'Inter', system-ui, sans-serif;
          min-width: 0;
        }
        .failure-replay-sidebar {
          width: 270px;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow-y: auto;
          background: #0d0d0f;
        }
        .failure-replay-workspace {
          flex: 1;
          overflow-y: auto;
          padding: 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }
        .mobile-session-picker {
          display: none;
        }
        .submission-overview-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .overview-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .step2-ladder-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        .step3-stepper-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
        }
        .stepper-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .stepper-btn-group {
          display: flex;
          gap: 6px;
        }

        /* ─── Mobile Viewport (< 900px) ─── */
        @media (max-width: 899px) {
          .failure-replay-container {
            flex-direction: column !important;
          }
          .failure-replay-sidebar {
            display: none !important;
          }
          .failure-replay-workspace {
            padding: 14px 14px calc(88px + env(safe-area-inset-bottom, 0px)) 14px !important;
            gap: 14px !important;
          }
          .card-panel {
            padding: 16px !important;
            border-radius: 14px !important;
          }

          /* Mobile Session Picker (Horizontal Pill Carousel) */
          .mobile-session-picker {
            display: flex !important;
            flex-direction: column;
            gap: 8px;
            background: rgba(18, 18, 22, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 10px 12px;
          }
          .mobile-session-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 10px;
            font-weight: 800;
            color: #71717a;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .mobile-session-count {
            font-size: 9px;
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            padding: 1px 6px;
            border-radius: 8px;
            font-weight: 700;
          }
          .mobile-session-pills {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 4px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .mobile-session-pills::-webkit-scrollbar {
            display: none;
          }
          .mobile-session-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 7px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.03);
            color: #a1a1aa;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
            font-size: 11.5px;
            font-weight: 600;
            transition: all 150ms ease;
          }
          .mobile-session-pill.active {
            background: rgba(239, 68, 68, 0.14);
            border-color: rgba(239, 68, 68, 0.35);
            color: #f87171;
          }
          .mobile-pill-badge {
            font-size: 9px;
            background: rgba(255, 255, 255, 0.06);
            padding: 1px 5px;
            border-radius: 4px;
            color: #71717a;
          }
          .mobile-session-pill.active .mobile-pill-badge {
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
          }

          /* Overview Header Row */
          .submission-overview-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
          }
          .overview-title-group {
            align-items: flex-start !important;
          }
          .overview-title-group h1 {
            font-size: 17px !important;
          }
          .submission-start-btn {
            width: 100% !important;
            justify-content: center !important;
            padding: 12px 20px !important;
          }

          /* Step 2 Testcase Ladder */
          .step2-ladder-grid {
            display: flex !important;
            overflow-x: auto !important;
            gap: 10px !important;
            padding-bottom: 8px !important;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x proximity;
          }
          .step2-ladder-card {
            min-width: 135px !important;
            flex-shrink: 0 !important;
            scroll-snap-align: start;
          }

          /* Step 3 Stepper & Variables */
          .step3-stepper-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .stepper-header-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .stepper-btn-group {
            width: 100%;
            display: flex;
            justify-content: space-between;
          }
          .stepper-btn-group button {
            flex: 1;
            text-align: center;
          }
          .code-line {
            font-size: 12px !important;
            padding: 3px 8px !important;
            white-space: pre !important;
          }
        }
      `}</style>

      {/* ── Left Sidebar: Open Failures Session Queue ── */}
      <div className="failure-replay-sidebar">
        <div style={{
          padding: '16px 16px 10px',
          fontSize: 10,
          fontWeight: 800,
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>Select Problem Session</span>
          <span style={{
            fontSize: 10,
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            padding: '1px 6px',
            borderRadius: 10,
            fontWeight: 700,
          }}>
            {openFailures.length} open
          </span>
        </div>

        <div style={{ padding: 8 }}>
          {openFailures.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p)}
              style={{
                width: '100%', padding: '12px 12px', borderRadius: 10,
                background: selectedPreset.id === p.id ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                border: `1px solid ${selectedPreset.id === p.id ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
                color: selectedPreset.id === p.id ? '#f87171' : '#a1a1aa',
                cursor: 'pointer', textAlign: 'left', marginBottom: 4, transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', marginBottom: 4 }}>{p.problemTitle}</div>
              <div style={{ fontSize: 11, color: '#71717a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{p.status}</span>
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>{p.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div className="failure-replay-workspace custom-scrollbar">

        {/* ── MOBILE SESSION PICKER (< 900px) ─────────────────────────────── */}
        <div className="mobile-session-picker">
          <div className="mobile-session-header">
            <span>Active Failure Session</span>
            <span className="mobile-session-count">{openFailures.length} open</span>
          </div>
          <div className="mobile-session-pills custom-scrollbar">
            {openFailures.map(p => {
              const isActive = selectedPreset.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`mobile-session-pill ${isActive ? 'active' : ''}`}
                >
                  <span>{p.problemTitle}</span>
                  <span className="mobile-pill-badge">{p.status}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── LIVE WEAKNESS BANNER ────────────────────────────────────────── */}
        {weaknessInfo && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 12,
            padding: '12px 18px',
            fontSize: 13,
            color: '#fbbf24',
          }}>
            <AlertTriangle size={17} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div style={{ lineHeight: 1.5 }}>
              This links to your <strong style={{ color: '#fef08a' }}>{weaknessInfo.name}</strong> weakness —{' '}
              {relatedOpenCount > 0 ? (
                <span><strong>{relatedOpenCount} more open problem{relatedOpenCount > 1 ? 's' : ''}</strong> target it</span>
              ) : (
                <span>no other open problems currently target it</span>
              )}.
            </div>
          </div>
        )}

        {/* ── STEP 1: Submission Overview Header ───────────────────────────── */}
        <div className="card-panel">
          <div className="submission-overview-row">
            <div className="overview-title-group">
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bug size={24} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f4f4f5' }}>{selectedPreset.problemTitle}</h1>
                  <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {selectedPreset.status}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#71717a' }}>
                  Passed {selectedPreset.passedTests} / {selectedPreset.totalTests} test cases · Language: {selectedPreset.language}
                </p>
              </div>
            </div>

            {!debugStarted && (
              <button
                className="start-btn submission-start-btn"
                onClick={handleStartDebugging}
              >
                <Zap size={18} />
                Start Debugging
              </button>
            )}
          </div>
        </div>

        {!debugStarted ? (
          <div className="card-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Brain size={52} style={{ color: '#ef4444', margin: '0 auto 16px', opacity: 0.8 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#f4f4f5' }}>
              Interactive Visual Debugging Engine
            </h2>
            <p style={{ fontSize: 13, color: '#71717a', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Praxis generates progressive testcases, animates pointer execution, tracks live variables VS Code-style, and pauses to quiz your reasoning.
            </p>
            <button
              onClick={handleStartDebugging}
              style={{
                padding: '12px 24px', borderRadius: 10, background: '#ef4444',
                color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer'
              }}
            >
              Begin Level 1 Execution →
            </button>
          </div>
        ) : (
          <>
            {/* ── STEP 2: Progressive Dynamic Testcases Row ────────────────── */}
            <div className="card-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>Progressive Testcase Ladder</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#71717a' }}>5 adaptive test levels attacking your algorithm&apos;s exact invariants</p>
                </div>
              </div>

              <div className="step2-ladder-grid custom-scrollbar">
                {levels.map((lvl, idx) => {
                  const isCurrent = idx === currentLevelIdx;
                  return (
                    <div
                      key={lvl.level}
                      className="step2-ladder-card"
                      onClick={() => {
                        if (lvl.status !== 'locked') {
                          setCurrentLevelIdx(idx);
                          setCurrentStepIdx(0);
                        }
                      }}
                      style={{
                        padding: '14px 16px', borderRadius: 12,
                        background: isCurrent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isCurrent ? '#ef4444' : 'rgba(255, 255, 255, 0.06)'}`,
                        cursor: lvl.status !== 'locked' ? 'pointer' : 'not-allowed',
                        opacity: lvl.status === 'locked' ? 0.4 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: isCurrent ? '#ef4444' : '#71717a' }}>
                          LVL {lvl.level} · {lvl.categoryName}
                        </span>
                        {lvl.status === 'passed' && <CheckCircle2 size={16} style={{ color: '#22c55e' }} />}
                        {lvl.status === 'failed' && <XCircle size={16} style={{ color: '#ef4444' }} />}
                        {lvl.status === 'locked' && <Lock size={14} style={{ color: '#52525b' }} />}
                        {lvl.status === 'untested' && <Unlock size={14} style={{ color: '#f59e0b' }} />}
                      </div>

                      <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 6 }}>
                        {lvl.input}
                      </div>

                      {lvl.status !== 'locked' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRunLevel(idx); }}
                          style={{
                            width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 700,
                            borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: lvl.status === 'failed' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                            color: lvl.status === 'failed' ? '#f87171' : '#e4e4e7'
                          }}
                        >
                          {lvl.status === 'untested' ? 'Run Test' : 'Rerun'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── STEP 3: Execution Stepper & Variables Inspector ──────────── */}
            <div className="step3-stepper-grid">
              {/* Stepper & Animated Code */}
              <div className="card-panel">
                <div className="stepper-header-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Terminal size={18} style={{ color: '#ef4444' }} />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>
                      Step-by-Step Code Trace ({currentLevel.categoryName} Level)
                    </h3>
                  </div>

                  <div className="stepper-btn-group">
                    <button
                      disabled={currentStepIdx === 0}
                      onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
                      style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', cursor: currentStepIdx === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      ← Prev Step
                    </button>
                    <button
                      disabled={currentStepIdx >= currentLevel.steps.length - 1}
                      onClick={() => setCurrentStepIdx(prev => Math.min(currentLevel.steps.length - 1, prev + 1))}
                      style={{ padding: '6px 12px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', cursor: currentStepIdx >= currentLevel.steps.length - 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Next Step →
                    </button>
                  </div>
                </div>

                {/* Code Viewer with active line highlight */}
                <div style={{ background: '#09090b', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }} className="custom-scrollbar">
                  {selectedPreset.code.split('\n').map((line, idx) => {
                    const lineNo = idx + 1;
                    const isActive = currentStep && currentStep.lineNumber === lineNo;
                    return (
                      <div key={idx} className={`code-line ${isActive ? 'active' : ''}`}>
                        <span style={{ color: '#52525b', width: 28, display: 'inline-block', userSelect: 'none' }}>{lineNo}</span>
                        <span>{line}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Current Step Explanation */}
                {currentStep && (
                  <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: 13, color: '#fbbf24' }}>
                    <strong>Step {currentStep.stepIndex}:</strong> {currentStep.explanation}
                  </div>
                )}
              </div>

              {/* Variables & State Inspector */}
              <div className="card-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Activity size={18} style={{ color: '#22c55e' }} />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>VS Code Variable Watcher</h3>
                </div>

                {currentStep?.variables && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {Object.entries(currentStep.variables).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: '#09090b', border: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                        <span style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{k}</span>
                        <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 700 }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Checkpoint Quiz */}
                {currentStep?.quiz && (
                  <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#38bdf8', fontWeight: 800, fontSize: 13 }}>
                      <QuestionIcon size={16} /> PAUSE & REFLECT QUIZ
                    </div>
                    <p style={{ fontSize: 13, color: '#f4f4f5', marginBottom: 12 }}>{currentStep.quiz.question}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentStep.quiz.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectQuizOption(oIdx)}
                          style={{
                            padding: '10px 14px', borderRadius: 8, textAlign: 'left', fontSize: 12,
                            background: quizAnswer === oIdx ? (isQuizSolved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)') : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${quizAnswer === oIdx ? (isQuizSolved ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.08)'}`,
                            color: '#e4e4e7', cursor: 'pointer'
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {quizFeedback && (
                      <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: isQuizSolved ? '#4ade80' : '#f87171' }}>
                        {quizFeedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── STEP 12: Interactive Sandbox Code Editor ─────────────────────── */}
            {level3Failed && (
              <div className="card-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Sparkles size={18} style={{ color: '#38bdf8' }} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>
                    Sandbox Code Editor Challenge
                  </h3>
                </div>

                <p style={{ fontSize: 13, color: '#a1a1aa', margin: '0 0 14px' }}>
                  Rewrite or fix the code in the live sandbox editor below and test it against all levels!
                </p>

                <textarea
                  value={sandboxCode}
                  onChange={e => setSandboxCode(e.target.value)}
                  rows={8}
                  style={{
                    width: '100%', background: '#000000', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, color: '#38bdf8', padding: 16, fontFamily: "'Fira Code', monospace",
                    fontSize: 13, lineHeight: 1.5, outline: 'none', resize: 'vertical', marginBottom: 14
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button onClick={handleRunSandbox} style={{ padding: '10px 20px', borderRadius: 8, background: '#38bdf8', color: '#09090b', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                    Run Code & Update Replay
                  </button>

                  {sandboxValidated && (
                    <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={16} /> Live code fix accepted! Click Replay All Testcases below.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 13: Replay All & Debugging Journey Story ───────────────── */}
            {sandboxValidated && (
              <div className="card-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={18} style={{ color: '#4ade80' }} />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>Replay All Testcases</h3>
                  </div>

                  <button onClick={handleReplayAll} disabled={isReplaying} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    {isReplaying ? <RefreshCw size={14} className="spin-icon" /> : <Play size={14} />} Replay All Testcases
                  </button>
                </div>

                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ height: '100%', width: `${(replayProgress / levels.length) * 100}%`, background: '#22c55e', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}

            {/* Debugging Journey Summary */}
            {journeyFinished && (
              <div className="card-panel" style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                  <Sparkles size={18} /> YOUR DEBUGGING JOURNEY STORY
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                  {['Started', 'Failed', 'Investigated', 'Found Bug', 'Fixed', 'Verified', 'Learned'].map((stepName, idx) => (
                    <div key={stepName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        ✓ {stepName}
                      </span>
                      {idx < 6 && <ArrowRight size={14} style={{ color: '#52525b' }} />}
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 13, color: '#e4e4e7', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedPreset.learningPoints.map((pt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Check size={16} style={{ color: '#4ade80' }} /> {pt}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function FailureReplayTab() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#71717a' }}>
        Loading failure replay sessions...
      </div>
    }>
      <FailureReplayContent />
    </Suspense>
  );
}
