import type { RootCauseType } from '@/types';

export interface LearningResource {
  title: string;
  type: 'article' | 'paper' | 'video' | 'docs';
  url: string;
  source: string;
}

export const ROOT_CAUSE_RESOURCES: Record<RootCauseType, LearningResource[]> = {
  'boundary-condition-error': [
    {
      title: 'Off-by-One Error & Boundary Conditions in Programming',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/off-by-one-error/',
      source: 'GeeksforGeeks',
    },
    {
      title: 'Binary Search Invariants and Boundary Guarantees',
      type: 'docs',
      url: 'https://cp-algorithms.com/num_methods/binary_search.html',
      source: 'CP-Algorithms',
    },
    {
      title: 'Binary Search Edge Cases & Boundary Handling',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=s4DPM8ct1pI',
      source: 'NeetCode',
    },
  ],
  'algorithm-selection-mistake': [
    {
      title: 'Algorithm Design Techniques & Strategy Selection',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/algorithm-design-techniques/',
      source: 'GeeksforGeeks',
    },
    {
      title: 'Introduction to Algorithms (SMA 5503 / 6.006)',
      type: 'paper',
      url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/',
      source: 'MIT OpenCourseWare',
    },
    {
      title: 'Algorithm Design Strategies: Greedy vs Dynamic Programming',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=2RR2tTQWXkY',
      source: 'Abdul Bari',
    },
  ],
  'pattern-recognition-gap': [
    {
      title: 'Top Coding Patterns for Technical Interviews',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/top-20-coding-patterns-for-technical-interviews/',
      source: 'GeeksforGeeks',
    },
    {
      title: 'Prefix Function & Knuth-Morris-Pratt Pattern Matching',
      type: 'docs',
      url: 'https://cp-algorithms.com/string/prefix-function.html',
      source: 'CP-Algorithms',
    },
    {
      title: '14 Patterns to Ace Any Coding Interview Question',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=DjYZk8nrXVY',
      source: 'NeetCode',
    },
  ],
  'time-complexity-oversight': [
    {
      title: 'Analysis of Algorithms | Asymptotic Analysis',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/analysis-of-algorithms-set-1-asymptotic-analysis/',
      source: 'GeeksforGeeks',
    },
    {
      title: 'Master Theorem for Divide-and-Conquer Recurrences',
      type: 'docs',
      url: 'https://cp-algorithms.com/algebra/master-theorem.html',
      source: 'CP-Algorithms',
    },
    {
      title: 'Asymptotic Notations: Big Oh, Omega, Theta',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=A03oP9bMr21',
      source: 'Abdul Bari',
    },
  ],
  'space-complexity-oversight': [
    {
      title: 'Space Complexity Analysis of Algorithms',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/space-complexity-of-algorithms/',
      source: 'GeeksforGeeks',
    },
    {
      title: 'Memory Optimization in Dynamic Programming',
      type: 'docs',
      url: 'https://cp-algorithms.com/dynamic_programming/profile-dynamics.html',
      source: 'CP-Algorithms',
    },
    {
      title: 'Dynamic Programming Space Optimization Techniques',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=Hdr64lKQ3e4',
      source: 'NeetCode',
    },
  ],
  'data-structure-mismatch': [
    {
      title: 'How to Choose the Right Data Structure',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/how-to-choose-the-right-data-structure/',
      source: 'GeeksforGeeks',
    },
    {
      title: 'Disjoint Set Union (DSU / Union-Find)',
      type: 'docs',
      url: 'https://cp-algorithms.com/data_structures/disjoint_set_union.html',
      source: 'CP-Algorithms',
    },
    {
      title: 'Monotonic Stack Pattern & Use Cases',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=Dq_ObNwRN_A',
      source: 'NeetCode',
    },
  ],
  'implementation-detail-error': [
    {
      title: 'Common Implementation Pitfalls in Competitive Programming',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/common-mistakes-in-competitive-programming/',
      source: 'GeeksforGeeks',
    },
    {
      title: 'Modular Arithmetic and Integer Overflow Avoidance',
      type: 'docs',
      url: 'https://cp-algorithms.com/algebra/binary-exp.html',
      source: 'CP-Algorithms',
    },
    {
      title: 'Undefined Behavior and Numeric Limits in Modern Languages',
      type: 'docs',
      url: 'https://en.cppreference.com/w/cpp/language/ub',
      source: 'cppreference.com',
    },
  ],
  'input-output-handling-error': [
    {
      title: 'Fast I/O Techniques in Competitive Programming',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/fast-io-for-competitive-programming/',
      source: 'GeeksforGeeks',
    },
    {
      title: 'Standard I/O Streams and Buffer Management',
      type: 'docs',
      url: 'https://docs.python.org/3/library/sys.html#sys.stdin',
      source: 'Python Docs',
    },
    {
      title: 'Fast Input/Output and String Parsing Essentials',
      type: 'docs',
      url: 'https://cp-algorithms.com/',
      source: 'CP-Algorithms',
    },
  ],
};

export const SKILL_RESOURCES: Record<string, LearningResource[]> = {
  'binary-search': [
    {
      title: 'Binary Search Invariants & Template Guide',
      type: 'docs',
      url: 'https://cp-algorithms.com/num_methods/binary_search.html',
      source: 'CP-Algorithms',
    },
    {
      title: 'Mastering the 3 Binary Search Templates',
      type: 'article',
      url: 'https://leetcode.com/discuss/study-guide/786126/Python-Powerful-Ultimate-Binary-Search-Template',
      source: 'LeetCode Discuss',
    },
    {
      title: 'Binary Search Patterns and Edge Cases',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=s4DPM8ct1pI',
      source: 'NeetCode',
    },
  ],
  'two-pointers': [
    {
      title: 'Two Pointers Technique for Array Problems',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/two-pointers-technique/',
      source: 'GeeksforGeeks',
    },
    {
      title: 'Opposite-Direction and Same-Direction Pointers Invariants',
      type: 'docs',
      url: 'https://cp-algorithms.com/',
      source: 'CP-Algorithms',
    },
  ],
  'sliding-window': [
    {
      title: 'Window Invariant Mechanics & Dynamic Sizing',
      type: 'article',
      url: 'https://leetcode.com/discuss/study-guide/3630424/Sliding-Window-CheatSheet-with-Templates',
      source: 'LeetCode Discuss',
    },
    {
      title: 'Sliding Window Algorithm Explained with Examples',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=jM2DHucURdA',
      source: 'NeetCode',
    },
  ],
  'dynamic-programming': [
    {
      title: 'Dynamic Programming: State Formulation and Transitions',
      type: 'paper',
      url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/',
      source: 'MIT OCW',
    },
    {
      title: 'Demystifying DP: Top-Down vs Bottom-Up Space Optimization',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/dynamic-programming/',
      source: 'GeeksforGeeks',
    },
  ],
  'edge-case-reasoning': [
    {
      title: 'Edge Case Testing & Boundary Invariants in Algorithms',
      type: 'docs',
      url: 'https://cp-algorithms.com/num_methods/binary_search.html',
      source: 'CP-Algorithms',
    },
    {
      title: 'Testing Extremes: Empty, Single Element, and Wrap-Around Cases',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/off-by-one-error/',
      source: 'GeeksforGeeks',
    },
  ],
  'prefix-sum': [
    {
      title: 'Prefix Sum Array: 1D and 2D Invariant Range Queries',
      type: 'article',
      url: 'https://www.geeksforgeeks.org/prefix-sum-array-implementation-applications_competitive-programming/',
      source: 'GeeksforGeeks',
    },
  ],
  'monotonic-stack': [
    {
      title: 'Monotonic Stack Pattern & Next Greater Element',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=Dq_ObNwRN_A',
      source: 'NeetCode',
    },
  ],
  'tree-traversal': [
    {
      title: 'Tree Traversals (Inorder, Preorder, Postorder, BFS, DFS)',
      type: 'docs',
      url: 'https://cp-algorithms.com/graph/depth-first-search.html',
      source: 'CP-Algorithms',
    },
  ],
};

export function getCuratedResourcesForSkillOrRootCause(
  key: string,
  resourceIds?: string[]
): LearningResource[] {
  const normKey = (key || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fromSkill = SKILL_RESOURCES[normKey];
  if (fromSkill && fromSkill.length > 0) return fromSkill;

  const fromRoot = ROOT_CAUSE_RESOURCES[normKey as RootCauseType];
  if (fromRoot && fromRoot.length > 0) return fromRoot;

  // Fallback match by substring
  for (const [sKey, resources] of Object.entries(SKILL_RESOURCES)) {
    if (normKey.includes(sKey) || sKey.includes(normKey)) {
      return resources;
    }
  }

  for (const [rKey, resources] of Object.entries(ROOT_CAUSE_RESOURCES)) {
    if (normKey.includes(rKey) || rKey.includes(normKey)) {
      return resources;
    }
  }

  return SKILL_RESOURCES['edge-case-reasoning'];
}
