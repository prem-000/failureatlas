import { PlatformAdapter } from '../base/PlatformAdapter';
import type {
  Platform,
  EditorEvidence,
  NetworkEvidence,
  ResultEvidence,
  SubmitEvidence,
  ProblemEvidence,
  AdapterContext,
} from '../base/types';
import type { SubmissionStatus, ProblemDifficulty } from '../../types';

// ─── Problem Metadata Extractor (Preserved from content.ts) ───────────────────
class ProblemMetadataExtractor {
  extractSlugFromUrl(): string {
    const problemMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
    const contestMatch = window.location.pathname.match(/\/contest\/[^/]+\/problems\/([^/]+)/);
    const match = problemMatch || contestMatch;
    return match ? match[1] : '';
  }

  extractTitle(): string {
    const selectors = [
      '[data-cy="question-title"]',
      '.question-title h3',
      '.mr-2.text-label-1',
      'h1',
      '.text-title-large'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    const slug = this.extractSlugFromUrl();
    return slug
      ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Unknown Problem';
  }

  extractDifficulty(): ProblemDifficulty {
    const selectors = [
      '.text-difficulty-easy',
      '.text-difficulty-medium',
      '.text-difficulty-hard',
      '[diff]',
      '.text-olive',
      '.text-pink'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent?.trim().toLowerCase() || '';
        if (text.includes('easy')) return 'Easy';
        if (text.includes('medium')) return 'Medium';
        if (text.includes('hard')) return 'Hard';
        const diffAttr = el.getAttribute('diff');
        if (diffAttr === '1') return 'Easy';
        if (diffAttr === '2') return 'Medium';
        if (diffAttr === '3') return 'Hard';
      }
    }
    if (document.querySelector('.text-difficulty-easy, .text-olive')) return 'Easy';
    if (document.querySelector('.text-difficulty-hard, .text-pink')) return 'Hard';
    return 'Medium';
  }

  extractTopics(): string[] {
    const selectors = [
      '[data-cy="topic-tag"]',
      '.topic-tag',
      '.css-1ynq64s a',
      'a[href*="/tag/"]'
    ];
    const topicsSet = new Set<string>();
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(el => {
        const text = el.textContent?.trim();
        if (text) topicsSet.add(text);
      });
    }
    return Array.from(topicsSet).filter(Boolean).slice(0, 20);
  }

  extractAll(): ProblemEvidence {
    return {
      platform: 'leetcode',
      slug: this.extractSlugFromUrl(),
      title: this.extractTitle(),
      difficulty: this.extractDifficulty(),
      topics: this.extractTopics(),
      url: window.location.href
    };
  }
}

// ─── Code Editor Handler (Preserved from content.ts) ──────────────────────────
class CodeEditorHandler {
  private cachedCode = '';
  private monitorInterval: number | null = null;

  startCaching(): void {
    if (this.monitorInterval !== null) return;
    this.updateCache();
    this.monitorInterval = window.setInterval(() => {
      this.updateCache();
    }, 2000);
  }

  stopCaching(): void {
    if (this.monitorInterval !== null) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private updateCache(): void {
    const code = this.extractCode();
    if (code && code.length > 10) {
      this.cachedCode = code;
    }
  }

  extractCode(): string {
    // 1. Monaco API
    try {
      const monacoModel = (window as any)?.monaco?.editor?.getModels?.()[0];
      if (monacoModel) {
        const value = monacoModel.getValue();
        if (value && value.length > 10) return value;
      }
    } catch (e) {}

    // 2. Monaco DOM lines
    try {
      const lines = document.querySelectorAll('.monaco-editor .view-line');
      if (lines.length > 0) {
        const code = Array.from(lines)
          .map(line => line.textContent || '')
          .join('\n');
        if (code && code.length > 10) return code;
      }
    } catch (e) {}

    // 3. Textarea elements
    const textareaSelectors = [
      'textarea.inputarea',
      '.monaco-editor textarea',
      '[data-cy="code-editor"] textarea',
      '#editor textarea',
      '.CodeMirror textarea'
    ];
    for (const selector of textareaSelectors) {
      try {
        const textarea = document.querySelector(selector) as HTMLTextAreaElement | null;
        if (textarea?.value && textarea.value.length > 10) {
          return textarea.value;
        }
      } catch (e) {}
    }

    // 4. Contenteditable div
    try {
      const contentEditable = document.querySelector('[contenteditable="true"]');
      if (contentEditable) {
        const code = contentEditable.textContent || '';
        if (code && code.length > 10) return code;
      }
    } catch (e) {}

    return '';
  }

  getCachedCode(): string {
    if (this.cachedCode && this.cachedCode.length > 10) {
      return this.cachedCode;
    }
    return this.extractCode();
  }

  reset(): void {
    this.stopCaching();
    this.cachedCode = '';
  }
}

// ─── Submission Monitor (Preserved from content.ts) ───────────────────────────
class SubmissionMonitor {
  private observer: MutationObserver | null = null;
  private onDetectedCallback: (result: ResultEvidence) => void;
  private lastDetectionTime = 0;

  constructor(onDetected: (result: ResultEvidence) => void) {
    this.onDetectedCallback = onDetected;
  }

  extractMetrics(): { runtime?: number; memory?: number } {
    let runtime: number | undefined;
    let memory: number | undefined;

    const candidates = document.querySelectorAll('div, span, p');
    for (const el of Array.from(candidates)) {
      if (el.children.length > 5) continue;
      const text = el.textContent?.trim() || '';
      if (text.length > 100) continue;

      if (runtime === undefined) {
        const rMatch = text.match(/Runtime\D*(\d+)\s*ms/i);
        if (rMatch) runtime = parseInt(rMatch[1], 10);
      }
      if (memory === undefined) {
        const mMatch = text.match(/Memory\D*([\d.]+)\s*MB/i);
        if (mMatch) memory = parseFloat(mMatch[1]);
      }
      if (runtime !== undefined && memory !== undefined) break;
    }

    if (runtime === undefined || memory === undefined) {
      const bodyText = document.body.innerText || '';
      if (runtime === undefined) {
        const rMatch = bodyText.match(/Runtime\D*(\d+)\s*ms/i);
        if (rMatch) runtime = parseInt(rMatch[1], 10);
      }
      if (memory === undefined) {
        const mMatch = bodyText.match(/Memory\D*([\d.]+)\s*MB/i);
        if (mMatch) memory = parseFloat(mMatch[1]);
      }
    }

    return {
      runtime: runtime !== undefined && !isNaN(runtime) ? runtime : undefined,
      memory: memory !== undefined && !isNaN(memory) ? memory : undefined
    };
  }

  private parseSubmissionResult(node: Node): ResultEvidence | null {
    const container = node instanceof Element ? node : document.body;

    const statusSelectors = [
      '[data-cy="submission-result"]',
      'h3',
      '.submission-result',
      '.result-state',
      '.css-1jnblbv',
      '[class*="text-green"]',
      '[class*="text-red"]',
      '[class*="text-yellow"]'
    ];

    let statusText: string | null = null;
    for (const sel of statusSelectors) {
      try {
        const elements = container instanceof Element
          ? [container.querySelector(sel)].filter(Boolean)
          : Array.from(document.querySelectorAll(sel));

        for (const el of elements) {
          const text = el?.textContent?.trim();
          if (text && this.normalizeStatus(text)) {
            statusText = text;
            break;
          }
        }
        if (statusText) break;
      } catch (e) {}
    }

    if (!statusText) return null;

    const status = this.normalizeStatus(statusText);
    if (!status) return null;

    const now = Date.now();
    if (now - this.lastDetectionTime < 3000) {
      return null;
    }
    this.lastDetectionTime = now;

    const { runtime, memory } = this.extractMetrics();

    const bodyText = document.body.innerText || '';
    let testCasesPassed: number | undefined;
    let totalTestCases: number | undefined;
    const testMatch = bodyText.match(/(\d+)\s*\/\s*(\d+)\s+test\s*cases?\s+passed/i);
    if (testMatch) {
      testCasesPassed = parseInt(testMatch[1], 10);
      totalTestCases = parseInt(testMatch[2], 10);
    }

    return {
      status,
      rawStatus: statusText,
      runtime,
      memory,
      testCasesPassed,
      totalTestCases,
      timestamp: now
    };
  }

  normalizeStatus(text: string): SubmissionStatus | null {
    const lower = text.toLowerCase().trim();
    const STATUS_MAP: Record<string, SubmissionStatus> = {
      'accepted': 'Accepted',
      'wrong answer': 'Wrong Answer',
      'time limit exceeded': 'Time Limit Exceeded',
      'memory limit exceeded': 'Memory Limit Exceeded',
      'runtime error': 'Runtime Error',
      'compile error': 'Compilation Error',
      'compilation error': 'Compilation Error'
    };

    for (const [key, val] of Object.entries(STATUS_MAP)) {
      if (lower.includes(key)) return val;
    }
    return null;
  }

  attach(): void {
    this.disconnect();

    const containerSelectors = [
      '[data-cy="submission-area"]',
      '.submission-result',
      '#qd-content',
      'main',
      'body'
    ];

    let targetNode: Element | null = null;
    for (const sel of containerSelectors) {
      targetNode = document.querySelector(sel);
      if (targetNode) break;
    }
    if (!targetNode) targetNode = document.body;

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of Array.from(mutation.addedNodes)) {
            const result = this.parseSubmissionResult(node);
            if (result) {
              this.onDetectedCallback(result);
              return;
            }
          }
        }
      }
    });

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// ─── LeetCode Platform Adapter ─────────────────────────────────────────────────
export class LeetCodeAdapter extends PlatformAdapter {
  readonly platform: Platform = 'leetcode';

  private metadataExtractor = new ProblemMetadataExtractor();
  private editorHandler = new CodeEditorHandler();
  private submissionMonitor: SubmissionMonitor | null = null;
  private submitButtonListeners: Array<() => void> = [];

  matches(url: string): boolean {
    return url.includes('leetcode.com/problems/') || url.includes('leetcode.com/contest/');
  }

  async initialize(_context: AdapterContext): Promise<void> {
    console.log('[LeetCodeAdapter] Initializing on:', window.location.href);
    this.editorHandler.startCaching();
  }

  async cleanup(): Promise<void> {
    console.log('[LeetCodeAdapter] Cleaning up');
    this.editorHandler.stopCaching();
    if (this.submissionMonitor) {
      this.submissionMonitor.disconnect();
      this.submissionMonitor = null;
    }
    this.submitButtonListeners.forEach(cleanup => cleanup());
    this.submitButtonListeners = [];
  }

  captureEditor(): EditorEvidence | null {
    const code = this.editorHandler.getCachedCode();
    if (!code || code.length <= 10) return null;
    return {
      code,
      language: this.extractLanguage(),
      source: 'monaco',
      timestamp: Date.now()
    };
  }

  captureProblem(): ProblemEvidence {
    return this.metadataExtractor.extractAll();
  }

  startNetworkCapture(_onEvidence: (e: NetworkEvidence) => void): void {
    // LeetCode capture in Praxis uses DOM observation and client-side Monaco/editor caching
  }

  startResultMonitor(onResult: (r: ResultEvidence) => void): void {
    this.submissionMonitor = new SubmissionMonitor(onResult);
    this.submissionMonitor.attach();
  }

  detectSubmitAction(onSubmit: (s: SubmitEvidence) => void): void {
    const selectors = [
      'button[data-cy="submit-code-btn"]',
      '[data-e2e-locator="console-submit-button"]',
      'button.bg-green-s'
    ];

    const handleClick = () => {
      this.editorHandler.extractCode();
      onSubmit({
        trigger: 'button_click',
        timestamp: Date.now()
      });
    };

    selectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          el.addEventListener('click', handleClick);
          this.submitButtonListeners.push(() => el.removeEventListener('click', handleClick));
        });
      } catch (e) {}
    });

    // Safe DOM text matching instead of invalid :has-text() pseudo-selector
    try {
      document.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent?.trim().toLowerCase();
        if (text === 'submit') {
          btn.addEventListener('click', handleClick);
          this.submitButtonListeners.push(() => btn.removeEventListener('click', handleClick));
        }
      });
    } catch (e) {}
  }

  extractLanguage(): string {
    const selectors = [
      'button[id*="headlessui-listbox-button"]',
      '[data-cy="lang-select"]',
      'button:has(svg)'
    ];
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          return this.normalizeLanguage(el.textContent.trim());
        }
      } catch (e) {}
    }
    return 'python3';
  }

  normalizeLanguage(rawLang: string): string {
    return rawLang.toLowerCase().replace(/\s+/g, '');
  }

  normalizeStatus(rawStatus: string): SubmissionStatus {
    const monitor = new SubmissionMonitor(() => {});
    return monitor.normalizeStatus(rawStatus) || 'Wrong Answer';
  }
}
