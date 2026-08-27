import type { CodeWalkthroughStep, NormalizedCodeFacts } from '@/lib/adversarial/types';

export function buildCodeWalkthrough(
  facts: NormalizedCodeFacts,
  patternSlug?: string
): CodeWalkthroughStep[] {
  const steps: CodeWalkthroughStep[] = [];
  let stepIndex = 1;

  const formatStepNum = (num: number) => (num < 10 ? `0${num}` : `${num}`);

  // ─── 01 — Initialize ────────────────────────────────────────────────────────
  const initVars = facts.variables.map(v => v.name);
  const dataStructs = facts.dataStructures.map(d => `${d.type} (${d.name})`);
  const initSnippet = facts.rawSnippets?.init || (initVars.length > 0 ? `let ${initVars.slice(0, 3).join(', ')} ...` : undefined);

  let initDesc = 'The code sets up required runtime variables and tracking structures.';
  if (initVars.length > 0 && dataStructs.length > 0) {
    initDesc = `Initializes variables (${initVars.slice(0, 4).join(', ')}) and data structures [${dataStructs.slice(0, 2).join(', ')}] to track execution state.`;
  } else if (initVars.length > 0) {
    initDesc = `Initializes state variables (${initVars.slice(0, 4).join(', ')}) to maintain pointers and boundary tracking.`;
  } else if (dataStructs.length > 0) {
    initDesc = `Allocates auxiliary data structures [${dataStructs.join(', ')}] to record intermediate elements.`;
  }

  steps.push({
    stepNumber: formatStepNum(stepIndex++),
    stepTitle: 'Initialize',
    explanation: initDesc,
    codeSnippet: initSnippet,
    variablesReferenced: initVars.slice(0, 4),
  });

  // ─── 02 — Iterate / Traverse (Only if loops or recursion exist) ───────────────
  const hasRecursion = facts.functions.some(f => f.isRecursive);
  if (facts.loops.length > 0 || hasRecursion) {
    if (facts.loops.length > 0) {
      const primaryLoop = facts.loops[0];
      const loopVar = primaryLoop.variable || 'i';
      const bounds = primaryLoop.bounds || 'iteration limits';
      const loopSnippet = facts.rawSnippets?.loop || (primaryLoop.type === 'for' ? `for (${loopVar} in ${bounds})` : `while (${bounds})`);

      const iterateDesc = `Executes a ${primaryLoop.type} loop using pointer/index '${loopVar}' spanning ${bounds} (nesting depth: ${primaryLoop.depth}).`;

      steps.push({
        stepNumber: formatStepNum(stepIndex++),
        stepTitle: 'Iterate',
        explanation: iterateDesc,
        codeSnippet: loopSnippet,
        variablesReferenced: [loopVar],
      });
    } else if (hasRecursion) {
      const recFunc = facts.functions[0]?.name || 'helper';
      const iterateDesc = `Traverses state space recursively via '${recFunc}()', branching on subproblems until reaching base cases.`;

      steps.push({
        stepNumber: formatStepNum(stepIndex++),
        stepTitle: 'Iterate',
        explanation: iterateDesc,
        codeSnippet: facts.rawSnippets?.loop || `${recFunc}(...)`,
        variablesReferenced: facts.functions[0]?.params,
      });
    }
  }

  // ─── 03 — Evaluate ──────────────────────────────────────────────────────────
  if (facts.conditions.length > 0) {
    const primaryCond = facts.conditions[0];
    const conditionStr = primaryCond.condition;
    const evalSnippet = facts.rawSnippets?.eval || `if (${conditionStr})`;

    const evalDesc = `Evaluates condition (${conditionStr}) to verify problem constraints or filter matching elements.`;

    steps.push({
      stepNumber: formatStepNum(stepIndex++),
      stepTitle: 'Evaluate',
      explanation: evalDesc,
      codeSnippet: evalSnippet,
    });
  } else {
    // If no explicit if-statement, evaluate the transformation/formula
    steps.push({
      stepNumber: formatStepNum(stepIndex++),
      stepTitle: 'Evaluate',
      explanation: 'Evaluates the algorithmic transformation directly across input values without branching.',
      codeSnippet: facts.rawSnippets?.eval,
    });
  }

  // ─── 04 — Update ────────────────────────────────────────────────────────────
  if (facts.stateMutations.length > 0) {
    const primaryMut = facts.stateMutations[0];
    const mutSnippet = facts.rawSnippets?.update || `${primaryMut.target} ${primaryMut.operation}`;

    const mutTargets = Array.from(new Set(facts.stateMutations.map(m => m.target))).slice(0, 3);
    const updateDesc = `Updates active state on [${mutTargets.join(', ')}] by applying '${primaryMut.operation}' mutations.`;

    steps.push({
      stepNumber: formatStepNum(stepIndex++),
      stepTitle: 'Update',
      explanation: updateDesc,
      codeSnippet: mutSnippet,
      variablesReferenced: mutTargets,
    });
  } else {
    steps.push({
      stepNumber: formatStepNum(stepIndex++),
      stepTitle: 'Update',
      explanation: 'Advances state incrementally through iteration variables or accumulator registers.',
      codeSnippet: facts.rawSnippets?.update,
    });
  }

  // ─── 05 — Return ────────────────────────────────────────────────────────────
  const returnSnippet = facts.rawSnippets?.ret || (facts.earlyReturns.length > 0 ? facts.earlyReturns[0].condition : undefined);
  let returnDesc = 'Produces the final computed result at completion.';
  if (facts.earlyReturns.length > 0) {
    returnDesc = `Returns early when base guards or matching elements are confirmed, otherwise yields final result.`;
  } else {
    returnDesc = 'Terminates and returns the aggregated output according to the problem signature.';
  }

  steps.push({
    stepNumber: formatStepNum(stepIndex++),
    stepTitle: 'Return',
    explanation: returnDesc,
    codeSnippet: returnSnippet,
  });

  return steps;
}
