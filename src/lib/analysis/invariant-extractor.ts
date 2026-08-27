import type {
  ExtractedInvariant,
  EvidenceItem,
  NormalizedCodeFacts,
} from '@/lib/adversarial/types';

export function extractAlgorithmicInvariants(
  code: string,
  facts: NormalizedCodeFacts,
  patternSlug: string
): ExtractedInvariant[] {
  const invariants: ExtractedInvariant[] = [];

  const addInv = (
    id: string,
    condition: string,
    type: ExtractedInvariant['type'],
    importance: number,
    desc: string,
    snippet?: string
  ) => {
    invariants.push({
      id,
      condition,
      type,
      importance,
      evidence: [
        {
          source: 'source_code',
          description: desc,
          codeLocation: snippet ? { snippet } : undefined,
          confidence: 0.92,
        },
      ],
    });
  };

  if (patternSlug === 'sliding_window') {
    addInv(
      'inv_sw_1',
      'Window size remains exactly k throughout the sliding iteration',
      'window_size',
      0.95,
      'Control flow must maintain boundary offsets (e.g. right - left + 1 == k)',
      facts.rawSnippets.loop
    );
    addInv(
      'inv_sw_2',
      'Running state accumulator represents the exact sum/frequency of current active window',
      'running_sum',
      0.94,
      'State update subtracts outgoing element nums[i - k] and adds incoming element nums[i]',
      facts.rawSnippets.update
    );
    addInv(
      'inv_sw_3',
      'Every valid window of size k in [0, n-1] is evaluated exactly once without skipping the terminal window',
      'termination',
      0.90,
      'Loop upper bound condition and evaluation placement inside iteration body',
      facts.rawSnippets.eval
    );
  } else if (patternSlug === 'binary_search') {
    addInv(
      'inv_bs_1',
      'The active search interval [low, high] strictly encloses all viable candidates',
      'search_space',
      0.96,
      'Monotonic invariant guarantees candidate cannot reside outside [low, high]',
      facts.rawSnippets.loop
    );
    addInv(
      'inv_bs_2',
      'Midpoint step strictly reduces the remaining candidate range avoiding infinite looping on adjacent indices',
      'termination',
      0.95,
      'Bound adjustments low = mid + 1 and high = mid - 1 enforce termination',
      facts.rawSnippets.update
    );
  } else if (patternSlug === 'two_pointer') {
    addInv(
      'inv_tp_1',
      'Pointer convergence preserves non-overlapping ordering (left <= right)',
      'monotonic',
      0.93,
      'Convergence conditions step inwards based on target comparison',
      facts.rawSnippets.loop
    );
    addInv(
      'inv_tp_2',
      'Pointer updates eliminate only definitively suboptimal candidates',
      'search_space',
      0.91,
      'Sorted monotonic property ensures no valid answer pairs are discarded',
      facts.rawSnippets.update
    );
  } else if (patternSlug === 'graph_dfs' || patternSlug === 'graph_bfs' || patternSlug === 'backtracking') {
    addInv(
      'inv_dfs_1',
      'Visited tracking prevents circular state recurrence and infinite cycles',
      'visited_state',
      0.95,
      'State markers ensure each node/configuration is expanded safely',
      facts.rawSnippets.eval
    );
    if (patternSlug === 'backtracking') {
      addInv(
        'inv_bt_1',
        'State modifications are cleanly reverted upon returning from recursive subtrees',
        'state_balance',
        0.94,
        'Explicit pop/reversion maintains invariant consistency for sibling branches',
        facts.rawSnippets.update
      );
    }
  } else if (patternSlug === 'dynamic_programming') {
    addInv(
      'inv_dp_1',
      'Subproblem state dp[i] is computed only after all required dependencies are resolved',
      'state_balance',
      0.93,
      'Topological or bottom-up loop ordering guarantees dependency satisfaction',
      facts.rawSnippets.loop
    );
  } else if (patternSlug === 'prefix_sum') {
    addInv(
      'inv_pref_1',
      'Prefix element prefix[i] equals exact cumulative sum of slice [0..i]',
      'running_sum',
      0.94,
      'Recurrence prefix[i] = prefix[i-1] + nums[i] preserves non-offset sum accuracy',
      facts.rawSnippets.update
    );
  } else {
    // General invariant
    addInv(
      'inv_gen_1',
      'State invariants hold true across loop pre-conditions and post-conditions',
      'state_balance',
      0.85,
      'Loop boundary and initialization consistency check',
      facts.rawSnippets.loop
    );
  }

  return invariants;
}
