import type { NormalizedCodeFacts, SourceAnalyzer } from '@/lib/adversarial/types';

export type { NormalizedCodeFacts, SourceAnalyzer };

export function createEmptyFacts(language: string): NormalizedCodeFacts {
  return {
    language,
    functions: [],
    loops: [],
    conditions: [],
    variables: [],
    dataStructures: [],
    stateMutations: [],
    boundaryChecks: [],
    earlyReturns: [],
    rawSnippets: {},
  };
}
