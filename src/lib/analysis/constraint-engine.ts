import type { ConstraintIntelligence } from '@/types';

const MAX_OPERATIONS = 100_000_000;

function getOperations(complexity: string, N: number): number {
  const norm = complexity.toLowerCase();
  if (norm.includes('log n') && !norm.includes('n log')) {
    return Math.max(1, Math.round(Math.log2(N)));
  }
  if (norm.includes('n log n')) {
    return Math.max(1, Math.round(N * Math.log2(N)));
  }
  if (norm.includes('n²') || norm.includes('n^2') || norm.includes('n * n')) {
    return N * N;
  }
  if (norm.includes('n³') || norm.includes('n^3')) {
    return N * N * N;
  }
  if (norm.includes('2ⁿ') || norm.includes('2^n')) {
    return Math.pow(2, Math.min(N, 40)); // Prevent massive overflows
  }
  if (norm.includes('1') || norm.includes('constant')) {
    return 1;
  }
  return N; // Default O(n)
}

interface SeededProblem {
  constraints: string[];
  maxInputSize: number;
  inputSizeVariable: string;
  optimalComplexity: string;
  optimalTechnique: string;
  patternRecommendations: { pattern: string; confidence: number; reason: string }[];
}

const SEEDED_PROBLEMS: Record<string, SeededProblem> = {
  'binary-search': {
    constraints: [
      '1 <= nums.length <= 10^4',
      '-10^4 <= nums[i], target <= 10^4',
      'All the integers in nums are unique.',
      'nums is sorted in ascending order.'
    ],
    maxInputSize: 10000,
    inputSizeVariable: 'n',
    optimalComplexity: 'O(log n)',
    optimalTechnique: 'Binary Search',
    patternRecommendations: [
      { pattern: 'Binary Search', confidence: 100, reason: 'Array is sorted and query operations are simple.' },
      { pattern: 'Two Pointer', confidence: 60, reason: 'Pointers can converge, but binary search is faster for lookup.' },
      { pattern: 'Hash Map', confidence: 40, reason: 'Could store elements for O(1) lookup, but uses extra O(n) space.' }
    ]
  },
  'two-sum': {
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9'
    ],
    maxInputSize: 10000,
    inputSizeVariable: 'n',
    optimalComplexity: 'O(n)',
    optimalTechnique: 'One-Pass Hash Map',
    patternRecommendations: [
      { pattern: 'Hash Map', confidence: 95, reason: 'Allows O(1) lookup of target - nums[i] in a single pass.' },
      { pattern: 'Two Pointer', confidence: 70, reason: 'Requires sorting the array first, which takes O(n log n) time.' },
      { pattern: 'Prefix Sum', confidence: 15, reason: 'Subarray sum techniques do not apply to target pairs.' }
    ]
  },
  'longest-substring-without-repeating-characters': {
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.'
    ],
    maxInputSize: 50000,
    inputSizeVariable: 'n',
    optimalComplexity: 'O(n)',
    optimalTechnique: 'Sliding Window with Hash Set/Map',
    patternRecommendations: [
      { pattern: 'Sliding Window', confidence: 95, reason: 'Contiguous subarray/substring search with character uniqueness.' },
      { pattern: 'Hash Map', confidence: 85, reason: 'Stores character frequencies or last seen indices to shrink window.' },
      { pattern: 'Two Pointer', confidence: 75, reason: 'Equivalent to sliding window boundaries.' }
    ]
  },
  'climbing-stairs': {
    constraints: [
      '1 <= n <= 45'
    ],
    maxInputSize: 45,
    inputSizeVariable: 'n',
    optimalComplexity: 'O(n)',
    optimalTechnique: 'Iterative Dynamic Programming',
    patternRecommendations: [
      { pattern: 'Dynamic Programming', confidence: 95, reason: 'Overlapping subproblems: ways to reach step i = ways to reach i-1 + i-2.' },
      { pattern: 'Simulation', confidence: 50, reason: 'Iterative Fibonacci number calculation.' },
      { pattern: 'Binary Search', confidence: 0, reason: 'Decision space is discrete and not sorted.' }
    ]
  }
};

export async function getConstraintIntelligence(
  problemTitle: string,
  problemSlug: string,
  difficulty: string,
  detectedComplexity: string,
  topics: string[],
  code: string
): Promise<ConstraintIntelligence> {
  let extracted = SEEDED_PROBLEMS[problemSlug];

  // Try to use Groq if available
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!extracted && groqApiKey && groqApiKey !== 'your_groq_key_here') {
    try {
      const prompt = `You are a senior competitive programmer reviewing a LeetCode submission.
Analyze the problem "${problemTitle}" (slug: "${problemSlug}", difficulty: "${difficulty}", topics: ${JSON.stringify(topics)}).

Output a valid JSON object matching this schema:
{
  "constraints": ["exact constraints from the problem, e.g. '1 <= n <= 10^5'", "e.g. '1 <= nums[i] <= 10^9'"],
  "maxInputSize": number representing the maximum value of the main input size variable, e.g. 100000,
  "inputSizeVariable": "the main variable name representing the input size, e.g. 'n' or 'nums.length'",
  "optimalComplexity": "the optimal time complexity for this problem, e.g. 'O(n)' or 'O(n log n)'",
  "optimalTechnique": "the optimal algorithm/technique name, e.g. 'Two Pointers' or 'Prefix Sum + Hash Map'",
  "patternRecommendations": [
    {
      "pattern": "Pattern Name (e.g. Hash Map)",
      "confidence": number from 0 to 100,
      "reason": "Clear, concise reason why this pattern applies (or doesn't) based on constraints and requirements"
    }
  ]
}

Ensure the patternRecommendations list contains at least 3-4 standard patterns (such as Hash Map, Two Pointer, Prefix Sum, Binary Search, Sliding Window) ranked by confidence.
Return ONLY valid JSON. No markdown blocks.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        const content = resJson.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content.trim());
          extracted = {
            constraints: parsed.constraints || [],
            maxInputSize: parsed.maxInputSize || 100000,
            inputSizeVariable: parsed.inputSizeVariable || 'n',
            optimalComplexity: parsed.optimalComplexity || 'O(n)',
            optimalTechnique: parsed.optimalTechnique || 'Optimal Approach',
            patternRecommendations: parsed.patternRecommendations || []
          };
        }
      }
    } catch (e) {
      console.warn('⚠️ Groq call for constraints failed, falling back to heuristics:', e);
    }
  }

  // Fallback heuristic generator if still not found
  if (!extracted) {
    let maxInputSize = 100000;
    if (difficulty === 'Easy') maxInputSize = 10000;
    else if (difficulty === 'Hard') maxInputSize = 50000;

    let inputSizeVariable = 'n';
    if (topics.includes('String')) inputSizeVariable = 's.length';
    else if (topics.includes('Array')) inputSizeVariable = 'nums.length';

    let optimalComplexity = 'O(n)';
    let optimalTechnique = 'Hash Map / Two Pointer';

    if (problemSlug.includes('search') || topics.includes('Binary Search')) {
      optimalComplexity = 'O(log n)';
      optimalTechnique = 'Binary Search';
    } else if (topics.includes('Sorting') || topics.includes('Heap')) {
      optimalComplexity = 'O(n log n)';
      optimalTechnique = 'Sorting / Heap';
    } else if (topics.includes('Dynamic Programming')) {
      optimalComplexity = 'O(n)';
      optimalTechnique = 'Dynamic Programming';
    }

    const defaultConstraints = [
      `1 <= ${inputSizeVariable} <= ${maxInputSize}`,
      `1 <= val <= 10^9`
    ];

    const patternRecommendations = [
      {
        pattern: 'Hash Map',
        confidence: topics.includes('Hash Table') ? 90 : 40,
        reason: topics.includes('Hash Table')
          ? 'Large input size suggests near-linear complexity and frequent value lookup.'
          : 'Could help if fast value mapping is needed, but evidence is weaker.'
      },
      {
        pattern: 'Two Pointer',
        confidence: topics.includes('Two Pointers') ? 92 : 35,
        reason: topics.includes('Two Pointers')
          ? 'Monotonic property allows pointers to converge in linear time.'
          : 'May help if sorted inputs or array boundary sweeps are involved.'
      },
      {
        pattern: 'Prefix Sum',
        confidence: topics.includes('Prefix Sum') ? 85 : 30,
        reason: topics.includes('Prefix Sum')
          ? 'Subarray sum queries can be answered in O(1) time.'
          : 'Could help if cumulative relationships are involved, but evidence is weaker.'
      },
      {
        pattern: 'Binary Search',
        confidence: topics.includes('Binary Search') ? 95 : 20,
        reason: topics.includes('Binary Search')
          ? 'Search space is sorted, allowing logarithmic pruning.'
          : 'Only applicable if a sorted monotone property is identifiable.'
      }
    ].sort((a, b) => b.confidence - a.confidence);

    extracted = {
      constraints: defaultConstraints,
      maxInputSize,
      inputSizeVariable,
      optimalComplexity,
      optimalTechnique,
      patternRecommendations
    };
  }

  // Programmatically compute the rest of the cards
  const N = extracted.maxInputSize;
  const complexityClasses = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)'];

  const complexityBudget = complexityClasses.map(comp => {
    const ops = getOperations(comp, N);
    const exceeds = ops > MAX_OPERATIONS;
    let reasoning = '';
    if (exceeds) {
      const times = Math.max(1.1, ops / MAX_OPERATIONS);
      const timesStr = times >= 1000 ? times.toExponential(1) : Math.round(times).toLocaleString();
      reasoning = `${comp} exceeds the estimated online judge budget by approximately ${timesStr}x.`;
    } else {
      reasoning = `${comp} is well within the online judge budget of 100,000,000 operations.`;
    }
    return {
      complexity: comp,
      operations: ops,
      reasoning
    };
  });

  const estimatedOperations = getOperations(detectedComplexity, N);
  const safetyMargin = estimatedOperations > MAX_OPERATIONS
    ? 0
    : parseFloat(((1 - estimatedOperations / MAX_OPERATIONS) * 100).toFixed(4));

  let verdict: 'Safe' | 'Borderline' | 'Dangerous' = 'Safe';
  if (estimatedOperations > MAX_OPERATIONS) {
    verdict = 'Dangerous';
  } else if (estimatedOperations > MAX_OPERATIONS * 0.5) {
    verdict = 'Borderline';
  }

  const sizes = [100, 1000, 10000, 100000, 1000000];
  const variantSimulator = sizes.map(size => {
    const ops = getOperations(detectedComplexity, size);
    let status: '✅' | '⚠' | '❌' = '✅';
    if (ops > MAX_OPERATIONS) {
      status = '❌';
    } else if (ops > MAX_OPERATIONS * 0.1) {
      status = '⚠';
    }
    return { inputSize: size, status };
  });

  // Scale limit transition summary
  const lastSafe = [...variantSimulator].reverse().find(v => v.status === '✅');
  const lastBorderline = [...variantSimulator].reverse().find(v => v.status === '⚠');
  const maxPracticalSize = lastSafe ? lastSafe.inputSize : (lastBorderline ? lastBorderline.inputSize : 0);

  let scalabilitySummary = '';
  if (maxPracticalSize === 0) {
    scalabilitySummary = `Your solution is impractical even at very small scales (n = 100). A more efficient approach is immediately required.`;
  } else if (maxPracticalSize >= 1000000) {
    scalabilitySummary = `Your solution remains practical and highly scalable even for very large inputs up to n = 1,000,000.`;
  } else {
    scalabilitySummary = `Your solution remains practical until approximately n = ${maxPracticalSize.toLocaleString()}. Beyond that, a more efficient approach becomes necessary.`;
  }

  // Learning opportunity improvement factor
  let improvement = 'Optimal';
  if (detectedComplexity !== extracted.optimalComplexity) {
    const currentOps = getOperations(detectedComplexity, N);
    const optimalOps = getOperations(extracted.optimalComplexity, N);
    const ratio = currentOps / optimalOps;
    if (ratio >= 2) {
      const ratioStr = ratio >= 1000 ? ratio.toExponential(1) : Math.round(ratio).toLocaleString();
      improvement = `${ratioStr}x fewer operations`;
    } else {
      improvement = 'Comparable performance';
    }
  }

  return {
    problemConstraints: extracted.constraints,
    maxInputSize: N,
    inputSizeVariable: extracted.inputSizeVariable,
    complexityBudget,
    solutionAnalysis: {
      detectedComplexity,
      estimatedOperations,
      safetyMargin,
      verdict
    },
    variantSimulator,
    patternRecommendations: extracted.patternRecommendations,
    learningOpportunity: {
      currentComplexity: detectedComplexity,
      optimalComplexity: extracted.optimalComplexity,
      improvement,
      technique: extracted.optimalTechnique
    }
  };
}
