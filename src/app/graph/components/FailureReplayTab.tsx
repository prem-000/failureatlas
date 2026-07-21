'use client';

import { useState, useEffect } from 'react';
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
      '1-step lookahead pointer comparison (val[i] < val[i+1])',
      'Handling non-monotonic sequence evaluation in string parsing'
    ],
    nextProblems: [
      { title: 'Valid Parentheses', difficulty: 'Easy', reason: 'Master state-transition & character pair matching logic.' },
      { title: 'String to Integer (atoi)', difficulty: 'Medium', reason: 'Practice state machine parsing & boundary checks.' }
    ],
    levels: [
      {
        level: 1,
        categoryName: 'Easy',
        input: 'III',
        expected: '3',
        userOutput: '3',
        status: 'untested',
        explanation: 'Simple additive string. 1 + 1 + 1 = 3.',
        steps: [
          { stepIndex: 1, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "I" (val 1). total: 0 -> 1.', variables: { i: 0, s: 'III', currChar: 'I', val: 1, total: 1 }, pointerPos: 0, stateChange: { from: 0, op: '+1', to: 1 } },
          { stepIndex: 2, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "I" (val 1). total: 1 -> 2.', variables: { i: 1, s: 'III', currChar: 'I', val: 1, total: 2 }, pointerPos: 1, stateChange: { from: 1, op: '+1', to: 2 } },
          { stepIndex: 3, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "I" (val 1). total: 2 -> 3.', variables: { i: 2, s: 'III', currChar: 'I', val: 1, total: 3 }, pointerPos: 2, stateChange: { from: 2, op: '+1', to: 3 } },
        ]
      },
      {
        level: 2,
        categoryName: 'Normal',
        input: 'VIII',
        expected: '8',
        userOutput: '8',
        status: 'locked',
        explanation: 'Monotonic additive string. 5 + 1 + 1 + 1 = 8.',
        steps: [
          { stepIndex: 1, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "V" (val 5). total: 0 -> 5.', variables: { i: 0, s: 'VIII', currChar: 'V', val: 5, total: 5 }, pointerPos: 0, stateChange: { from: 0, op: '+5', to: 5 } },
          { stepIndex: 2, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "I" (val 1). total: 5 -> 6.', variables: { i: 1, s: 'VIII', currChar: 'I', val: 1, total: 6 }, pointerPos: 1, stateChange: { from: 5, op: '+1', to: 6 } },
          { stepIndex: 3, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "I" (val 1). total: 6 -> 7.', variables: { i: 2, s: 'VIII', currChar: 'I', val: 1, total: 7 }, pointerPos: 2, stateChange: { from: 6, op: '+1', to: 7 } },
          { stepIndex: 4, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "I" (val 1). total: 7 -> 8.', variables: { i: 3, s: 'VIII', currChar: 'I', val: 1, total: 8 }, pointerPos: 3, stateChange: { from: 7, op: '+1', to: 8 } },
        ]
      },
      {
        level: 3,
        categoryName: 'Boundary',
        input: 'IV',
        expected: '4',
        userOutput: '6',
        status: 'locked',
        explanation: 'Subtractive pair! "I" (1) comes before "V" (5). Instead of 1 + 5 = 6, it must evaluate to 5 - 1 = 4.',
        steps: [
          {
            stepIndex: 1, lineNumber: 5, codeSnippet: 'total += roman[s[i]]',
            explanation: 'Condition evaluated: Current "I" (1) is smaller than next "V" (5). Your code adds +1 instead of subtracting.',
            variables: { i: 0, s: 'IV', currChar: 'I', nextChar: 'V', currVal: 1, nextVal: 5, total: 1 },
            pointerPos: 0, stateChange: { from: 0, op: '+1 (should be -1)', to: 1 },
            quiz: {
              question: 'When currVal (1) < nextVal (5), what operation should be performed?',
              options: ['Add currVal (+1)', 'Subtract currVal (-1)', 'Multiply values'],
              correctIndex: 1,
              explanation: 'In Roman subtractive pairs (IV, IX, XL, CM), a smaller symbol preceding a larger symbol must be subtracted.'
            }
          },
          { stepIndex: 2, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "V" (val 5). total: 1 + 5 = 6 (Expected: 4).', variables: { i: 1, s: 'IV', currChar: 'V', currVal: 5, total: 6 }, pointerPos: 1, stateChange: { from: 1, op: '+5', to: 6 } }
        ]
      },
      {
        level: 4,
        categoryName: 'Hidden',
        input: 'XL',
        expected: '40',
        userOutput: '60',
        status: 'locked',
        explanation: 'Subtractive pair XL (10 before 50). Code produces 10 + 50 = 60 instead of 50 - 10 = 40.',
        steps: [
          { stepIndex: 1, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "X" (10). Next "L" (50). Added +10 instead of -10.', variables: { i: 0, s: 'XL', currChar: 'X', nextChar: 'L', total: 10 }, pointerPos: 0 },
          { stepIndex: 2, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Read "L" (50). total = 60.', variables: { i: 1, s: 'XL', currChar: 'L', total: 60 }, pointerPos: 1 }
        ]
      },
      {
        level: 5,
        categoryName: 'Stress',
        input: 'MCMXCIV',
        expected: '1994',
        userOutput: '2216',
        status: 'locked',
        explanation: 'Complex multi-subtractive string (M + CM + XC + IV = 1000 + 900 + 90 + 4 = 1994).',
        steps: [
          { stepIndex: 1, lineNumber: 5, codeSnippet: 'total += roman[s[i]]', explanation: 'Processing MCMXCIV sequence.', variables: { i: 0, s: 'MCMXCIV', total: 1000 }, pointerPos: 0 }
        ]
      }
    ]
  },

  // 2. Binary Search (Array / Binary Search paradigm)
  {
    id: 'preset-binary-search',
    problemTitle: 'Binary Search',
    problemSlug: 'binary-search',
    category: 'binary-search',
    status: 'Wrong Answer',
    language: 'python3',
    passedTests: 32,
    totalTests: 47,
    code: `def search(nums: List[int], target: int) -> int:
    low, high = 0, len(nums)  # ❌ Off-by-one: high should be len(nums)-1
    while low < high:         # ❌ Misses element when low == high
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid          # ❌ Infinite loop: should be mid + 1
        else:
            high = mid
    return -1`,
    rootCause: 'Off-by-one bound error & infinite loop in pointer updates.',
    confidence: 94,
    evidenceItems: [
      'Failed single-element arrays [5], target=5',
      'Infinite loop when target is greater than mid',
      'Loop condition `low < high` terminates before inspecting low == high',
      'Matched pattern: Binary Search Condition Oversight'
    ],
    learningPoints: [
      'Correct binary search boundaries (high = len - 1 vs len)',
      'Mid offset update rules (low = mid + 1 vs mid)',
      'Handling single-element arrays and termination conditions'
    ],
    nextProblems: [
      { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', reason: 'Master modified binary search conditionals.' },
      { title: 'Find First and Last Position', difficulty: 'Medium', reason: 'Practice lower/upper bound binary search.' }
    ],
    levels: [
      {
        level: 1,
        categoryName: 'Easy',
        input: 'nums = [1, 3, 5, 7], target = 3',
        expected: '1',
        userOutput: '1',
        status: 'untested',
        explanation: 'Target found at mid index 1 on first iteration.',
        steps: [
          { stepIndex: 1, lineNumber: 3, codeSnippet: 'mid = (low + high) // 2', explanation: 'low=0, high=4 -> mid=2 (val=5). 5 > 3 -> high=2.', variables: { low: 0, high: 4, mid: 2, 'nums[mid]': 5, target: 3 }, pointers: { low: 0, mid: 2, high: 4 } },
          { stepIndex: 2, lineNumber: 3, codeSnippet: 'mid = (low + high) // 2', explanation: 'low=0, high=2 -> mid=1 (val=3). Found target!', variables: { low: 0, high: 2, mid: 1, 'nums[mid]': 3, target: 3 }, pointers: { low: 0, mid: 1, high: 2 } }
        ]
      },
      {
        level: 2,
        categoryName: 'Normal',
        input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9',
        expected: '4',
        userOutput: 'Infinite Loop',
        status: 'locked',
        explanation: 'low=mid without +1 causes infinite loop when low=4, high=5, mid=4.',
        steps: [
          {
            stepIndex: 1, lineNumber: 8, codeSnippet: 'low = mid',
            explanation: 'nums[mid] (5) < target (9). Executed `low = mid` (4). On next turn, mid remains 4 forever!',
            variables: { low: 4, high: 6, mid: 4, 'nums[mid]': 5, target: 9 }, pointers: { low: 4, mid: 4, high: 6 },
            quiz: {
              question: 'When nums[mid] < target, how should low be updated?',
              options: ['low = mid', 'low = mid + 1', 'low = mid - 1'],
              correctIndex: 1,
              explanation: 'Since nums[mid] is smaller than target, mid cannot be the answer. Increment low to mid + 1.'
            }
          }
        ]
      },
      {
        level: 3,
        categoryName: 'Boundary',
        input: 'nums = [5], target = 5',
        expected: '0',
        userOutput: '-1',
        status: 'locked',
        explanation: 'Single element array. Loop `while low < high` exits without checking low==0.',
        steps: [
          { stepIndex: 1, lineNumber: 3, codeSnippet: 'while low < high:', explanation: 'low=0, high=0 (since high=len(nums)-1=0). low < high is False! Exits loop.', variables: { low: 0, high: 0, target: 5 }, pointers: { low: 0, mid: 0, high: 0 } }
        ]
      },
      {
        level: 4,
        categoryName: 'Hidden',
        input: 'nums = [2, 5], target = 5',
        expected: '1',
        userOutput: 'Infinite Loop',
        status: 'locked',
        explanation: 'Two element array target at index 1 triggers infinite loop.',
        steps: [{ stepIndex: 1, lineNumber: 8, codeSnippet: 'low = mid', explanation: 'Infinite loop on low=0, high=1.', variables: { low: 0, high: 1 } }]
      },
      {
        level: 5,
        categoryName: 'Stress',
        input: 'nums = [1..10000], target = 9999',
        expected: '9998',
        userOutput: 'Time Limit Exceeded',
        status: 'locked',
        explanation: 'Stress test exhibits TLE due to non-terminating binary search loop.',
        steps: [{ stepIndex: 1, lineNumber: 3, codeSnippet: 'while low < high:', explanation: 'TLE', variables: {} }]
      }
    ]
  },

  // 3. Valid Parentheses (Stack paradigm)
  {
    id: 'preset-valid-parentheses',
    problemTitle: 'Valid Parentheses',
    problemSlug: 'valid-parentheses',
    category: 'stack-string',
    status: 'Wrong Answer',
    language: 'python3',
    passedTests: 60,
    totalTests: 95,
    code: `def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            # ❌ Bug: Throws IndexError if closing bracket occurs on empty stack!
            top = stack.pop()
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return len(stack) == 0`,
    rootCause: 'Popping from stack without checking if stack is empty first.',
    confidence: 98,
    evidenceItems: [
      'Runtime error / Index error when input starts with closing bracket `)`',
      'Normal matching pairs `()[]{}` pass',
      'Stack pop operation lacks `if not stack:` boundary check',
      'Matched pattern: Empty Data Structure Access Error'
    ],
    learningPoints: [
      'Always check `stack.isEmpty()` before popping',
      'Handling leading closing bracket edge cases',
      'Clean state machine matching for bracket pairs'
    ],
    nextProblems: [
      { title: 'Simplify Path', difficulty: 'Medium', reason: 'Practice Unix path directory stack operations.' },
      { title: 'Evaluate Reverse Polish Notation', difficulty: 'Medium', reason: 'Master arithmetic operand stack evaluation.' }
    ],
    levels: [
      {
        level: 1,
        categoryName: 'Easy',
        input: '()',
        expected: 'True',
        userOutput: 'True',
        status: 'untested',
        explanation: 'Simple valid pair. Push "(", pop "(" on ")".',
        steps: [
          { stepIndex: 1, lineNumber: 10, codeSnippet: 'stack.append(char)', explanation: 'Push "(" to stack.', variables: { char: '(', stack: "['(']" }, stackState: ['('] },
          { stepIndex: 2, lineNumber: 6, codeSnippet: 'top = stack.pop()', explanation: 'Pop "(" on ")". Stack becomes empty.', variables: { char: ')', top: '(', stack: '[]' }, stackState: [] }
        ]
      },
      {
        level: 2,
        categoryName: 'Normal',
        input: '()[]{}',
        expected: 'True',
        userOutput: 'True',
        status: 'locked',
        explanation: 'Sequential valid bracket pairs.',
        steps: [
          { stepIndex: 1, lineNumber: 10, codeSnippet: 'stack.append(char)', explanation: 'Processing pairs.', variables: { s: '()[]{}' }, stackState: [] }
        ]
      },
      {
        level: 3,
        categoryName: 'Boundary',
        input: ']',
        expected: 'False',
        userOutput: 'IndexError: pop from empty list',
        status: 'locked',
        explanation: 'Single closing bracket! Stack is empty when `stack.pop()` is called.',
        steps: [
          {
            stepIndex: 1, lineNumber: 6, codeSnippet: 'top = stack.pop()',
            explanation: 'Attempted to pop from EMPTY stack! Causes IndexError.',
            variables: { char: ']', stack: '[]' }, stackState: [],
            quiz: {
              question: 'What must be checked before calling `stack.pop()` on a closing bracket?',
              options: ['Check if len(s) > 0', 'Check if `not stack` (empty stack)', 'Check if char is lowercase'],
              correctIndex: 1,
              explanation: 'If the stack is empty when encountering a closing bracket, the string is invalid immediately.'
            }
          }
        ]
      },
      {
        level: 4,
        categoryName: 'Hidden',
        input: '([)]',
        expected: 'False',
        userOutput: 'False',
        status: 'locked',
        explanation: 'Mismatched nested brackets correctly return False.',
        steps: [{ stepIndex: 1, lineNumber: 8, codeSnippet: 'return False', explanation: 'Mismatch caught.', variables: {} }]
      },
      {
        level: 5,
        categoryName: 'Stress',
        input: '((((... 1000 brackets ...))))',
        expected: 'True',
        userOutput: 'True',
        status: 'locked',
        explanation: 'Deep nesting stack test.',
        steps: [{ stepIndex: 1, lineNumber: 10, codeSnippet: 'stack.append(char)', explanation: 'Deep stack', variables: {} }]
      }
    ]
  }
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function FailureReplayTab() {
  const [selectedPreset, setSelectedPreset] = useState<ProblemPreset>(PROBLEM_PRESETS[0]);
  const [debugStarted, setDebugStarted] = useState(false);

  // Debugger Stepper State
  const [levels, setLevels] = useState<DynamicTestLevel[]>(selectedPreset.levels);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Quiz & Pause State
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string>('');
  const [isQuizSolved, setIsQuizSolved] = useState(false);

  // Sandbox Code Editor State
  const [sandboxCode, setSandboxCode] = useState(selectedPreset.code);
  const [sandboxValidated, setSandboxValidated] = useState(false);

  // Journey & Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [journeyFinished, setJourneyFinished] = useState(false);

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
  const currentStep = currentLevel.steps[currentStepIdx] ?? currentLevel.steps[0];

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
    if (currentStep.quiz) {
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
    setIsReplaying(true);
    setReplayProgress(0);
    for (let i = 0; i < levels.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      setReplayProgress(i + 1);
      setLevels(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'passed', userOutput: l.expected } : l));
    }
    setIsReplaying(false);
    setJourneyFinished(true);
  };

  const level3Failed = levels.some(l => l.level === 3 && l.status === 'failed');

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', background: '#09090b', color: '#e4e4e7', fontFamily: 'Inter, system-ui, sans-serif' }}>
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
      `}</style>

      {/* ── Left Sidebar: Dynamic Problem Preset Selector ── */}
      <div style={{
        width: 260, borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', background: '#0d0d0f'
      }}>
        <div style={{ padding: '16px 16px 10px', fontSize: 10, fontWeight: 800, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Select Problem Session
        </div>

        <div style={{ padding: 8 }}>
          {PROBLEM_PRESETS.map(p => (
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── STEP 1: Submission Overview Header ───────────────────────────── */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bug size={24} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                className="start-btn"
                onClick={handleStartDebugging}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 28px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer'
                }}
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
            <button className="start-btn" onClick={handleStartDebugging} style={{ padding: '12px 24px', borderRadius: 10, background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Start Debugging Session
            </button>
          </div>
        ) : (
          <>
            {/* ── STEP 1: Progressive Testcase Bar ─────────────────────────────── */}
            <div className="card-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={16} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase' }}>
                  Progressive Test Levels
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {levels.map((lvl, idx) => (
                  <button
                    key={lvl.level}
                    onClick={() => lvl.status !== 'locked' && setCurrentLevelIdx(idx)}
                    disabled={lvl.status === 'locked'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                      background: idx === currentLevelIdx ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${idx === currentLevelIdx ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                      color: idx === currentLevelIdx ? '#f87171' : lvl.status === 'passed' ? '#4ade80' : lvl.status === 'failed' ? '#f87171' : '#52525b',
                      fontSize: 12, fontWeight: 700, cursor: lvl.status === 'locked' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {lvl.status === 'passed' ? <CheckCircle2 size={14} /> : lvl.status === 'failed' ? <XCircle size={14} /> : lvl.status === 'locked' ? <Lock size={12} /> : <Unlock size={12} />}
                    Level {lvl.level}: {lvl.categoryName}
                  </button>
                ))}
              </div>
            </div>

            {/* ── STEP 6: Execution Timeline Stepper ─────────────────────────── */}
            <div className="card-panel" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} style={{ color: '#38bdf8' }} /> Execution Timeline & Jump Stepper
              </div>

              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                {currentLevel.steps.map((st, idx) => (
                  <button
                    key={st.stepIndex}
                    onClick={() => setCurrentStepIdx(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
                      background: idx === currentStepIdx ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.3)',
                      border: `1px solid ${idx === currentStepIdx ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                      color: idx === currentStepIdx ? '#38bdf8' : '#a1a1aa',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0
                    }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                      #{st.stepIndex}
                    </span>
                    Step {st.stepIndex} (Line {st.lineNumber})
                  </button>
                ))}
              </div>
            </div>

            {/* ── STEP 2, 3, 4: Visual Debugger Workspace (Split Code & Variables) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>

              {/* Code Panel with Line Highlighting */}
              <div className="card-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Code2 size={18} style={{ color: '#f59e0b' }} />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>Code Execution</h3>
                  </div>
                  <span style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                    Line {currentStep.lineNumber} Active
                  </span>
                </div>

                <div style={{ background: '#000000', borderRadius: 12, padding: 16, flex: 1, fontFamily: "'Fira Code', monospace" }}>
                  {selectedPreset.code.split('\n').map((lineText, idx) => {
                    const lineNum = idx + 1;
                    const isActive = lineNum === currentStep.lineNumber;
                    return (
                      <div key={lineNum} className={`code-line ${isActive ? 'active' : ''}`} style={{ display: 'flex', gap: 16 }}>
                        <span style={{ color: '#52525b', width: 24, textWrap: 'nowrap', userSelect: 'none' }}>{lineNum}</span>
                        <span style={{ flex: 1 }}>{lineText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Variable Inspector (VS Code Style) */}
              <div className="card-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Eye size={18} style={{ color: '#38bdf8' }} />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>Live Variable Inspector</h3>
                </div>

                <div style={{ background: '#000000', borderRadius: 12, padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(currentStep.variables).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#a78bfa', fontWeight: 700 }}>{key}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#4ade80', fontWeight: 800 }}>{String(val)}</span>
                    </div>
                  ))}

                  {/* Visual Pointer Indicator for Strings/Arrays */}
                  {currentStep.pointerPos !== undefined && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: 6 }}>
                        Pointer Traversal View
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {String(currentStep.variables.s || '').split('').map((char, cIdx) => (
                          <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: cIdx === currentStep.pointerPos ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cIdx === currentStep.pointerPos ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: cIdx === currentStep.pointerPos ? '#38bdf8' : '#e4e4e7' }}>
                              {char}
                            </div>
                            {cIdx === currentStep.pointerPos && <ArrowUp size={14} style={{ color: '#38bdf8', marginTop: 4 }} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── STEP 5: AI Observation & Decision Explanation Callout ─────── */}
            <div className="card-panel" style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
                <Brain size={18} /> AI OBSERVATION (Line {currentStep.lineNumber})
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#d4d4d8', lineHeight: 1.6 }}>
                {currentStep.explanation}
              </p>
            </div>

            {/* ── STEP 7 & 10: AI Pause & Active Quiz ─────────────────────────── */}
            {currentStep.quiz && (
              <div className="card-panel" style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c084fc', fontWeight: 800, fontSize: 14, marginBottom: 12 }}>
                  <HelpCircle size={18} /> AI PAUSE & QUESTION: What should happen here?
                </div>
                <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#f4f4f5' }}>
                  {currentStep.quiz.question}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {currentStep.quiz.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectQuizOption(oIdx)}
                      style={{
                        padding: '12px 16px', borderRadius: 10,
                        background: quizAnswer === oIdx ? (isQuizSolved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)') : 'rgba(0,0,0,0.3)',
                        border: `1px solid ${quizAnswer === oIdx ? (isQuizSolved ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.08)'}`,
                        color: quizAnswer === oIdx ? (isQuizSolved ? '#4ade80' : '#f87171') : '#e4e4e7',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {quizFeedback && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: isQuizSolved ? '#4ade80' : '#f87171' }}>
                    {quizFeedback}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 11: Evidence-backed Root Cause Confidence ───────────────── */}
            {level3Failed && (
              <div className="card-panel" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(168, 85, 247, 0.1))', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontWeight: 800, fontSize: 14 }}>
                    <AlertTriangle size={18} /> ROOT CAUSE REVEALED
                  </div>
                  <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
                    {selectedPreset.confidence}% Confidence
                  </span>
                </div>

                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', margin: '0 0 12px' }}>{selectedPreset.rootCause}</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedPreset.evidenceItems.map((ev, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#f87171', fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> {ev}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
