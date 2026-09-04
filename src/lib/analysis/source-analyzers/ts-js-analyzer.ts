import type { NormalizedCodeFacts, SourceAnalyzer } from '@/lib/adversarial/types';
import { createEmptyFacts } from './analyzer-interface';

export class TsJsSourceAnalyzer implements SourceAnalyzer {
  supports(language: string): boolean {
    const lang = language.toLowerCase();
    return ['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(lang);
  }

  analyze(source: string): NormalizedCodeFacts {
    const facts = createEmptyFacts('typescript');
    if (!source || typeof source !== 'string') return facts;

    const lines = source.split('\n');

    // 1. Extract Functions
    const fnRegex = /(?:function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?function\s*\(([^)]*)\)|(?:async\s+)?([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*\{)/g;
    let fnMatch: RegExpExecArray | null;
    while ((fnMatch = fnRegex.exec(source)) !== null) {
      const name = fnMatch[1] || fnMatch[3] || fnMatch[5] || fnMatch[7];
      const rawParams = fnMatch[2] ?? fnMatch[4] ?? fnMatch[6] ?? fnMatch[8] ?? '';
      if (name && !['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
        // Check for recursive self-call
        const isRecursive = new RegExp(`\\b${name}\\s*\\(`, 'g').test(source.slice(fnMatch.index + fnMatch[0].length));
        const params = rawParams
          .split(',')
          .map(p => p.trim().split(':')[0].trim())
          .filter(p => p && p !== 'this');
        facts.functions.push({
          name,
          params,
          isRecursive,
        });
      }
    }

    // 2. Extract Loops & Nesting Depth
    let currentDepth = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/\b(for\s*\(|while\s*\()/.test(line)) {
        currentDepth++;
        let loopType: 'for' | 'while' | 'for-of' | 'for-in' = 'for';
        if (line.includes(' of ')) loopType = 'for-of';
        else if (line.includes(' in ')) loopType = 'for-in';
        else if (line.startsWith('while')) loopType = 'while';

        // Extract loop variable if present
        const varMatch = line.match(/(?:let|var|const)\s+([a-zA-Z0-9_$]+)/);
        const boundsMatch = line.match(/\((.*?)\)/);

        facts.loops.push({
          type: loopType,
          depth: currentDepth,
          bounds: boundsMatch ? boundsMatch[1] : line,
          variable: varMatch ? varMatch[1] : undefined,
          hasEarlyExit: /break|return/.test(source),
        });
      }
      if (line.includes('}') && currentDepth > 0) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    // 3. Extract Conditions & Boundary Checks
    const condRegex = /if\s*\(([^)]+)\)/g;
    let condMatch: RegExpExecArray | null;
    while ((condMatch = condRegex.exec(source)) !== null) {
      const cond = condMatch[1].trim();
      const isBoundary = /length|=== 0|<= 0|null|undefined|< 0|>= n|\.size === 0/.test(cond);
      const ops = (cond.match(/===|!==|==|!=|<=|>=|<|>/g) || []) as string[];
      facts.conditions.push({
        condition: cond,
        isBoundaryCheck: isBoundary,
        operators: ops,
      });
      if (isBoundary) {
        facts.boundaryChecks.push(cond);
      }
    }

    // 4. Extract Variables (Pointers vs Accumulators)
    const varDeclRegex = /(?:let|const|var)\s+([a-zA-Z0-9_$]+)\s*=\s*([^;,\n]+)/g;
    let varDeclMatch: RegExpExecArray | null;
    while ((varDeclMatch = varDeclRegex.exec(source)) !== null) {
      const name = varDeclMatch[1];
      const initVal = varDeclMatch[2].trim();
      const isPtr = /^(left|right|low|high|mid|l|r|i|j|k|start|end|ptr|p1|p2)$/i.test(name);
      const isAcc = /^(sum|count|ans|res|total|max|min|result|accumulator|acc|prod|windowSum)$/i.test(name) || /0|\[\]|\{\}/.test(initVal);
      facts.variables.push({
        name,
        isPointer: isPtr,
        isAccumulator: isAcc,
        initialValue: initVal,
      });
    }

    // 5. Extract Data Structures
    if (/new\s+Map\s*\(|\.set\(|\.get\(/.test(source)) {
      facts.dataStructures.push({ type: 'map', name: 'Map', operations: ['set', 'get', 'has'] });
    }
    if (/new\s+Set\s*\(|\.add\(|\.has\(/.test(source)) {
      facts.dataStructures.push({ type: 'set', name: 'Set', operations: ['add', 'has'] });
    }
    if (/new\s+Array\s*\(|dp\s*=\s*\[|dp\s*\[/.test(source)) {
      facts.dataStructures.push({ type: 'array', name: 'dpTable', operations: ['indexing', 'fill'] });
    }
    if (/priorityqueue|minheap|maxheap/i.test(source)) {
      facts.dataStructures.push({ type: 'heap', name: 'PriorityQueue', operations: ['enqueue', 'dequeue'] });
    }

    // 6. Extract State Mutations
    const mutationRegex = /([a-zA-Z0-9_$.]+)\s*(\+=|-=|\*=|\/=|%=|\+\+|--|=|push|pop|shift|unshift)\s*([^;\n]*)/g;
    let mutMatch: RegExpExecArray | null;
    while ((mutMatch = mutationRegex.exec(source)) !== null) {
      const target = mutMatch[1];
      const op = mutMatch[2];
      if (!['let', 'const', 'var', 'function', 'if', 'return'].includes(target)) {
        facts.stateMutations.push({
          target,
          operation: `${target} ${op} ${mutMatch[3]}`.trim(),
        });
      }
    }

    // 7. Early Returns
    const returnRegex = /return\s+([^;\n]+)/g;
    let retMatch: RegExpExecArray | null;
    while ((retMatch = returnRegex.exec(source)) !== null) {
      facts.earlyReturns.push({
        condition: 'explicit',
        returnValue: retMatch[1].trim(),
      });
    }

    // 8. Raw Snippets for Walkthrough
    const initLines = lines.filter(l => /(?:let|const|var)\s+[a-zA-Z0-9_$]+\s*=/.test(l)).slice(0, 3);
    const loopLines = lines.filter(l => /\b(for|while)\b/.test(l)).slice(0, 2);
    const condLines = lines.filter(l => /\bif\s*\(/.test(l)).slice(0, 2);
    const updateLines = lines.filter(l => /\+=|-=|\+\+|--|\.set\(|\.add\(/.test(l)).slice(0, 2);
    const retLines = lines.filter(l => /\breturn\b/.test(l)).slice(0, 1);

    facts.rawSnippets = {
      init: initLines.join('\n').trim(),
      loop: loopLines.join('\n').trim(),
      eval: condLines.join('\n').trim(),
      update: updateLines.join('\n').trim(),
      ret: retLines.join('\n').trim(),
    };

    return facts;
  }
}
