import type { NormalizedCodeFacts, SourceAnalyzer } from '@/lib/adversarial/types';
import { createEmptyFacts } from './analyzer-interface';

export class PythonSourceAnalyzer implements SourceAnalyzer {
  supports(language: string): boolean {
    const lang = language.toLowerCase();
    return ['python', 'py', 'python3'].includes(lang);
  }

  analyze(source: string): NormalizedCodeFacts {
    const facts = createEmptyFacts('python');
    if (!source || typeof source !== 'string') return facts;

    const lines = source.split('\n');

    // 1. Extract Functions & Recursion
    const fnRegex = /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*[^:]+)?:/g;
    let fnMatch: RegExpExecArray | null;
    while ((fnMatch = fnRegex.exec(source)) !== null) {
      const name = fnMatch[1];
      const params = (fnMatch[2] || '')
        .split(',')
        .map(p => p.trim())
        .filter(p => p && p !== 'self' && p !== 'cls')
        .map(p => p.split(':')[0].trim());
      const isRecursive = new RegExp(`\\b${name}\\s*\\(`, 'g').test(source.slice(fnMatch.index + fnMatch[0].length));
      facts.functions.push({
        name,
        params,
        isRecursive,
      });
    }

    // 2. Extract Loops & Nesting by Indentation
    let loopStack: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.search(/\S/);

      // Clean stack based on indentation
      loopStack = loopStack.filter(lvl => lvl < indent);

      if (/^(for\s+|while\s+)/.test(trimmed)) {
        loopStack.push(indent);
        const depth = loopStack.length;
        const isWhile = trimmed.startsWith('while');
        const varMatch = trimmed.match(/for\s+([a-zA-Z0-9_,\s]+)\s+in/);

        facts.loops.push({
          type: isWhile ? 'while' : 'for',
          depth,
          bounds: trimmed.replace(/:\s*$/, ''),
          variable: varMatch ? varMatch[1].trim() : undefined,
          hasEarlyExit: /break|return/.test(source),
        });
      }
    }

    // 3. Extract Conditions & Boundary Checks
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^(if\s+|elif\s+)/.test(trimmed)) {
        const cond = trimmed.replace(/^(?:if|elif)\s+/, '').replace(/:\s*$/, '').trim();
        const isBoundary = /len\(|==\s*0|<=\s*0|is\s+None|not\s+|not\s+root|< 0|>= n/.test(cond);
        const ops = (cond.match(/==|!=|<=|>=|<|>|is|not in|in/g) || []) as string[];

        facts.conditions.push({
          condition: cond,
          isBoundaryCheck: isBoundary,
          operators: ops,
        });
        if (isBoundary) {
          facts.boundaryChecks.push(cond);
        }
      }
    }

    // 4. Extract Variables
    const assignRegex = /([a-zA-Z0-9_]+)\s*=\s*([^#\n]+)/g;
    let assignMatch: RegExpExecArray | null;
    while ((assignMatch = assignRegex.exec(source)) !== null) {
      const name = assignMatch[1].trim();
      const initVal = assignMatch[2].trim();
      if (['def', 'class', 'if', 'elif', 'for', 'while', 'return', 'import', 'from'].includes(name)) continue;

      const isPtr = /^(left|right|low|high|mid|l|r|i|j|k|start|end|ptr|p1|p2)$/i.test(name);
      const isAcc = /^(sum|count|ans|res|total|max_val|min_val|result|acc|window_sum)$/i.test(name) || /0|\[\]|\{\}|float\(['"]-?inf['"]\)/.test(initVal);

      facts.variables.push({
        name,
        isPointer: isPtr,
        isAccumulator: isAcc,
        initialValue: initVal,
      });
    }

    // 5. Extract Data Structures
    if (/defaultdict|dict\(|\b\{\}/.test(source)) {
      facts.dataStructures.push({ type: 'map', name: 'dict / defaultdict', operations: ['get', 'indexing', 'keys'] });
    }
    if (/set\(|\bset\b/.test(source)) {
      facts.dataStructures.push({ type: 'set', name: 'set', operations: ['add', 'in'] });
    }
    if (/heapq|heappush|heappop/.test(source)) {
      facts.dataStructures.push({ type: 'heap', name: 'heapq', operations: ['heappush', 'heappop'] });
    }
    if (/deque\(/.test(source)) {
      facts.dataStructures.push({ type: 'queue', name: 'collections.deque', operations: ['append', 'popleft'] });
    }
    if (/dp\s*=\s*\[|dp\s*\[/.test(source)) {
      facts.dataStructures.push({ type: 'array', name: 'dp table', operations: ['indexing', 'memoization'] });
    }

    // 6. State Mutations
    const mutRegex = /([a-zA-Z0-9_.]+)\s*(\+=|-=|\*=|\/\/=|\/=|\.append\(|\.pop\(|\.popleft\(|\.add\()\s*([^#\n]*)/g;
    let mutMatch: RegExpExecArray | null;
    while ((mutMatch = mutRegex.exec(source)) !== null) {
      facts.stateMutations.push({
        target: mutMatch[1],
        operation: `${mutMatch[1]} ${mutMatch[2]} ${mutMatch[3]}`.trim(),
      });
    }

    // 7. Early Returns
    const retRegex = /return\s+([^#\n]+)/g;
    let retMatch: RegExpExecArray | null;
    while ((retMatch = retRegex.exec(source)) !== null) {
      facts.earlyReturns.push({
        condition: 'explicit',
        returnValue: retMatch[1].trim(),
      });
    }

    // 8. Raw Snippets for Walkthrough
    const initLines = lines.filter(l => /^\s*[a-zA-Z0-9_]+\s*=\s*[^=]/.test(l)).slice(0, 3);
    const loopLines = lines.filter(l => /^\s*(?:for|while)\s+/.test(l)).slice(0, 2);
    const condLines = lines.filter(l => /^\s*(?:if|elif)\s+/.test(l)).slice(0, 2);
    const updateLines = lines.filter(l => /\+=|-=|\.append|\.popleft|\.add/.test(l)).slice(0, 2);
    const retLines = lines.filter(l => /^\s*return\b/.test(l)).slice(0, 1);

    facts.rawSnippets = {
      init: initLines.map(l => l.trim()).join('\n'),
      loop: loopLines.map(l => l.trim()).join('\n'),
      eval: condLines.map(l => l.trim()).join('\n'),
      update: updateLines.map(l => l.trim()).join('\n'),
      ret: retLines.map(l => l.trim()).join('\n'),
    };

    return facts;
  }
}
