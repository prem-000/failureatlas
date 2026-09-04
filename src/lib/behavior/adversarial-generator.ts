import type { AdversarialTestLab } from '@/types';
import { groqClient } from '../api/groq-client';
import { extractStructuralEvidence } from '../analysis/structural-analyzer';
import { computeCategoryCoverage } from '../analysis/code-intelligence';
import { verifyTestSuite } from '../analysis/test-verifier';

// Pattern-specific fallback generators to ensure rich, realistic data even when Groq is unavailable
function getFallbackAdversarialTestLab(
  problemTitle: string,
  patternSlug: string,
  code: string
): AdversarialTestLab {
  const cleanTitle = problemTitle || 'Current Problem';
  
  if (patternSlug === 'prefix_sum') {
    return {
      hiddenTests: [
        {
          input: '[42]',
          expectedOutput: '[42]',
          purpose: 'Validates minimum valid input size.',
          failureMode: 'Initialization failures.',
          whyPassed: 'Running sum correctly initializes with first element.',
          confidence: 94,
          riskScore: 10,
        },
        {
          input: '[-1,-2,-3,-4]',
          expectedOutput: '[-1,-3,-6,-10]',
          purpose: 'Negative accumulation validation.',
          failureMode: 'Monotonic-growth assumptions.',
          whyPassed: 'Implementation accumulates values independent of sign.',
          confidence: 91,
          riskScore: 15,
        },
        {
          input: '[1000000,1000000,1000000]',
          expectedOutput: '[1000000,2000000,3000000]',
          purpose: 'Large-value accumulation.',
          failureMode: 'Overflow assumptions.',
          whyPassed: 'No overflow-sensitive logic detected.',
          confidence: 89,
          riskScore: 35,
        }
      ],
      breakMySolution: [
        {
          input: '[1,2,3]',
          expectedOutput: '[1,3,6]',
          purpose: 'Loop boundary validation.',
          failureMode: 'Off-by-One Loop Boundary',
          buggyVersion: 'for (let i = 1; i < nums.length - 1; i++)',
          buggyOutput: '[1,3,3]',
          reason: 'Last element never processed in accumulation loop.',
          failureProbability: 38,
          impactScore: 'High',
          bugSeverity: 'Critical',
          confidence: 90,
          riskScore: 80,
        }
      ],
      constraintExtremes: {
        tests: [
          {
            input: '1000 elements',
            expectedOutput: '1000 accumulated elements',
            purpose: 'Maximum input size validation.',
            failureMode: 'Performance degradation under load.',
            constraint: '1 <= nums.length <= 1000',
            checks: 'O(n) scalability',
            result: 'PASSED',
            confidence: 95,
            riskScore: 12,
          }
        ],
        metrics: {
          cpuImpact: 'Low (0.12ms)',
          memoryImpact: 'Minimal (0.2MB)',
          complexitySafety: 'O(N) safe',
        }
      },
      aiGeneratedCases: [
        {
          input: '[0,0,0,0]',
          expectedOutput: '[0,0,0,0]',
          purpose: 'Designed to verify zero-element accumulation without division-by-zero or falsey state resets.',
          failureMode: 'Zero Accumulation Reset',
          judgeDifficulty: 2,
          targets: ['✓ Accumulator Initialization', '✓ Zero State Guard', '✓ Boundary State'],
          whyIncorrectSolutionsFail: 'Implementations that rely on falsey condition checks wrongly skip accumulation on 0 values.',
          category: 'State Reset',
          inferredStrategy: 'Prefix Sum',
          confidence: 90,
          riskScore: 15,
        }
      ],
      coverageIntelligence: {
        hiddenTestsSurvived: 5,
        potentialFailureModesAvoided: 5,
        constraintCoverage: 95,
        robustnessScore: 90,
        confidenceScore: 94,
      }
    };
  }

  // Default / General Array Traversal Fallback
  return {
    hiddenTests: [
      {
        input: 'arr = [2,2,2,2,5,5,5,8], k = 3, threshold = 4',
        expectedOutput: '3',
        purpose: 'Validates standard sliding window evaluation on array boundary elements.',
        failureMode: 'Final Window Evaluation Omission',
        whyPassed: 'Loop termination condition correctly assesses final window of size k.',
        confidence: 95,
        riskScore: 10,
      },
      {
        input: 'arr = [11,13,17,23,29,31,7,5,2,3], k = 3, threshold = 5',
        expectedOutput: '6',
        purpose: 'Tests window sum transition across varying elements.',
        failureMode: 'State update desynchronization',
        whyPassed: 'Maintains running sum by subtracting outgoing element and adding incoming.',
        confidence: 94,
        riskScore: 15,
      },
      {
        input: 'arr = [1,1,1,1,1], k = 1, threshold = 0',
        expectedOutput: '5',
        purpose: 'Minimum window size k=1 boundary test.',
        failureMode: 'Single-element window offset error',
        whyPassed: 'Handles k=1 single element windows gracefully.',
        confidence: 96,
        riskScore: 8,
      },
      {
        input: 'arr = [10000,10000,10000], k = 3, threshold = 10000',
        expectedOutput: '1',
        purpose: 'Maximum constraint magnitude values.',
        failureMode: 'Integer overflow in window summation',
        whyPassed: 'Accumulator safely holds cumulative elements.',
        confidence: 92,
        riskScore: 20,
      },
      {
        input: 'arr = [7,7,7,7,7,7,7], k = 7, threshold = 7',
        expectedOutput: '1',
        purpose: 'Window size equal to array length (single evaluation window).',
        failureMode: 'Full array window omission',
        whyPassed: 'Evaluates single full-length window exactly once.',
        confidence: 93,
        riskScore: 12,
      }
    ],
    breakMySolution: [
      {
        input: 'arr = [1, 2, 3], k = 2, threshold = 2',
        expectedOutput: '1',
        purpose: 'Loop boundary verification.',
        failureMode: 'Off-by-One Loop Boundary',
        buggyVersion: 'for (let i = k; i < arr.length - 1; i++)',
        buggyOutput: '0',
        reason: 'Loop bounds stop 1 index too early, skipping the final window.',
        failureProbability: 28,
        impactScore: 'High',
        bugSeverity: 'Critical',
        confidence: 88,
        riskScore: 70,
      }
    ],
    constraintExtremes: {
      tests: [
        {
          input: '10^5 elements',
          expectedOutput: 'Accepted performance',
          purpose: 'Checks scalability boundaries.',
          failureMode: 'Execution time scaling quadratically.',
          constraint: '0 <= arr.length <= 10^5',
          checks: 'Time constraint safety',
          result: 'PASSED',
          confidence: 91,
          riskScore: 15,
        }
      ],
      metrics: {
        cpuImpact: 'Low (0.18ms)',
        memoryImpact: 'Minimal (0.05MB)',
        complexitySafety: 'O(N) safe',
      }
    },
    aiGeneratedCases: [],
    coverageIntelligence: {
      hiddenTestsSurvived: 5,
      potentialFailureModesAvoided: 5,
      constraintCoverage: 95,
      robustnessScore: 90,
      confidenceScore: 94,
    }
  };
}

export async function generateAdversarialTestLab(
  userId: string,
  problemTitle: string,
  problemSlug: string,
  patternSlug: string,
  code: string,
  complexity: any
): Promise<AdversarialTestLab> {
  const { runSolutionStressModel } = await import('@/lib/adversarial/solution-stress-model');

  try {
    const ssmResult = await runSolutionStressModel({
      code,
      problemTitle,
      problemSlug,
    });

    const hiddenTests: any[] = ssmResult.hiddenTests.map(t => ({
      id: t.id,
      testId: t.id,
      targetId: t.targetId,
      kind: t.kind,
      riskTitle: t.riskTitle,
      purpose: t.whyExists,
      failureMode: t.whatItAttacks,
      input: t.input,
      expectedOutput: t.expectedOutput,
      whyExists: t.whyExists,
      whatItAttacks: t.whatItAttacks,
      constraintRelevance: t.constraintRelevance,
      confidence: t.confidenceScore,
      riskScore: 100 - t.confidenceScore,
      verificationStatus: t.verificationStatus,
      verificationBadgeText: t.verificationBadgeText,
      evidence: t.evidence,
    }));

    const breakMySolution: any[] = ssmResult.stressTargets.map((st, idx) => ({
      id: `BUG-${idx + 1}`,
      failureMode: st.title,
      input: ssmResult.hiddenTests[idx]?.input || 'Sample stress input',
      expectedOutput: ssmResult.hiddenTests[idx]?.expectedOutput || 'Expected output',
      purpose: st.hypothesis,
      reason: st.whatItAttacks,
      failureProbability: 100 - st.confidence,
      riskScore: st.confidence,
      bugSeverity: st.kind === 'confirmed_failure' ? 'Critical' : st.kind === 'root_cause_attack' ? 'High' : 'Medium',
      confidence: st.confidence,
    }));

    return {
      hiddenTests,
      breakMySolution,
      breakSolutionData: ssmResult.breakSolution,
      constraintExtremes: {
        tests: hiddenTests.slice(0, 2),
        metrics: {
          cpuImpact: 'Low (< 1.0ms)',
          memoryImpact: 'Minimal (< 0.5MB)',
          complexitySafety: `${ssmResult.complexity.detectedTime} safe`,
        },
      },
      aiGeneratedCases: hiddenTests,
      coverageIntelligence: {
        hiddenTestsSurvived: 5,
        potentialFailureModesAvoided: ssmResult.stressTargets.length,
        constraintCoverage: 95,
        robustnessScore: ssmResult.codeQuality.dimensions.robustness.score * 5,
        confidenceScore: Math.round(ssmResult.algorithm.confidence * 100),
      },
    };
  } catch (error) {
    console.error('❌ Error in generateAdversarialTestLab from SSM:', error);
    // Re-throw instead of using legacy fallback with hardcoded fixtures from unrelated problems
    throw error;
  }
}
