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
import { LifecycleManager } from '../../state/lifecycle-manager';

export class GFGAdapter extends PlatformAdapter {
  readonly platform: Platform = 'geeksforgeeks';

  private resultObserver: MutationObserver | null = null;
  private submitButtonListeners: Array<() => void> = [];
  private onResultCallback: ((r: ResultEvidence) => void) | null = null;
  private lastTerminalStatus: SubmissionStatus | null = null;
  private lastDetectionTime = 0;

  matches(url: string): boolean {
    return url.includes('geeksforgeeks.org') && url.includes('/problems/');
  }

  async initialize(_context: AdapterContext): Promise<void> {
    console.log('[GFGAdapter] Initializing on:', window.location.href);
    this.lastTerminalStatus = null;
    this.lastDetectionTime = 0;
  }

  async cleanup(): Promise<void> {
    console.log('[GFGAdapter] Cleaning up');
    if (this.resultObserver) {
      this.resultObserver.disconnect();
      this.resultObserver = null;
    }
    this.submitButtonListeners.forEach(cleanup => cleanup());
    this.submitButtonListeners = [];
    this.lastTerminalStatus = null;
  }

  /**
   * Verified Ace editor access.
   * Prototype verified targets: #ace-editor, .ace_editor, textarea.ace_text-input.
   * Does NOT assume ace.edit("editor").
   */
  captureEditor(): EditorEvidence | null {
    const code = this.extractCode();
    if (!code || code.trim().length <= 10) return null;

    return {
      code,
      language: this.detectLanguage(),
      source: 'ace',
      timestamp: Date.now(),
    };
  }

  private extractCode(): string {
    // 1. Try env.editor on verified .ace_editor or #ace-editor element
    try {
      const aceContainer = document.querySelector('#ace-editor, .ace_editor') as any;
      if (aceContainer?.env?.editor?.getValue) {
        const val = aceContainer.env.editor.getValue();
        if (val && val.trim().length > 10) return val;
      }
    } catch (e) {}

    // 2. Try reading Ace editor line rows from DOM
    try {
      const lines = document.querySelectorAll('.ace_editor .ace_line, #ace-editor .ace_line');
      if (lines.length > 0) {
        const val = Array.from(lines).map(l => l.textContent || '').join('\n');
        if (val.trim().length > 10) return val;
      }
    } catch (e) {}

    // 3. Try verified textarea.ace_text-input
    try {
      const aceInput = document.querySelector('textarea.ace_text-input') as HTMLTextAreaElement | null;
      if (aceInput?.value && aceInput.value.trim().length > 10) {
        return aceInput.value;
      }
    } catch (e) {}

    // 4. Monaco editor lines fallback (some GFG views embed Monaco)
    try {
      const monacoLines = document.querySelectorAll('.monaco-editor .view-line');
      if (monacoLines.length > 0) {
        const val = Array.from(monacoLines).map(l => l.textContent || '').join('\n');
        if (val.trim().length > 10) return val;
      }
    } catch (e) {}

    // 5. Fallback: any standard code textarea
    try {
      const textarea = document.querySelector('.ace_editor textarea, #ace-editor textarea, textarea') as HTMLTextAreaElement | null;
      if (textarea?.value && textarea.value.trim().length > 10) {
        return textarea.value;
      }
    } catch (e) {}

    return '';
  }

  /**
   * Problem identity:
   * URL slug -> reliable identity
   * DOM title -> optional title
   * formatted slug -> fallback only
   */
  captureProblem(): ProblemEvidence {
    const slug = this.extractSlugFromUrl();
    const title = this.extractTitle(slug);

    return {
      platform: 'geeksforgeeks',
      slug,
      title,
      url: window.location.href, // Actual current page URL
    };
  }

  private extractSlugFromUrl(): string {
    const m = window.location.pathname.match(/\/problems\/([^/]+)/);
    return m ? m[1] : '';
  }

  private extractTitle(slug: string): string | undefined {
    // Optional DOM title query without hardcoded assumption
    const selectors = [
      '.problems_header_content__title h3',
      '.problems_header_content__title',
      '.problem-header h3',
      '.g-m-0',
      'h1',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    }
    // Fallback to formatted slug only if DOM title is absent
    return slug
      ? slug.replace(/[-_0-9]+$/g, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : undefined;
  }

  startNetworkCapture(_onEvidence: (e: NetworkEvidence) => void): void {
    // Interceptor hooks if active
  }

  startResultMonitor(onResult: (r: ResultEvidence) => void): void {
    this.onResultCallback = onResult;

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

    // Check for explicit verdict markers in GFG output window
    let detectedStatus: SubmissionStatus | null = null;
    let rawStatus = '';

    if (
      text.includes('Problem Solved Successfully') ||
      text.includes('Correct Answer')
    ) {
      detectedStatus = 'Accepted';
      rawStatus = 'Problem Solved Successfully';
    } else if (text.includes('Wrong Answer')) {
      detectedStatus = 'Wrong Answer';
      rawStatus = 'Wrong Answer';
    } else if (text.includes('Time Limit Exceeded')) {
      detectedStatus = 'Time Limit Exceeded';
      rawStatus = 'Time Limit Exceeded';
    } else if (text.includes('Compilation Error') || (text.includes('Compilation Results') && text.includes('error:'))) {
      detectedStatus = 'Compilation Error';
      rawStatus = 'Compilation Error';
    } else if (text.includes('Runtime Error')) {
      detectedStatus = 'Runtime Error';
      rawStatus = 'Runtime Error';
    }

    if (!detectedStatus) return;

    // Prevent immediate re-firing if already reported
    const now = Date.now();
    if (this.lastTerminalStatus === detectedStatus && now - this.lastDetectionTime < 5000) {
      return;
    }
    if (now - this.lastDetectionTime < 3000) {
      return;
    }
    this.lastDetectionTime = now;
    this.lastTerminalStatus = detectedStatus;

    // Extract runtime/memory metrics if present
    let runtime: number | undefined;
    let memory: number | undefined;

    const timeMatch = text.match(/Time\s*Taken\D*([\d.]+)/i);
    if (timeMatch) {
      runtime = Math.round(parseFloat(timeMatch[1]) * 1000); // sec to ms
    }

    const testCasesMatch = text.match(/Test\s*Cases\s*Passed\D*(\d+)\s*\/\s*(\d+)/i);
    let testCasesPassed: number | undefined;
    let totalTestCases: number | undefined;
    if (testCasesMatch) {
      testCasesPassed = parseInt(testCasesMatch[1], 10);
      totalTestCases = parseInt(testCasesMatch[2], 10);
    }

    console.log(`[GFGAdapter] Result detected: ${detectedStatus} (runtime: ${runtime}ms, testcases: ${testCasesPassed}/${totalTestCases})`);

    if (this.onResultCallback) {
      this.onResultCallback({
        status: detectedStatus,
        rawStatus,
        runtime,
        memory,
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
        target.classList.contains('problems_submit_button') ||
        target.getAttribute('data-track') === 'submit_button' ||
        text === 'submit' ||
        text.startsWith('submit ');

      if (isSubmit) {
        console.log('[GFGAdapter] Submit button clicked via delegation');
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
        console.log('[GFGAdapter] Submit hotkey detected (Ctrl+Enter)');
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

  detectLanguage(): string {
    const selectors = [
      '.select-language .selected',
      '.language-selector option:checked',
      '[class*="language-select"]',
      '.ant-select-selection-item',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) {
        return this.normalizeLanguage(el.textContent.trim());
      }
    }
    return 'cpp';
  }

  normalizeLanguage(rawLang: string): string {
    return rawLang.toLowerCase().trim().replace(/\s+/g, '');
  }

  normalizeStatus(rawStatus: string): SubmissionStatus {
    const { status } = LifecycleManager.normalizeRawVerdict(rawStatus);
    return status || 'Wrong Answer';
  }
}
