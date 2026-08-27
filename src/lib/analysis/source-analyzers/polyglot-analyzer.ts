import type { NormalizedCodeFacts, SourceAnalyzer } from '@/lib/adversarial/types';
import { createEmptyFacts } from './analyzer-interface';

export class PolyglotSourceAnalyzer implements SourceAnalyzer {
  supports(_language: string): boolean {
    return true; // Fallback matches all languages
  }

  analyze(source: string): NormalizedCodeFacts {
    const facts = createEmptyFacts('polyglot');
    if (!source || typeof source !== 'string') return facts;

    const lines = source.split('\n');

    // 1. Functions & Recursion
    const fnRegex = /(?:[a-zA-Z0-9_<>,:]+\s+)+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/g;
    let fnMatch: RegExpExecArray | null;
    while ((fnMatch = fnRegex.exec(source)) !== null) {
      const name = fnMatch[1];
      if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
        const isRecursive = new RegExp(`\\b${name}\\s*\\(`, 'g').test(source.slice(fnMatch.index + fnMatch[0].length));
        facts.functions.push({
          name,
          params: (fnMatch[2] || '').split(',').map(p => p.trim()).filter(Boolean),
          isRecursive,
        });
      }
    }

    // 2. Loops & Nesting Depth
    let depth = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/\b(for|while)\s*\(/.test(trimmed)) {
        depth++;
        const varMatch = trimmed.match(/(?:int|auto|long|var)\s+([a-zA-Z0-9_]+)/);
        facts.loops.push({
          type: trimmed.startsWith('while') ? 'while' : 'for',
          depth,
          bounds: trimmed,
          variable: varMatch ? varMatch[1] : undefined,
          hasEarlyExit: /break|return/.test(source),
        });
      }
      if (trimmed.includes('}') && depth > 0) {
        depth = Math.max(0, depth - 1);
      }
    }

    // 3. Conditions & Boundary Checks
    const condRegex = /if\s*\(([^)]+)\)/g;
    let condMatch: RegExpExecArray | null;
    while ((condMatch = condRegex.exec(source)) !== null) {
      const cond = condMatch[1].trim();
      const isBoundary = /size\(\)|length|empty\(\)|==\s*0|<=\s*0|null|nullptr|!root|< 0|>= n/.test(cond);
      const ops = (cond.match(/==|!=|<=|>=|<|>/g) || []) as string[];
      facts.conditions.push({
        condition: cond,
        isBoundaryCheck: isBoundary,
        operators: ops,
      });
      if (isBoundary) {
        facts.boundaryChecks.push(cond);
      }
    }

    // 4. Variables
    const varRegex = /(?:int|long|double|auto|var|vector<int>|unordered_map|unordered_set)\s+([a-zA-Z0-9_]+)\s*=\s*([^;,\n]+)/g;
    let varMatch: RegExpExecArray | null;
    while ((varMatch = varRegex.exec(source)) !== null) {
      const name = varMatch[1];
      const initVal = varMatch[2].trim();
      const isPtr = /^(left|right|low|high|mid|l|r|i|j|k|start|end|ptr)$/i.test(name);
      const isAcc = /^(sum|count|ans|res|total|max|min|result|acc)$/i.test(name) || /0|\{\}/.test(initVal);
      facts.variables.push({
        name,
        isPointer: isPtr,
        isAccumulator: isAcc,
        initialValue: initVal,
      });
    }

    // 5. Data Structures
    if (/unordered_map|map<|HashMap/i.test(source)) {
      facts.dataStructures.push({ type: 'map', name: 'hash map', operations: ['insert', 'find', 'count'] });
    }
    if (/unordered_set|set<|HashSet/i.test(source)) {
      facts.dataStructures.push({ type: 'set', name: 'hash set', operations: ['insert', 'count'] });
    }
    if (/priority_queue|PriorityQueue/i.test(source)) {
      facts.dataStructures.push({ type: 'heap', name: 'priority queue', operations: ['push', 'pop', 'top'] });
    }
    if (/vector<vector|int\[\]\[\]|dp\[/i.test(source)) {
      facts.dataStructures.push({ type: 'array', name: 'dp table', operations: ['indexing'] });
    }

    // 6. State Mutations
    const mutRegex = /([a-zA-Z0-9_$.]+)\s*(\+=|-=|\*=|\/=|%=|\+\+|--|=|push_back|insert|emplace)\s*([^;\n]*)/g;
    let mutMatch: RegExpExecArray | null;
    while ((mutMatch = mutRegex.exec(source)) !== null) {
      const target = mutMatch[1];
      if (!['int', 'long', 'auto', 'double', 'float', 'void', 'if', 'return'].includes(target)) {
        facts.stateMutations.push({
          target,
          operation: `${target} ${mutMatch[2]} ${mutMatch[3]}`.trim(),
        });
      }
    }

    // 7. Early Returns
    const retRegex = /return\s+([^;\n]+)/g;
    let retMatch: RegExpExecArray | null;
    while ((retMatch = retRegex.exec(source)) !== null) {
      facts.earlyReturns.push({
        condition: 'explicit',
        returnValue: retMatch[1].trim(),
      });
    }

    // 8. Raw Snippets
    const initLines = lines.filter(l => /(?:int|long|auto|var)\s+[a-zA-Z0-9_]+\s*=/.test(l)).slice(0, 3);
    const loopLines = lines.filter(l => /\b(for|while)\s*\(/.test(l)).slice(0, 2);
    const condLines = lines.filter(l => /\bif\s*\(/.test(l)).slice(0, 2);
    const updateLines = lines.filter(l => /\+=|-=|\+\+|--|\.push_back|\.insert/.test(l)).slice(0, 2);
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
