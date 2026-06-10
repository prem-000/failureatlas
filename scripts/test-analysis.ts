import { myersDiff, computeDiffConfidence } from '../src/lib/analysis/myers-diff';
import { structuralCodePatternAnalysis } from '../src/lib/analysis/ast-diff';
import { parseBehavioralSignals } from '../src/lib/analysis/behavioral';
import { runBayesianInference, BayesianEvidence } from '../src/lib/inference/bayesian';
import type { SubmissionEvent } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

function testMyersDiff() {
  console.log('\n--- Testing Myers Diff ---');
  const code1 = 'function search(nums) {\n  let left = 0;\n  let right = nums.length;\n  while (left < right) {\n    let mid = Math.floor((left + right) / 2);\n  }\n}';
  const code2 = 'function search(nums) {\n  let left = 0;\n  let right = nums.length - 1;\n  while (left <= right) {\n    let mid = Math.floor((left + right) / 2);\n  }\n}';

  const diff = myersDiff(code1, code2);
  const edits = diff.filter(d => d.type !== 'EQUAL');
  
  assert(edits.length > 0, 'Should find differences between attempts');
  
  const confidence = computeDiffConfidence(diff);
  assert(confidence > 0.5, `Confidence score should be high for boundary operator change (${confidence.toFixed(2)})`);
}

function testStructuralCodePatternAnalysis() {
  console.log('\n--- Testing Structural Code Pattern Analysis ---');
  const oldCode = 'while (left < right) { }';
  const newCode = 'while (left <= right) { }';
  
  const changes = structuralCodePatternAnalysis(oldCode, newCode);
  assert(changes.length > 0, 'Should detect structural condition change');
  
  const boundaryChange = changes.find(c => c.type === 'BOUNDARY_CONDITION_CHANGE');
  assert(!!boundaryChange, 'Should explicitly classify as BOUNDARY_CONDITION_CHANGE');
  
  // Test algorithm selection rewrite detection
  const oldAlgo = 'for (let i = 0; i < n; i++) {\n  for (let j = 0; j < n; j++) {\n    // nested loop\n  }\n}';
  const newAlgo = 'let map = new Map();\nfor (let i = 0; i < n; i++) {\n  map.set(arr[i], i);\n}';
  const rewriteChanges = structuralCodePatternAnalysis(oldAlgo, newAlgo);
  
  const dsChange = rewriteChanges.find(c => c.type === 'DATA_STRUCTURE_CHANGE');
  assert(!!dsChange, 'Should detect DATA_STRUCTURE_CHANGE for Map introduction');
}

function testBehavioralSignals() {
  console.log('\n--- Testing Behavioral Signals ---');
  
  const now = new Date();
  
  const prevAttempt: SubmissionEvent = {
    eventId: 'prev-1',
    sessionId: 'session-1',
    timestamp: new Date(now.getTime() - 25000), // 25 seconds ago
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    problemDifficulty: 'Easy',
    problemTopics: ['Array'],
    problemUrl: '',
    submissionStatus: 'Wrong Answer',
    submissionLanguage: 'javascript',
    submissionCode: 'old code',
    timeSpent: 10,
    attemptNumber: 1,
    rapidSubmission: false
  };

  const currAttempt: SubmissionEvent = {
    eventId: 'curr-1',
    sessionId: 'session-1',
    timestamp: now,
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    problemDifficulty: 'Easy',
    problemTopics: ['Array'],
    problemUrl: '',
    submissionStatus: 'Wrong Answer',
    submissionLanguage: 'javascript',
    submissionCode: 'new code',
    timeSpent: 15,
    attemptNumber: 2,
    rapidSubmission: true
  };

  const signals = parseBehavioralSignals(currAttempt, [prevAttempt]);
  const rapidSignal = signals.find(s => s.type === 'rapid_resubmission');
  assert(!!rapidSignal, 'Should capture rapid_resubmission signal');
}

function testBayesianInference() {
  console.log('\n--- Testing Bayesian Inference Engine ---');
  
  // Case 1: Boundary condition indicators
  const evidence1: BayesianEvidence = {
    hasBoundaryDiff: true,
    hasStructuralBoundaryChange: true,
    hasAlgorithmRewrite: false,
    hasDataStructureChange: false,
    hasImplementationDetailChange: false,
    hasRapidResubmission: true,
    hasLongGap: false,
    hasManyMinorChanges: true,
    verdict: 'Wrong Answer',
    failedTestCase: 'Single element case [5] failed'
  };

  const results1 = runBayesianInference(evidence1);
  assert(results1[0]?.rootCause === 'boundary-condition-error', `Primary root cause should be boundary-condition-error, got: ${results1[0]?.rootCause}`);
  assert(results1[0]?.confidence! > 0.6, `Confidence in boundary error should be high, got: ${results1[0]?.confidence}`);

  // Case 2: Performance complexity oversight indicators
  const evidence2: BayesianEvidence = {
    hasBoundaryDiff: false,
    hasStructuralBoundaryChange: false,
    hasAlgorithmRewrite: false,
    hasDataStructureChange: false,
    hasImplementationDetailChange: false,
    hasRapidResubmission: false,
    hasLongGap: true,
    hasManyMinorChanges: false,
    verdict: 'Time Limit Exceeded'
  };

  const results2 = runBayesianInference(evidence2);
  assert(results2[0]?.rootCause === 'time-complexity-oversight', `Primary root cause should be time-complexity-oversight, got: ${results2[0]?.rootCause}`);
}

function runAllTests() {
  try {
    console.log('🚀 Starting Verification Tests...');
    testMyersDiff();
    testStructuralCodePatternAnalysis();
    testBehavioralSignals();
    testBayesianInference();
    console.log('\n✨ ALL TESTS COMPLETED SUCCESSFULLY! ✨');
  } catch (error: any) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

runAllTests();
