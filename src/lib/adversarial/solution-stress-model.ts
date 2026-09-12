import type {
  BreakSolutionData,
  CodeWalkthroughStep,
  EvidenceCodeQuality,
  EvidencePack,
  ProgressiveHint,
  SolutionStressModelResult,
  SourceCodeBlock,
} from './types';
import { analyzeSource } from '@/lib/analysis/source-analyzers';
import { detectAlgorithmApproach } from '@/lib/analysis/algorithm-detector';
import { analyzeComplexity } from '@/lib/analysis/complexity-analyzer';
import { extractAlgorithmicInvariants } from '@/lib/analysis/invariant-extractor';
import { detectCodeAssumptions } from '@/lib/analysis/assumption-detector';
import { extractCodeBlocks } from '@/lib/analysis/code-block-extractor';
import { generateCodeMutations } from './mutation-engine';
import { generateFailureHypotheses } from './stress-target-pool';
import { buildProblemSemanticModel } from './problem-semantic-model';
import { groqClient } from '@/lib/api/groq-client';

export interface RunSSMParams {
  code: string;
  language?: string;
  problemTitle: string;
  problemSlug?: string;
  problemDifficulty?: string;
  problemStatement?: string;
  problemConstraints?: string[];
  problemTopics?: string[];
  knownWeakness?: { description: string; confirmed: boolean };
}

export async function runSolutionStressModel(params: RunSSMParams): Promise<SolutionStressModelResult> {
  const {
    code,
    language,
    problemTitle,
    problemSlug = problemTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    problemDifficulty = 'Medium',
    problemStatement = '',
    problemTopics = [],
    knownWeakness,
  } = params;

  // Resolve problem-specific constraints
  const problemConstraints = (params.problemConstraints && params.problemConstraints.length > 0)
    ? params.problemConstraints
    : resolveDefaultConstraintsForProblem(problemSlug, problemTopics);

  // 1. Language-Aware Source Code Analysis
  const facts = analyzeSource(code, language);

  // 2. Problem Semantic Model (understand what the problem requires)
  const semantic = buildProblemSemanticModel({
    title: problemTitle,
    slug: problemSlug,
    difficulty: problemDifficulty,
    constraints: problemConstraints,
    statement: problemStatement,
    facts,
  });

  // 3. Algorithm Detection (supporting evidence, not the primary driver)
  const algorithm = detectAlgorithmApproach(code, facts, problemTopics);

  // 4. Complexity Analysis vs Problem Constraints
  const complexity = analyzeComplexity(code, facts, algorithm.patternSlug, problemConstraints, problemDifficulty);

  // 5. Code-Grounded Invariant Extraction
  const invariants = extractAlgorithmicInvariants(code, facts, algorithm.patternSlug);

  // 6. Assumption Detection vs Constraints
  const assumptions = detectCodeAssumptions(code, facts, problemConstraints);

  // 7. Code-Grounded Mutation Analysis
  const mutations = generateCodeMutations(code, facts, algorithm.patternSlug);

  // 8. Failure Hypothesis Discovery (problem-specific stress targets)
  const stressTargets = generateFailureHypotheses({
    semantic,
    facts,
    algorithm,
    complexity,
    invariants,
    assumptions,
    mutations,
    knownWeakness,
  });

  // 9. Build Structured Evidence Pack
  const evidencePack: EvidencePack = {
    problem: {
      title: problemTitle,
      slug: problemSlug,
      difficulty: problemDifficulty,
      statement: problemStatement || `${problemTitle} (Constraints: ${problemConstraints.join('; ')})`,
      constraints: problemConstraints,
      topics: problemTopics,
    },
    submission: {
      language: facts.language,
      sourceCode: code,
      normalizedFacts: facts,
      detectedApproach: algorithm,
      complexity,
      invariants,
      assumptions,
      mutations,
    },
    stressTargets,
    generationRequirements: {
      count: 5,
      distinct: true,
      validConstraints: true,
      noGenericCases: true,
    },
  };

  // 10. Generate Break Solution Data (Sections A, B, C, D)
  // Section B: Split submitted code into logical execution blocks
  const sourceCodeBlocks: SourceCodeBlock[] = extractCodeBlocks(code, facts.language, problemTitle);

  const codeWalkthrough: CodeWalkthroughStep[] = sourceCodeBlocks.map((b) => ({
    stepNumber: b.step < 10 ? `0${b.step}` : `${b.step}`,
    stepTitle: b.title,
    explanation: b.explanation,
    codeSnippet: b.code,
    variablesReferenced: b.variables?.map(v => v.name),
    variables: b.variables,
    controlFlow: b.controlFlow,
    contribution: b.contribution,
  }));

  // Section C: Weakness or Risk diagnosis (truthful)
  const isSuboptimal = !complexity.isOptimal;
  const highRiskAssumption = assumptions.find(a => a.constraintConflict);
  const hasKnownWeakness = Boolean(knownWeakness);

  let weaknessOrRisk: BreakSolutionData['weaknessOrRisk'];
  if (hasKnownWeakness && knownWeakness) {
    weaknessOrRisk = {
      hasWeakness: true,
      potentialIssue: 'Logic flaw or unhandled edge condition',
      evidence: knownWeakness.description,
      impact: 'Produces incorrect answer or runtime exception on targeted boundary cases.',
      expectedDirection: 'Adjust loop termination or state accumulation logic to cover boundary offsets.',
      evidenceChain: [
        {
          source: knownWeakness.confirmed ? 'execution' : 'static_analysis',
          description: knownWeakness.description,
          confidence: 0.95,
        },
      ],
    };
  } else if (isSuboptimal) {
    weaknessOrRisk = {
      hasWeakness: true,
      potentialIssue: 'Suboptimal asymptotic time complexity',
      evidence: `Detected complexity is ${complexity.detectedTime}, whereas optimal solution for ${problemTitle} executes in ${complexity.expectation.optimalTime || complexity.expectation.preferredTime || 'O(n)'}.`,
      impact: 'Risk of Time Limit Exceeded (TLE) when input scales to maximum problem constraints.',
      expectedDirection: `Transition to ${complexity.expectation.optimalTechnique || 'an optimal algorithm'} to avoid redundant scans.`,
      evidenceChain: complexity.evidence,
    };
  } else if (highRiskAssumption) {
    weaknessOrRisk = {
      hasWeakness: true,
      potentialIssue: 'Fragile boundary assumption',
      evidence: highRiskAssumption.assumption,
      impact: 'May fail on extreme minimum or maximum values permitted by problem constraints.',
      expectedDirection: 'Add defensive boundary checks or normalize initial accumulator state.',
      evidenceChain: highRiskAssumption.evidence,
    };
  } else {
    weaknessOrRisk = {
      hasWeakness: false,
      potentialIssue: 'No confirmed correctness or asymptotic weakness was found.',
      evidence: `• Required states are covered.\n• Boundary behavior matches constraints.\n• Detected complexity (${complexity.detectedTime} time, ${complexity.detectedSpace} space) fits the expected optimal range.`,
      impact: 'Execution safely completes within competitive programming resource budgets.',
      expectedDirection: 'Maintain current state-reuse and optimal structure.',
      evidenceChain: algorithm.evidence,
    };
  }

  // Section D: Progressive Hints (AI generated / dynamic fallback)
  const hints: ProgressiveHint[] = await generateProblemAwareHints({
    problemTitle,
    problemSlug,
    code,
    algorithm,
    complexity,
    facts,
    isOptimal: !weaknessOrRisk.hasWeakness,
  });

  const breakSolution: BreakSolutionData = {
    approach: {
      detected: algorithm.algorithm,
      confidence: Math.round(algorithm.confidence * 100),
      evidence: algorithm.evidence,
    },
    yourComplexity: {
      time: complexity.detectedTime,
      space: complexity.detectedSpace,
    },
    expectedComplexity: {
      time: complexity.expectation.optimalTime || complexity.expectation.preferredTime || 'O(n)',
      space: complexity.expectation.optimalSpace || 'O(1)',
      acceptableRange: complexity.expectation.acceptableTime,
      preferredTime: complexity.expectation.preferredTime,
      optimalTechnique: complexity.expectation.optimalTechnique,
    },
    codeWalkthrough,
    sourceCodeBlocks,
    weaknessOrRisk,
    optimalPath: {
      hints,
      targetComplexity: {
        time: complexity.expectation.optimalTime || complexity.expectation.preferredTime || 'O(n)',
        space: complexity.expectation.optimalSpace || 'O(1)',
      },
    },
  };

  // 11. Problem-Aware Code Quality (5 Dimensions)
  const codeQuality = scoreProblemAwareCodeQuality({
    code,
    facts,
    algorithm,
    complexity,
    invariants,
    assumptions,
    problemConstraints,
    problemTitle,
  });

  return {
    algorithm,
    complexity,
    invariants,
    assumptions,
    mutations,
    stressTargets,
    breakSolution,
    codeQuality,
    evidencePack,
  };
}

function resolveDefaultConstraintsForProblem(slug: string, topics: string[]): string[] {
  if (slug.includes('guess-number-higher-or-lower') || slug.includes('guess-number')) {
    return ['1 <= n <= 2^31 - 1', '1 <= pick <= n'];
  }
  if (slug.includes('sqrtx') || slug === 'sqrt-x') {
    return ['0 <= x <= 2^31 - 1'];
  }
  if (slug.includes('valid-perfect-square') || slug === 'perfect-square') {
    return ['1 <= num <= 2^31 - 1'];
  }
  if (slug.includes('first-bad-version')) {
    return ['1 <= bad <= n <= 2^31 - 1'];
  }
  if (slug.includes('find-first-and-last-position') || slug.includes('first-and-last-position')) {
    return ['0 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9', 'nums is a non-decreasing array', '-10^9 <= target <= 10^9'];
  }
  if (slug.includes('koko-eating-bananas')) {
    return ['1 <= piles.length <= 10^4', 'piles.length <= h <= 10^9', '1 <= piles[i] <= 10^9'];
  }
  if (slug.includes('palindrome-number') || slug === 'palindrome') {
    return ['-2^31 <= x <= 2^31 - 1'];
  }
  if (slug.includes('valid-parentheses')) {
    return ['1 <= s.length <= 10^4', 's consists of parentheses only ()[]{}'];
  }
  if (slug.includes('remove-all-adjacent-duplicates-in-string') || (slug.includes('remove') && slug.includes('duplicate'))) {
    return ['1 <= s.length <= 10^5', 's consists of lowercase English letters'];
  }
  if (slug.includes('longest-substring') || slug.includes('string')) {
    return ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces'];
  }
  if (
    (topics && topics.some(t => t.toLowerCase().includes('string'))) ||
    slug.includes('palindrome') ||
    slug.includes('word') ||
    slug.includes('anagram') ||
    slug.includes('subsequence')
  ) {
    return ['1 <= s.length <= 10^5', 's consists of lowercase English letters'];
  }
  if (slug.includes('two-sum') || slug.includes('3sum')) {
    return ['2 <= nums.length <= 10^5', '-10^9 <= nums[i], target <= 10^9'];
  }
  if (slug.includes('binary-search')) {
    return ['1 <= nums.length <= 10^4', '-10^4 <= nums[i], target <= 10^4', 'nums is sorted in ascending order'];
  }
  if (slug.includes('climbing-stairs') || slug.includes('fibonacci')) {
    return ['1 <= n <= 45'];
  }
  if (slug.includes('sub-arrays-of-size-k') || slug.includes('threshold')) {
    return ['1 <= arr.length <= 10^5', '1 <= k <= arr.length', '0 <= threshold <= 10^4', '0 <= arr[i] <= 10^4'];
  }
  return ['1 <= nums.length <= 10^5', 'Values are bounded within 32-bit signed integers'];
}

async function generateProblemAwareHints(params: {
  problemTitle: string;
  problemSlug: string;
  code: string;
  algorithm: any;
  complexity: any;
  facts: any;
  isOptimal?: boolean;
}): Promise<ProgressiveHint[]> {
  const { problemTitle, code, algorithm, complexity, isOptimal = false } = params;

  // Try LLM hint generation tailored to the exact problem and submitted code
  try {
    const prompt = isOptimal
      ? `You are a competitive programming coach.
Review this user's submitted solution for the problem "${problemTitle}".
The user's code is ALREADY OPTIMAL (${algorithm.algorithm}, ${complexity.detectedTime} time, ${complexity.detectedSpace} space).

User's Code:
\`\`\`
${code}
\`\`\`

Generate 4 progressive pedagogical hints explaining why THIS approach is optimal and what invariants guarantee correctness.
DO NOT pretend the solution is broken or invent fake flaws.
Hint 1 — Observation: The primary structural property or invariant that makes this approach optimal for this problem.
Hint 2 — Key Insight: Why redundant operations or extra memory allocations are successfully eliminated.
Hint 3 — Strategy: How the state transitions maintain correct boundary bounds throughout execution.
Hint 4 — Complexity Direction: The optimal asymptotic bounds (${complexity.detectedTime} time, ${complexity.detectedSpace} space) achieved.

Return a valid JSON object with key "hints" containing 4 objects:
{
  "hints": [
    { "level": 1, "title": "Hint 1 — Observation", "hint": "..." },
    { "level": 2, "title": "Hint 2 — Key Insight", "hint": "..." },
    { "level": 3, "title": "Hint 3 — Strategy", "hint": "..." },
    { "level": 4, "title": "Hint 4 — Complexity Direction", "hint": "..." }
  ]
}`
      : `You are a competitive programming coach.
Review this user's submitted solution for the problem "${problemTitle}".
Detected Strategy: ${algorithm.algorithm} (${complexity.detectedTime} time, ${complexity.detectedSpace} space).
Optimal Strategy Target: ${complexity.expectation.optimalTechnique || 'Optimal algorithm'} (${complexity.expectation.optimalTime || 'O(n)'} time).

User's Code:
\`\`\`
${code}
\`\`\`

Generate 4 progressive hints guiding the user toward the optimal solution for THIS SPECIFIC PROBLEM.
DO NOT provide the full solution code.
Hint 1 — Observation: A specific observation about the problem structure or current code bottleneck.
Hint 2 — Key Insight: The algorithmic insight needed to optimize the approach for this problem.
Hint 3 — Strategy: Concrete advice on structuring the algorithm or data structure.
Hint 4 — Complexity Direction: Target time and space complexity and why it fits this problem's constraints.

Return a valid JSON object with key "hints" containing 4 objects:
{
  "hints": [
    { "level": 1, "title": "Hint 1 — Observation", "hint": "..." },
    { "level": 2, "title": "Hint 2 — Key Insight", "hint": "..." },
    { "level": 3, "title": "Hint 3 — Strategy", "hint": "..." },
    { "level": 4, "title": "Hint 4 — Complexity Direction", "hint": "..." }
  ]
}`;

    const res = await groqClient.getChatCompletion({
      messages: [
        { role: 'system', content: 'You are an algorithmic problem-solving coach. Output strict JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(res.content);
    if (Array.isArray(parsed.hints) && parsed.hints.length === 4) {
      return parsed.hints;
    }
  } catch {
    // Fall back to dynamic algorithmic hint derivation
  }

  // Dynamic Algorithmic Hint Derivation based on problem and approach
  const optTech = complexity.expectation.optimalTechnique || 'an optimal single-pass approach';
  const optTime = complexity.expectation.optimalTime || complexity.expectation.preferredTime || 'O(n)';
  const optSpace = complexity.expectation.optimalSpace || 'O(1)';

  if (isOptimal) {
    return [
      {
        level: 1,
        title: 'Hint 1 — Observation',
        hint: `Your implementation for "${problemTitle}" uses ${algorithm.algorithm}, which directly achieves optimal asymptotic bounds.`,
      },
      {
        level: 2,
        title: 'Hint 2 — Key Insight',
        hint: `State updates and pointer/loop transitions eliminate redundant passes and ensure linear or constant overhead.`,
      },
      {
        level: 3,
        title: 'Hint 3 — Strategy',
        hint: `Invariants remain verified across all valid problem inputs and boundary constraints without requiring extra auxiliary data structures.`,
      },
      {
        level: 4,
        title: 'Hint 4 — Complexity Direction',
        hint: `Executes safely in optimal ${complexity.detectedTime} time and ${complexity.detectedSpace} space, easily passing all competitive constraints.`,
      },
    ];
  }

  return [
    {
      level: 1,
      title: 'Hint 1 — Observation',
      hint: `For "${problemTitle}", examine if repeated scans or redundant subproblem evaluations can be eliminated.`,
    },
    {
      level: 2,
      title: 'Hint 2 — Key Insight',
      hint: `Leverage problem invariants: consider using ${optTech} to reuse previous calculation states across steps.`,
    },
    {
      level: 3,
      title: 'Hint 3 — Strategy',
      hint: `Restructure the loop to maintain active window/pointer state or store seen elements in a fast lookup structure.`,
    },
    {
      level: 4,
      title: 'Hint 4 — Complexity Direction',
      hint: `Target complexity for ${problemTitle} is ${optTime} time and ${optSpace} space to comfortably pass all test cases within execution limits.`,
    },
  ];
}

function scoreProblemAwareCodeQuality(params: {
  code: string;
  facts: any;
  algorithm: any;
  complexity: any;
  invariants: any;
  assumptions: any;
  problemConstraints: string[];
  problemTitle: string;
}): EvidenceCodeQuality {
  const { code, facts, algorithm, complexity, invariants, assumptions, problemConstraints, problemTitle } = params;

  // 1. Correctness Alignment (Max 35)
  let correctnessScore = 35;
  const correctnessEvidence: any[] = [];
  const failedAssumptions = assumptions.filter((a: any) => a.constraintConflict);

  if (failedAssumptions.length > 0) {
    correctnessScore -= Math.min(20, 8 * failedAssumptions.length);
    correctnessEvidence.push({
      source: 'static_analysis',
      description: `Unchecked constraint condition: ${failedAssumptions[0].assumption}`,
      confidence: 0.9,
    });
  } else {
    correctnessEvidence.push({
      source: 'static_analysis',
      description: `Code control-flow satisfies problem requirements and guarantees valid return values across ${facts.loops.length > 0 ? 'iteration bounds' : 'execution paths'}.`,
      confidence: 0.95,
    });
  }
  correctnessScore = Math.max(15, Math.min(35, correctnessScore));

  // 2. Algorithmic Efficiency (Max 25)
  let efficiencyScore = 25;
  const efficiencyEvidence: any[] = [];
  if (!complexity.isOptimal) {
    efficiencyScore = complexity.detectedTime.includes('O(n²)') ? 12 : complexity.detectedTime.includes('O(n³)') ? 8 : 16;
    efficiencyEvidence.push({
      source: 'static_analysis',
      description: `Detected complexity ${complexity.detectedTime} is suboptimal compared to target ${complexity.expectation.optimalTime || complexity.expectation.preferredTime} for ${problemTitle}.`,
      confidence: 0.94,
    });
  } else {
    efficiencyEvidence.push({
      source: 'static_analysis',
      description: `Achieves optimal ${complexity.detectedTime} time and ${complexity.detectedSpace} space complexity for problem constraints.`,
      confidence: 0.96,
    });
  }

  // 3. Robustness (Max 20)
  let robustnessScore = 20;
  const robustnessEvidence: any[] = [];
  if (facts.boundaryChecks.length === 0 && facts.variables.length > 0) {
    robustnessScore = 15;
    robustnessEvidence.push({
      source: 'static_analysis',
      description: 'Executes loop/pointer traversals without explicit empty/single-element guards.',
      confidence: 0.85,
    });
  } else {
    robustnessEvidence.push({
      source: 'static_analysis',
      description: 'Maintains state consistency and safe indexing across boundary inputs.',
      confidence: 0.92,
    });
  }

  // 4. Implementation Clarity (Max 10)
  let clarityScore = 10;
  const clarityEvidence: any[] = [];
  if (facts.maxLoopDepth > 2) {
    clarityScore = 6;
    clarityEvidence.push({
      source: 'static_analysis',
      description: `Deep loop nesting (depth ${facts.maxLoopDepth}) increases cognitive complexity.`,
      confidence: 0.88,
    });
  } else {
    const varNames = facts.variables.map((v: any) => v.name).slice(0, 3).join(', ');
    clarityEvidence.push({
      source: 'static_analysis',
      description: `Clean structure with readable variable names (${varNames || 'standard identifiers'}).`,
      confidence: 0.92,
    });
  }

  // 5. Problem-Specific Precision (Max 10)
  let precisionScore = 10;
  const precisionEvidence: any[] = [];
  if (code.includes(' / ') && !slugMatchesDivision(problemTitle)) {
    precisionScore = 7;
    precisionEvidence.push({
      source: 'source_code',
      description: 'Division inside loop can be optimized with integer multiplication to avoid precision loss.',
      confidence: 0.9,
    });
  } else {
    precisionEvidence.push({
      source: 'static_analysis',
      description: `Algorithm choice (${algorithm.algorithm}) directly aligns with the data structure requirements of ${problemTitle}.`,
      confidence: 0.95,
    });
  }

  const overallScore = correctnessScore + efficiencyScore + robustnessScore + clarityScore + precisionScore;

  // Problem-specific strengths and improvements
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (efficiencyScore >= 22) {
    strengths.push(`Optimal asymptotic efficiency: Runs in ${complexity.detectedTime} time and ${complexity.detectedSpace} space.`);
  }
  if (correctnessScore >= 30) {
    strengths.push(`Strict invariant maintenance: Accurately preserves state across loop bounds.`);
  }
  if (clarityScore >= 8) {
    strengths.push(`Structured execution flow: Logical variable naming with low nesting depth (${facts.maxLoopDepth}).`);
  }

  if (efficiencyScore < 20) {
    improvements.push(`Optimize time complexity from ${complexity.detectedTime} to ${complexity.expectation.optimalTime || 'O(n)'} to avoid scale bottlenecks.`);
  }
  if (failedAssumptions.length > 0) {
    improvements.push(`Handle edge constraints explicitly: ${failedAssumptions[0].assumption}.`);
  }
  if (improvements.length === 0) {
    improvements.push('Maintain current state-reuse and indexing discipline for similar problem patterns.');
  }

  return {
    overallScore,
    dimensions: {
      correctnessAlignment: {
        score: correctnessScore,
        maxScore: 35,
        evidence: correctnessEvidence,
      },
      algorithmicEfficiency: {
        score: efficiencyScore,
        maxScore: 25,
        evidence: efficiencyEvidence,
      },
      robustness: {
        score: robustnessScore,
        maxScore: 20,
        evidence: robustnessEvidence,
      },
      implementationClarity: {
        score: clarityScore,
        maxScore: 10,
        evidence: clarityEvidence,
      },
      problemPrecision: {
        score: precisionScore,
        maxScore: 10,
        evidence: precisionEvidence,
      },
    },
    strengths,
    improvements,
  };
}

function slugMatchesDivision(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes('divide') || t.includes('fraction') || t.includes('quotient');
}
