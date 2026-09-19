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
import type { SubmissionStatus } from '../../types';

export class HackerRankAdapter extends PlatformAdapter {
  readonly platform: Platform = 'hackerrank';

  private messageListener: ((event: MessageEvent) => void) | null = null;
  private scriptElement: HTMLScriptElement | null = null;
  private onResultCallback: ((r: ResultEvidence) => void) | null = null;
  private submitButtonListeners: Array<() => void> = [];
  private resultObserver: MutationObserver | null = null;
  private lastTerminalStatus: SubmissionStatus | null = null;
  private lastDetectionTime = 0;
  private lastResponse: any = null;

  matches(url: string): boolean {
    return (
      url.includes('hackerrank.com') &&
      (url.includes('/challenges/') || url.includes('/challenge/') || url.includes('/problem'))
    );
  }

  async initialize(_context: AdapterContext): Promise<void> {
    console.log('[HackerRankAdapter] Initializing on:', window.location.href);
    this.lastTerminalStatus = null;
    this.lastDetectionTime = 0;
    this.injectNetworkInterceptor();
  }

  async cleanup(): Promise<void> {
    console.log('[HackerRankAdapter] Cleaning up');
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    if (this.resultObserver) {
      this.resultObserver.disconnect();
      this.resultObserver = null;
    }
    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
      this.scriptElement = null;
    }
    this.submitButtonListeners.forEach(cleanup => cleanup());
    this.submitButtonListeners = [];
    this.lastTerminalStatus = null;
  }

  private injectNetworkInterceptor(): void {
    if (this.scriptElement) return;
    try {
      this.scriptElement = document.createElement('script');
      this.scriptElement.src = chrome.runtime.getURL('hackerrank-network-interceptor.js');
      (document.head || document.documentElement).appendChild(this.scriptElement);
      console.log('[HackerRankAdapter] Interceptor injected:', this.scriptElement.src);
    } catch (e) {
      console.error('[HackerRankAdapter] Failed to inject network interceptor:', e);
    }
  }

  /**
   * Safe editor extraction — supports Monaco (.view-line), CodeMirror 5 (.CodeMirror-line),
   * CodeMirror 6 (.cm-line), Ace (.ace_line), textareas, and code containers.
   */
  captureEditor(): EditorEvidence | null {
    const code = this.extractCodeSafely();
    if (!code || code.trim().length <= 5) return null;

    return {
      code,
      language: this.detectLanguage(code),
      source: 'dom',
      timestamp: Date.now(),
    };
  }

  private extractCodeSafely(): string {
    // 1. Monaco DOM lines (.view-line, .view-lines)
    try {
      const lines = document.querySelectorAll('.monaco-editor .view-line, .view-line');
      if (lines.length > 0) {
        const val = Array.from(lines).map(l => l.textContent || '').join('\n');
        if (val.trim().length > 10) return val;
      }
    } catch (e) {}

    // 2. CodeMirror 5 (.CodeMirror-line / .CodeMirror-code) — CRITICAL FOR HACKERRANK
    try {
      const cmLines = document.querySelectorAll('.CodeMirror-line');
      if (cmLines.length > 0) {
        const val = Array.from(cmLines).map(l => l.textContent || '').join('\n');
        if (val.trim().length > 10) return val;
      }
      const cmCode = document.querySelector('.CodeMirror-code, .CodeMirror-lines');
      if (cmCode && cmCode.textContent && cmCode.textContent.trim().length > 10) {
        return cmCode.textContent;
      }
    } catch (e) {}

    // 3. CodeMirror 6 (.cm-line / .cm-content)
    try {
      const cmLines = document.querySelectorAll('.cm-line');
      if (cmLines.length > 0) {
        const val = Array.from(cmLines).map(l => l.textContent || '').join('\n');
        if (val.trim().length > 10) return val;
      }
      const cmContent = document.querySelector('.cm-content');
      if (cmContent && cmContent.textContent && cmContent.textContent.trim().length > 10) {
        return cmContent.textContent;
      }
    } catch (e) {}

    // 4. Ace editor
    try {
      const aceLines = document.querySelectorAll('.ace_line');
      if (aceLines.length > 0) {
        const val = Array.from(aceLines).map(l => l.textContent || '').join('\n');
        if (val.trim().length > 10) return val;
      }
      const aceEl = document.querySelector('.ace_editor') as any;
      if (aceEl?.env?.editor?.getValue) {
        const val = aceEl.env.editor.getValue();
        if (val && val.trim().length > 10) return val;
      }
    } catch (e) {}

    // 5. Textareas
    const textareaSelectors = [
      'textarea.inputarea',
      '.monaco-editor textarea',
      '.CodeMirror textarea',
      '.ace_text-input',
      '#code textarea',
      'textarea[name="code"]',
      'textarea',
    ];
    for (const sel of textareaSelectors) {
      try {
        const el = document.querySelector(sel) as HTMLTextAreaElement;
        if (el?.value && el.value.trim().length > 10) return el.value;
      } catch (e) {}
    }

    // 6. Generic editor container
    try {
      const editorContainers = document.querySelectorAll(
        '.hr-monaco-editor, [class*="editor-container"], [class*="code-editor"], #code, .code-editor'
      );
      for (const container of Array.from(editorContainers)) {
        const text = container.textContent || '';
        if (text.trim().length > 15) return text.trim();
      }
    } catch (e) {}

    return '';
  }

  captureProblem(response?: any): ProblemEvidence {
    const res = response || this.lastResponse;

    const problemSlug =
      res?.model?.slug ||
      res?.model?.challenge_slug ||
      res?.slug ||
      res?.challenge_slug ||
      (typeof location !== 'undefined'
        ? location.pathname.match(/\/challenges\/([^/]+)\/problem/)?.[1] ||
          location.pathname.match(/\/challenges\/([^/?#]+)/)?.[1]
        : undefined) ||
      'hackerrank-challenge';

    const problemTitle =
      res?.model?.name ||
      res?.name ||
      (typeof document !== 'undefined'
        ? document.title.replace(/\s*\|\s*HackerRank\s*$/, "").trim()
        : '') ||
      problemSlug;

    const problemUrl =
      problemSlug && problemSlug !== 'hackerrank-challenge'
        ? `https://www.hackerrank.com/challenges/${problemSlug}/problem`
        : typeof location !== 'undefined'
          ? location.href
          : `https://www.hackerrank.com/challenges/${problemSlug}/problem`;

    return {
      platform: 'hackerrank',
      slug: problemSlug,
      title: problemTitle,
      url: problemUrl,
    };
  }

  private extractSlugFromUrl(): string {
    const m = window.location.pathname.match(/\/challenges?\/([^/?#]+)/);
    if (m && m[1]) return m[1];
    const m2 = window.location.href.match(/\/challenges?\/([^/?#]+)/);
    return m2 ? m2[1] : '';
  }

  private extractTitle(slug: string): string | undefined {
    // Check known headers safely, fall back to formatted slug
    const selectors = [
      'h1.hr-breadcrumb-text',
      '.challenge-view--header h1',
      '.challenge-header h1',
      'h1',
      '.challenge-name',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return slug
      ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : undefined;
  }

  startNetworkCapture(_onEvidence: (e: NetworkEvidence) => void): void {
    // Interceptor dispatches results via window.postMessage
  }

  startResultMonitor(onResult: (r: ResultEvidence) => void): void {
    this.onResultCallback = onResult;

    // 1. Listen for network interceptor messages
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }

    this.messageListener = (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;

      if (event.data.type === 'FA_HACKERRANK_RESULT') {
        const { submissionId, result, timestamp } = event.data;
        this.lastResponse = result;
        const model = result?.model || result?.data || result?.submission || result || {};

        const rawStatus = String(model.status || model.result || 'Wrong Answer');
        const status = this.normalizeStatus(rawStatus);

        let runtime: number | undefined;
        if (model.time != null) {
          const t = parseFloat(String(model.time));
          if (!isNaN(t)) runtime = Math.round(t * 1000); // seconds to ms
        }

        let memory: number | undefined;
        if (model.memory != null) {
          const m = parseFloat(String(model.memory));
          if (!isNaN(m)) memory = m / 1024; // KB to MB
        }

        const tcStatus = model.testcase_status ?? [];
        const totalTestCases = model.testcases_count ?? tcStatus.length ?? undefined;
        const testCasesPassed = tcStatus.length > 0
          ? tcStatus.filter((s: any) => String(s) === '1' || s === 1).length
          : undefined;

        let failedTestCase: string | undefined;
        const failedIdx = tcStatus.findIndex((s: any) => String(s) !== '1' && s !== 1);
        if (failedIdx !== -1) {
          failedTestCase = JSON.stringify({ testCaseIndex: failedIdx });
        } else if (model.compile_message) {
          failedTestCase = JSON.stringify({ compile_message: model.compile_message });
        } else if (model.stderr) {
          failedTestCase = JSON.stringify({ stderr: model.stderr });
        }

        this.lastTerminalStatus = status;
        this.lastDetectionTime = Date.now();

        if (this.onResultCallback) {
          this.onResultCallback({
            status,
            rawStatus,
            platformSubmissionId: submissionId ? String(submissionId) : undefined,
            runtime,
            memory,
            testCasesPassed,
            totalTestCases,
            failedTestCase,
            timestamp: timestamp || Date.now(),
          });
        }
      }
    };

    window.addEventListener('message', this.messageListener);

    // 2. DOM MutationObserver fallback for visual feedback (Congratulations / Success / Wrong Answer)
    if (this.resultObserver) {
      this.resultObserver.disconnect();
    }

    this.resultObserver = new MutationObserver(() => {
      this.checkResultDOM();
    });

    this.resultObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private checkResultDOM(): void {
    const text = document.body.innerText || '';
    if (!text) return;

    let detectedStatus: SubmissionStatus | null = null;
    let rawStatus = '';

    // HackerRank success: "Congratulations" and "You solved this challenge" or "Compiler Message Success"
    if (
      (text.includes('Congratulations') && text.includes('You solved this challenge')) ||
      (text.includes('Compiler Message') && text.includes('Success'))
    ) {
      detectedStatus = 'Accepted';
      rawStatus = 'Congratulations: You solved this challenge';
    } else if (text.includes('Wrong Answer')) {
      detectedStatus = 'Wrong Answer';
      rawStatus = 'Wrong Answer';
    } else if (text.includes('Terminated due to timeout') || text.includes('Time Limit Exceeded')) {
      detectedStatus = 'Time Limit Exceeded';
      rawStatus = 'Terminated due to timeout';
    } else if (text.includes('Compilation error') || text.includes('Compile Error')) {
      detectedStatus = 'Compilation Error';
      rawStatus = 'Compilation error';
    } else if (text.includes('Runtime Error')) {
      detectedStatus = 'Runtime Error';
      rawStatus = 'Runtime Error';
    }

    if (!detectedStatus) return;

    const now = Date.now();
    if (this.lastTerminalStatus === detectedStatus && now - this.lastDetectionTime < 5000) {
      return;
    }
    if (now - this.lastDetectionTime < 3000) {
      return;
    }
    this.lastDetectionTime = now;
    this.lastTerminalStatus = detectedStatus;

    // Test cases count: find all "Test case \d+"
    const testCasesMatches = text.match(/Test case \d+/gi);
    const totalTestCases = testCasesMatches ? testCasesMatches.length : undefined;
    const testCasesPassed = detectedStatus === 'Accepted' ? totalTestCases : undefined;

    console.log(`[HackerRankAdapter] Result detected via DOM: ${detectedStatus} (testcases: ${testCasesPassed}/${totalTestCases})`);

    if (this.onResultCallback) {
      this.onResultCallback({
        status: detectedStatus,
        rawStatus,
        testCasesPassed,
        totalTestCases,
        timestamp: now,
      });
    }
  }

  detectSubmitAction(onSubmit: (s: SubmitEvidence) => void): void {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('button, [role="button"], a');
      if (!target) return;

      const text = target.textContent?.trim().toLowerCase() || '';
      const isSubmit =
        target.classList.contains('hr-monaco-submit') ||
        target.getAttribute('data-analytics') === 'SubmitCode' ||
        target.closest('.challenge-submit-btn') != null ||
        text === 'submit code' ||
        text.includes('submit code');

      if (isSubmit) {
        console.log('[HackerRankAdapter] Submit button clicked via delegation');
        this.lastTerminalStatus = null;
        this.lastDetectionTime = 0;
        onSubmit({
          trigger: 'button_click',
          timestamp: Date.now(),
        });
      }
    };

    document.addEventListener('click', handleClick, true);
    this.submitButtonListeners.push(() => document.removeEventListener('click', handleClick, true));

    // Hotkey detection (Ctrl+Enter / Cmd+Enter)
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        console.log('[HackerRankAdapter] Submit hotkey detected (Ctrl+Enter)');
        this.lastTerminalStatus = null;
        this.lastDetectionTime = 0;
        onSubmit({
          trigger: 'hotkey',
          timestamp: Date.now(),
        });
      }
    };
    document.addEventListener('keydown', handleKeydown, true);
    this.submitButtonListeners.push(() => document.removeEventListener('keydown', handleKeydown, true));
  }

  detectLanguage(codeSnippet?: string): string {
    const selectors = [
      '.hr-monaco-editor-language-select .select2-choice',
      '.language-selector .select2-chosen',
      '[data-key="language"] .select2-chosen',
      'select[name="language"] option:checked',
      '.CodeMirror + .language-name',
      '.select-language .select2-chosen',
      '[class*="language-select"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) {
        const lang = this.normalizeLanguage(el.textContent.trim());
        if (lang) return lang;
      }
    }

    if (codeSnippet) {
      if (codeSnippet.includes('def ') || codeSnippet.includes('import sys') || codeSnippet.includes('print(')) return 'python3';
      if (codeSnippet.includes('#include') || codeSnippet.includes('std::') || codeSnippet.includes('cout <<')) return 'cpp';
      if (codeSnippet.includes('public class') || codeSnippet.includes('System.out')) return 'java';
      if (codeSnippet.includes('package main') || codeSnippet.includes('func main()')) return 'go';
    }

    return 'python3';
  }

  normalizeLanguage(rawLang: string): string {
    return rawLang.toLowerCase().trim().replace(/\s+/g, '');
  }

  normalizeStatus(rawStatus: string): SubmissionStatus {
    const map: Record<string, SubmissionStatus> = {
      'accepted': 'Accepted',
      'pass': 'Accepted',
      'wrong answer': 'Wrong Answer',
      'time limit exceeded': 'Time Limit Exceeded',
      'memory limit exceeded': 'Memory Limit Exceeded',
      'runtime error': 'Runtime Error',
      'signal': 'Runtime Error',
      'compilation error': 'Compilation Error',
      'compile error': 'Compilation Error',
      'output limit exceeded': 'Runtime Error',
      'internal error': 'Runtime Error',
      'failed': 'Wrong Answer',
    };
    return map[rawStatus.toLowerCase().trim()] || 'Wrong Answer';
  }
}
