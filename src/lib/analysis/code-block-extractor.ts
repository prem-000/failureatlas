import type { SourceCodeBlock } from '@/lib/adversarial/types';

/**
 * Extracts logical execution blocks from submitted code across Python, TypeScript/JavaScript, C++, Java, etc.
 * Never uses fixed generic templates (like "Initialize -> Iterate -> Evaluate -> Update").
 * The block count and titles are derived from the actual syntactic and semantic structure of the code.
 */
export function extractCodeBlocks(
  sourceCode: string,
  language: string = 'python',
  problemTitle?: string
): SourceCodeBlock[] {
  if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return [
      {
        step: 1,
        title: 'Entry Point',
        code: '// No source code provided',
        explanation: 'The code is empty or missing.',
        contribution: 'Awaiting source implementation.',
      },
    ];
  }

  const rawLines = sourceCode.split('\n');
  const lang = language.toLowerCase();

  if (lang.includes('python') || lang.includes('py')) {
    return extractPythonBlocks(sourceCode, rawLines, problemTitle);
  } else if (lang.includes('typescript') || lang.includes('javascript') || lang.includes('js') || lang.includes('ts')) {
    return extractTsJsBlocks(sourceCode, rawLines, problemTitle);
  } else {
    return extractPolyglotBlocks(sourceCode, rawLines, problemTitle);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PYTHON BLOCK EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function extractPythonBlocks(
  sourceCode: string,
  lines: string[],
  problemTitle?: string
): SourceCodeBlock[] {
  const blocks: SourceCodeBlock[] = [];
  let step = 1;

  // Filter out leading docstrings or imports if isolated
  let i = 0;
  while (i < lines.length && (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('from ') || lines[i].trim() === '')) {
    i++;
  }

  // Check for function header
  let funcIndent = 0;
  if (i < lines.length && lines[i].trim().startsWith('def ')) {
    const fnLine = lines[i];
    funcIndent = fnLine.search(/\S/) + 4; // base body indent
    i++; // Move into body
  }

  // Iterate through lines at function body level
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    const currentIndent = line.search(/\S/);

    // 1. Guard / Early Return Block (e.g. if x < 0: return False or multi-line if)
    if (trimmed.startsWith('if ') || trimmed.startsWith('elif ')) {
      const startLine = i + 1;
      const blockLines = [line];
      const blockIndent = currentIndent;
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        if (!nextTrimmed || nextTrimmed.startsWith('#')) {
          blockLines.push(nextLine);
          i++;
          continue;
        }
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent > blockIndent) {
          blockLines.push(nextLine);
          i++;
        } else {
          break;
        }
      }

      const endLine = startLine + blockLines.length - 1;
      const codeSnippet = cleanBlockCode(blockLines);
      const isEarlyReturn = codeSnippet.includes('return ') || codeSnippet.includes('raise ');
      const condMatch = trimmed.match(/^if\s+(.*?):/);
      const condStr = condMatch ? condMatch[1] : trimmed;

      let title = 'Evaluate condition';
      let explanation = `Checks condition \`${condStr}\` to guide control flow.`;
      let contribution = 'Branches execution based on conditional constraints.';

      if (isEarlyReturn) {
        if (condStr.includes('< 0') || condStr.includes('<= 0')) {
          title = 'Reject negative or non-positive values';
          explanation = `Immediately filters out invalid or negative inputs using \`if ${condStr}\` before executing the core algorithm.`;
          contribution = 'Guards the function by returning early for boundary cases.';
        } else if (condStr.includes('not ') || condStr.includes('== 0') || condStr.includes('len(') || condStr.includes('is None')) {
          title = 'Base case / Boundary guard';
          explanation = `Handles empty, null, or edge boundary inputs immediately to prevent unnecessary iteration or runtime exceptions.`;
          contribution = 'Prevents invalid state execution by returning early for edge inputs.';
        } else {
          title = 'Early return on matching condition';
          explanation = `Directly terminates and returns when \`${condStr}\` is satisfied.`;
          contribution = 'Provides immediate termination for early matching scenarios.';
        }
      }

      // Extract variables referenced
      const vars = extractVariablesFromSnippet(codeSnippet);

      blocks.push({
        step: step++,
        title,
        code: codeSnippet,
        startLine,
        endLine,
        explanation,
        variables: vars,
        controlFlow: {
          type: isEarlyReturn ? 'return' : 'branch',
          description: `Evaluates \`${condStr}\`${isEarlyReturn ? ' and returns early if matched.' : '.'}`,
        },
        contribution,
      });
      continue;
    }

    // 2. Loop Block (while ... / for ...)
    if (trimmed.startsWith('while ') || trimmed.startsWith('for ')) {
      const startLine = i + 1;
      const blockLines = [line];
      const blockIndent = currentIndent;
      const isWhile = trimmed.startsWith('while');
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        if (!nextTrimmed || nextTrimmed.startsWith('#')) {
          blockLines.push(nextLine);
          i++;
          continue;
        }
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent > blockIndent) {
          blockLines.push(nextLine);
          i++;
        } else {
          break;
        }
      }

      const endLine = startLine + blockLines.length - 1;
      const codeSnippet = cleanBlockCode(blockLines);

      let title = 'Loop traversal';
      let explanation = 'Iterates over elements while updating active state.';
      let contribution = 'Executes core repeated algorithmic transformations.';

      if (isWhile) {
        const whileCond = trimmed.replace(/^while\s+/, '').replace(/:$/, '').trim();
        if (codeSnippet.includes('% 10') && (codeSnippet.includes('// 10') || codeSnippet.includes('//= 10'))) {
          title = 'Reconstruct number / extract digits';
          explanation = `Repeatedly extracts the least significant digit via modulo arithmetic and reconstructs the target value while \`${whileCond}\`.`;
          contribution = 'Extracts and reverses digits iteratively until the input number is exhausted.';
        } else if (whileCond.includes('<') || whileCond.includes('left') || whileCond.includes('low') || whileCond.includes('ptr')) {
          title = 'Two-pointer / Boundary convergence loop';
          explanation = `Advances pointers inward or forward while maintaining the convergence invariant \`${whileCond}\`.`;
          contribution = 'Narrows down search space or scans bounds iteratively.';
        } else {
          title = `Iterate while (${whileCond})`;
          explanation = `Executes the loop body as long as the invariant \`${whileCond}\` holds true.`;
          contribution = 'Drives the state transitions across iterations.';
        }
      } else {
        const forMatch = trimmed.match(/^for\s+(.*?)\s+in\s+(.*?):/);
        const loopVar = forMatch ? forMatch[1] : 'element';
        const iterable = forMatch ? forMatch[2] : 'collection';

        if (iterable.includes('range(')) {
          title = `Iterate over index range (${loopVar} in ${iterable})`;
          explanation = `Scans indices sequentially using \`${loopVar}\` across \`${iterable}\`, evaluating conditions and mutating state.`;
          contribution = 'Visits array positions in order to compute intermediate results.';
        } else {
          title = `Traverse elements in ${iterable}`;
          explanation = `Processes each item \`${loopVar}\` directly from \`${iterable}\`.`;
          contribution = 'Applies item-level transformations or accumulator updates.';
        }
      }

      const vars = extractVariablesFromSnippet(codeSnippet);

      blocks.push({
        step: step++,
        title,
        code: codeSnippet,
        startLine,
        endLine,
        explanation,
        variables: vars,
        controlFlow: {
          type: 'loop',
          description: isWhile ? 'While loop maintaining state' : 'For loop traversing elements',
        },
        contribution,
      });
      continue;
    }

    // 3. Standalone Return Statement (e.g. return original == reversed_num or return ans)
    if (trimmed.startsWith('return ') || trimmed === 'return') {
      const startLine = i + 1;
      const codeSnippet = trimmed;
      i++;

      const retExpr = trimmed.replace(/^return\s*/, '').trim();
      let title = 'Return final result';
      let explanation = `Returns \`${retExpr || 'result'}\` as the final output of the function.`;
      let contribution = 'Concludes execution and provides the evaluated answer.';

      if (retExpr.includes('==') || retExpr.includes('!=') || retExpr.includes('is ')) {
        title = 'Return comparison result';
        explanation = `Evaluates boolean equivalence \`${retExpr}\` between the expected and computed values and returns the result.`;
        contribution = 'Validates the invariant property and produces boolean output.';
      } else if (retExpr) {
        title = `Return computed ${retExpr}`;
        explanation = `Yields \`${retExpr}\` computed by the preceding algorithmic steps.`;
        contribution = 'Delivers the accumulated solution value.';
      }

      const vars = extractVariablesFromSnippet(codeSnippet);

      blocks.push({
        step: step++,
        title,
        code: codeSnippet,
        startLine,
        endLine: startLine,
        explanation,
        variables: vars,
        controlFlow: {
          type: 'return',
          description: `Returns ${retExpr}`,
        },
        contribution,
      });
      continue;
    }

    // 4. Consecutive Initialization / Assignment Statements
    const startLine = i + 1;
    const blockLines = [line];
    i++;

    while (i < lines.length) {
      const nextLine = lines[i];
      const nextTrimmed = nextLine.trim();
      if (!nextTrimmed || nextTrimmed.startsWith('#')) {
        i++;
        continue;
      }
      // If next line starts a loop, if-statement, or return, break the init block
      if (
        nextTrimmed.startsWith('if ') ||
        nextTrimmed.startsWith('elif ') ||
        nextTrimmed.startsWith('while ') ||
        nextTrimmed.startsWith('for ') ||
        nextTrimmed.startsWith('return ') ||
        nextTrimmed.startsWith('def ')
      ) {
        break;
      }
      blockLines.push(nextLine);
      i++;
    }

    const endLine = startLine + blockLines.length - 1;
    const codeSnippet = cleanBlockCode(blockLines);
    const assignedVars = extractAssignedVariables(codeSnippet);

    let title = 'Initialize state and variables';
    let explanation = `Initializes working variables (${assignedVars.join(', ') || 'state registers'}) to track execution.`;
    let contribution = 'Establishes initial registers and invariants before iteration begins.';

    if (assignedVars.includes('original') || assignedVars.includes('reversed_num')) {
      title = 'Preserve and initialize state';
      explanation = `Saves original input and initializes accumulator variables to hold state during transformation.`;
      contribution = 'Retains reference values to enable final invariant verification.';
    } else if (assignedVars.some(v => v.includes('left') || v.includes('right') || v.includes('head') || v.includes('ptr'))) {
      title = 'Initialize pointer boundaries';
      explanation = `Sets up pointer indices (${assignedVars.join(', ')}) at their designated starting locations.`;
      contribution = 'Prepares window or search boundaries.';
    }

    const vars = extractVariablesFromSnippet(codeSnippet);

    blocks.push({
      step: step++,
      title,
      code: codeSnippet,
      startLine,
      endLine,
      explanation,
      variables: vars,
      controlFlow: {
        type: 'mutation',
        description: `Initializes ${assignedVars.join(', ')}`,
      },
      contribution,
    });
  }

  // Fallback if blocks array is empty
  if (blocks.length === 0) {
    blocks.push({
      step: 1,
      title: 'Execute implementation',
      code: sourceCode.trim(),
      explanation: 'Executes the provided algorithmic solution.',
      contribution: 'Computes problem result.',
    });
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPESCRIPT / JAVASCRIPT BLOCK EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function extractTsJsBlocks(
  sourceCode: string,
  lines: string[],
  problemTitle?: string
): SourceCodeBlock[] {
  const blocks: SourceCodeBlock[] = [];
  let step = 1;
  let i = 0;

  // Skip outer function headers if present
  while (i < lines.length && (lines[i].trim().startsWith('import ') || lines[i].trim() === '')) {
    i++;
  }

  if (i < lines.length && (lines[i].includes('function ') || lines[i].includes('=>') || lines[i].includes('var ') && lines[i].includes('='))) {
    if (lines[i].includes('{') && !lines[i].includes('}')) {
      i++; // Skip function signature line to focus on body
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed === '}') {
      i++;
      continue;
    }

    // 1. Guard / Early Return (if (x < 0) return false;)
    if (trimmed.startsWith('if ') || trimmed.startsWith('if(')) {
      const startLine = i + 1;
      const blockLines = [line];
      let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      i++;

      while (i < lines.length && braceCount > 0) {
        const nextLine = lines[i];
        blockLines.push(nextLine);
        braceCount += (nextLine.match(/\{/g) || []).length - (nextLine.match(/\}/g) || []).length;
        i++;
      }

      const endLine = startLine + blockLines.length - 1;
      const codeSnippet = cleanBlockCode(blockLines);
      const isEarlyReturn = codeSnippet.includes('return ') || codeSnippet.includes('throw ');
      const condMatch = trimmed.match(/^if\s*\((.*?)\)/);
      const condStr = condMatch ? condMatch[1] : trimmed;

      let title = 'Evaluate condition';
      let explanation = `Tests condition \`(${condStr})\` to route control flow.`;
      let contribution = 'Applies conditional logic to filter or redirect execution.';

      if (isEarlyReturn) {
        if (condStr.includes('< 0') || condStr.includes('<= 0')) {
          title = 'Reject negative or non-positive values';
          explanation = `Immediately rejects invalid values via \`if (${condStr})\` before running subsequent computations.`;
          contribution = 'Protects against negative edge conditions.';
        } else if (condStr.includes('length === 0') || condStr.includes('!head') || condStr.includes('null')) {
          title = 'Base case / Edge condition guard';
          explanation = `Handles empty input or boundary state immediately to prevent index errors.`;
          contribution = 'Guards subsequent operations with early return.';
        } else {
          title = 'Early return on match';
          explanation = `Returns early upon satisfying \`(${condStr})\`.`;
          contribution = 'Terminates early on target satisfaction.';
        }
      }

      const vars = extractVariablesFromSnippet(codeSnippet);

      blocks.push({
        step: step++,
        title,
        code: codeSnippet,
        startLine,
        endLine,
        explanation,
        variables: vars,
        controlFlow: {
          type: isEarlyReturn ? 'return' : 'branch',
          description: `Evaluates (${condStr})`,
        },
        contribution,
      });
      continue;
    }

    // 2. Loop Block (for (...) / while (...))
    if (trimmed.startsWith('for ') || trimmed.startsWith('for(') || trimmed.startsWith('while ') || trimmed.startsWith('while(')) {
      const startLine = i + 1;
      const blockLines = [line];
      let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      const isWhile = trimmed.startsWith('while');
      i++;

      while (i < lines.length && (braceCount > 0 || (blockLines.length === 1 && !line.includes('{')))) {
        const nextLine = lines[i];
        blockLines.push(nextLine);
        braceCount += (nextLine.match(/\{/g) || []).length - (nextLine.match(/\}/g) || []).length;
        i++;
        if (braceCount === 0 && blockLines.length > 1) break;
      }

      const endLine = startLine + blockLines.length - 1;
      const codeSnippet = cleanBlockCode(blockLines);

      let title = isWhile ? 'While loop iteration' : 'For loop scan';
      let explanation = 'Iterates over elements while updating active state.';
      let contribution = 'Executes core repeated algorithmic transformations.';

      if (codeSnippet.includes('% 10') && (codeSnippet.includes('Math.floor') || codeSnippet.includes('/ 10'))) {
        title = 'Reconstruct number / digit reversal loop';
        explanation = 'Extracts digits using modulo 10 and accumulates into the reversed number.';
        contribution = 'Reconstructs the reverse integer iteratively.';
      } else if (trimmed.includes('let i = 0') || trimmed.includes('let right = 0')) {
        title = 'Sequential loop traversal';
        explanation = 'Traverses index range, checking constraints and accumulating intermediate state.';
        contribution = 'Applies element-wise logic across the input collection.';
      }

      const vars = extractVariablesFromSnippet(codeSnippet);

      blocks.push({
        step: step++,
        title,
        code: codeSnippet,
        startLine,
        endLine,
        explanation,
        variables: vars,
        controlFlow: {
          type: 'loop',
          description: isWhile ? 'While loop state machine' : 'For loop iteration',
        },
        contribution,
      });
      continue;
    }

    // 3. Return statement
    if (trimmed.startsWith('return ') || trimmed === 'return;') {
      const startLine = i + 1;
      const codeSnippet = trimmed;
      i++;

      const retExpr = trimmed.replace(/^return\s*/, '').replace(/;$/, '').trim();
      let title = 'Return final result';
      let explanation = `Returns \`${retExpr || 'result'}\` as the output.`;
      let contribution = 'Concludes execution and provides the evaluated answer.';

      if (retExpr.includes('===') || retExpr.includes('==') || retExpr.includes('!==')) {
        title = 'Return comparison result';
        explanation = `Evaluates comparison \`${retExpr}\` and returns boolean result.`;
        contribution = 'Returns verification outcome.';
      }

      const vars = extractVariablesFromSnippet(codeSnippet);

      blocks.push({
        step: step++,
        title,
        code: codeSnippet,
        startLine,
        endLine: startLine,
        explanation,
        variables: vars,
        controlFlow: {
          type: 'return',
          description: `Returns ${retExpr}`,
        },
        contribution,
      });
      continue;
    }

    // 4. Variable declarations / assignments
    const startLine = i + 1;
    const blockLines = [line];
    i++;

    while (i < lines.length) {
      const nextLine = lines[i];
      const nextTrimmed = nextLine.trim();
      if (!nextTrimmed || nextTrimmed.startsWith('//') || nextTrimmed === '}') {
        i++;
        continue;
      }
      if (
        nextTrimmed.startsWith('if ') ||
        nextTrimmed.startsWith('if(') ||
        nextTrimmed.startsWith('for ') ||
        nextTrimmed.startsWith('for(') ||
        nextTrimmed.startsWith('while ') ||
        nextTrimmed.startsWith('while(') ||
        nextTrimmed.startsWith('return ')
      ) {
        break;
      }
      blockLines.push(nextLine);
      i++;
    }

    const endLine = startLine + blockLines.length - 1;
    const codeSnippet = cleanBlockCode(blockLines);
    const assignedVars = extractAssignedVariables(codeSnippet);

    const title = assignedVars.length > 0
      ? `Initialize variables (${assignedVars.slice(0, 3).join(', ')})`
      : 'Initialize local state';
    const explanation = `Sets up tracking variables (${assignedVars.join(', ') || 'registers'}) before processing begins.`;
    const contribution = 'Allocates state and registers for subsequent operations.';

    const vars = extractVariablesFromSnippet(codeSnippet);

    blocks.push({
      step: step++,
      title,
      code: codeSnippet,
      startLine,
      endLine,
      explanation,
      variables: vars,
      controlFlow: {
        type: 'mutation',
        description: `Initializes ${assignedVars.join(', ')}`,
      },
      contribution,
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      step: 1,
      title: 'Execute implementation',
      code: sourceCode.trim(),
      explanation: 'Executes the provided algorithmic solution.',
      contribution: 'Computes problem result.',
    });
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// POLYGLOT FALLBACK BLOCK EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function extractPolyglotBlocks(
  sourceCode: string,
  lines: string[],
  problemTitle?: string
): SourceCodeBlock[] {
  const blocks: SourceCodeBlock[] = [];
  let step = 1;
  let currentBlockLines: string[] = [];
  let blockStartLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }

    if (currentBlockLines.length === 0) {
      blockStartLine = i + 1;
    }

    currentBlockLines.push(line);

    // Break on logical milestones
    const isControlBoundary =
      trimmed.startsWith('if') ||
      trimmed.startsWith('for') ||
      trimmed.startsWith('while') ||
      trimmed.startsWith('return');

    if (isControlBoundary && currentBlockLines.length >= 2) {
      const codeSnippet = cleanBlockCode(currentBlockLines);
      const assigned = extractAssignedVariables(codeSnippet);
      blocks.push({
        step: step++,
        title: assigned.length > 0 ? `Process ${assigned.join(', ')}` : `Step ${step}: Execution Block`,
        code: codeSnippet,
        startLine: blockStartLine,
        endLine: i + 1,
        explanation: 'Executes logical block operations and advances internal state.',
        variables: extractVariablesFromSnippet(codeSnippet),
        contribution: 'Updates state and evaluates branch conditions.',
      });
      currentBlockLines = [];
    }
  }

  if (currentBlockLines.length > 0) {
    const codeSnippet = cleanBlockCode(currentBlockLines);
    blocks.push({
      step: step++,
      title: codeSnippet.includes('return') ? 'Return computed result' : `Final Step: Conclusion`,
      code: codeSnippet,
      startLine: blockStartLine,
      endLine: lines.length,
      explanation: 'Completes final state calculations and outputs return value.',
      variables: extractVariablesFromSnippet(codeSnippet),
      contribution: 'Concludes algorithm execution.',
    });
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function cleanBlockCode(lines: string[]): string {
  // Strip common leading whitespace while preserving relative indentation
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return lines.join('\n').trim();

  const minIndent = Math.min(...nonEmpty.map(l => l.search(/\S/)));
  return lines
    .map(l => (l.trim().length > 0 ? l.slice(Math.max(0, minIndent)) : ''))
    .join('\n')
    .trim();
}

function extractVariablesFromSnippet(code: string): Array<{ name: string; role: string; change?: string }> {
  const vars: Array<{ name: string; role: string; change?: string }> = [];
  const names = new Set<string>();

  const matches = code.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g);
  const keywords = new Set([
    'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'in', 'return', 'and', 'or', 'not', 'is', 'None',
    'True', 'False', 'function', 'const', 'let', 'var', 'const', 'import', 'from', 'as', 'self', 'int', 'str',
    'bool', 'float', 'list', 'dict', 'set', 'range', 'len', 'Math', 'console', 'log', 'new'
  ]);

  for (const m of matches) {
    const name = m[1];
    if (!keywords.has(name) && !names.has(name)) {
      names.add(name);
      let role = 'State variable';
      let change = 'Referenced in execution';

      if (/^(left|right|low|high|mid|l|r|i|j|k|ptr|p1|p2)$/i.test(name)) {
        role = 'Pointer / Index';
        change = 'Tracks boundary or iteration cursor';
      } else if (/^(sum|count|ans|res|total|max_val|min_val|result|acc|reversed_num)$/i.test(name)) {
        role = 'Accumulator';
        change = 'Stores running computed aggregate';
      } else if (/^(original|target|s|x|arr|nums|haystack|needle)$/i.test(name)) {
        role = 'Input reference';
        change = 'Preserves problem operand';
      }

      vars.push({ name, role, change });
      if (vars.length >= 4) break;
    }
  }

  return vars;
}

function extractAssignedVariables(code: string): string[] {
  const assigned: string[] = [];
  const re = /(?:(?:let|const|var)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|:=|\+=|-=|\*=|\/\/=)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    const v = match[1];
    if (!['if', 'for', 'while', 'return'].includes(v) && !assigned.includes(v)) {
      assigned.push(v);
    }
  }
  return assigned;
}
