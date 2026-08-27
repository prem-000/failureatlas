import type { NormalizedCodeFacts, SourceAnalyzer } from '@/lib/adversarial/types';
import { TsJsSourceAnalyzer } from './ts-js-analyzer';
import { PythonSourceAnalyzer } from './python-analyzer';
import { PolyglotSourceAnalyzer } from './polyglot-analyzer';

export const sourceAnalyzers: SourceAnalyzer[] = [
  new TsJsSourceAnalyzer(),
  new PythonSourceAnalyzer(),
  new PolyglotSourceAnalyzer(), // Polyglot Fallback
];

export function detectSourceLanguage(code: string, hintedLang?: string): string {
  if (hintedLang && hintedLang.trim()) {
    const l = hintedLang.toLowerCase().trim();
    if (['python', 'py', 'python3'].includes(l)) return 'python';
    if (['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(l)) return 'typescript';
    if (['cpp', 'c++', 'c', 'clang'].includes(l)) return 'cpp';
    if (['java'].includes(l)) return 'java';
    if (['go', 'golang'].includes(l)) return 'go';
    if (['rust', 'rs'].includes(l)) return 'rust';
    return l;
  }

  // Heuristic detection based on syntax keywords
  if (/def\s+[a-zA-Z0-9_]+\s*\(|elif\s+|import\s+collections|from\s+[a-zA-Z0-9_]+\s+import|x\s*\/\/\s*=\s*10/.test(code)) {
    return 'python';
  }
  if (/\b(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=|function\s+[a-zA-Z0-9_$]+\s*\(|console\.log/.test(code)) {
    return 'typescript';
  }
  if (/#include\s*<|vector<|std::|unordered_map|cout\s*<</.test(code)) {
    return 'cpp';
  }
  if (/public\s+class|System\.out\.println|public\s+static\s+void/.test(code)) {
    return 'java';
  }

  return 'typescript';
}

export function analyzeSource(code: string, hintedLanguage?: string): NormalizedCodeFacts {
  const language = detectSourceLanguage(code, hintedLanguage);
  for (const analyzer of sourceAnalyzers) {
    if (analyzer.supports(language)) {
      return analyzer.analyze(code);
    }
  }
  return sourceAnalyzers[sourceAnalyzers.length - 1].analyze(code);
}
