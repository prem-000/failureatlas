/**
 * HackerRank Platform Adapter
 *
 * Implements the PlatformAdapter interface for HackerRank.
 * Submission capture is event-driven through the network interceptor.
 * normalize() is the single normalization point — no field mapping elsewhere.
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  RawSubmission,
  EditorSnapshot,
  ProblemMetadata,
  NormalizedSubmission,
} from '@/types/platform-adapter';

/**
 * Shape of the raw payload assembled from the HackerRank network interceptor
 * plus editor snapshot and metadata, before normalization.
 */
export interface HackerRankRawSubmission extends RawSubmission {
  submissionId: string | null;
  /** Raw JSON from the polling endpoint */
  result: {
    model?: {
      id?: number | string;
      status?: string;
      language?: string;
      /** Execution time in seconds (number or string) */
      time?: number | string;
      /** Memory in KB (number or string) */
      memory?: number | string;
      /** Per-test-case results: 1 = pass, 0 = fail */
      testcase_status?: Array<number | string>;
      /** Total test cases attempted */
      testcases_count?: number;
      /** Compile / stderr message */
      compile_message?: string;
      stderr?: string;
      /** Code string as stored by HackerRank (may be absent) */
      code?: string;
    };
    [key: string]: unknown;
  };
  problemSlug: string;
  title: string;
  /** Code from Monaco editor snapshot */
  code: string;
  language: string;
  timestamp: number;
}

export class HackerRankAdapter implements PlatformAdapter {
  readonly platformId = 'hackerrank' as const;
  readonly platformName = 'HackerRank';

  detect(location?: Location | { hostname: string; href: string }): boolean {
    const loc = location || (typeof window !== 'undefined' ? window.location : null);
    if (!loc) return false;
    return loc.hostname.includes('hackerrank.com');
  }

  /**
   * Event-driven — capture happens through the network interceptor.
   */
  async captureSubmission(): Promise<RawSubmission> {
    throw new Error(
      'HackerRankAdapter.captureSubmission() is event-driven via network interceptor'
    );
  }

  /**
   * Reads code from Monaco editor. Falls back to textarea.
   * No polling — single synchronous read.
   */
  async captureEditor(): Promise<EditorSnapshot> {
    if (typeof window === 'undefined') {
      throw new Error('captureEditor() requires browser context');
    }

    const code = this.extractCode();
    return {
      code,
      language: this.detectLanguage(),
      timestamp: Date.now(),
    };
  }

  /**
   * Extracts problem metadata from the HackerRank DOM.
   */
  async captureMetadata(): Promise<ProblemMetadata> {
    if (typeof window === 'undefined') {
      throw new Error('captureMetadata() requires browser context');
    }
    const slug = this.extractSlugFromUrl(window.location.href);
    return {
      slug,
      title: this.extractTitle(),
      difficulty: this.extractDifficulty(),
      topics: this.extractTopics(),
      url: window.location.href,
    };
  }

  /**
   * Single normalization point: converts HackerRank raw payload → NormalizedSubmission.
   */
  normalize(raw: RawSubmission): NormalizedSubmission {
    const hrRaw = raw as HackerRankRawSubmission;
    const model = hrRaw.result?.model ?? {};

    // ── Status ────────────────────────────────────────────────────────────────
    const rawStatus = model.status || 'Wrong Answer';
    const status = this.normalizeStatus(rawStatus);

    // ── Runtime ───────────────────────────────────────────────────────────────
    // HackerRank returns time in seconds (float string or number)
    let runtime: number | null = null;
    if (model.time != null) {
      const t = parseFloat(String(model.time));
      if (!isNaN(t)) runtime = Math.round(t * 1000); // seconds → ms
    }

    // ── Memory ────────────────────────────────────────────────────────────────
    // HackerRank returns memory in KB
    let memory: number | null = null;
    if (model.memory != null) {
      const m = parseFloat(String(model.memory));
      if (!isNaN(m)) memory = m / 1024; // KB → MB
    }

    // ── Test cases ────────────────────────────────────────────────────────────
    const tcStatus = model.testcase_status ?? [];
    const totalTestCases = model.testcases_count ?? tcStatus.length ?? null;
    const testCasesPassed = tcStatus.length > 0
      ? tcStatus.filter(s => String(s) === '1' || s === 1).length
      : null;

    // ── Failed test case ─────────────────────────────────────────────────────
    let failedTestCase: string | null = null;
    const failedIdx = tcStatus.findIndex(s => String(s) !== '1' && s !== 1);
    if (failedIdx !== -1) {
      failedTestCase = JSON.stringify({ testCaseIndex: failedIdx });
    }
    if (!failedTestCase && model.compile_message) {
      failedTestCase = JSON.stringify({ compile_message: model.compile_message });
    }
    if (!failedTestCase && model.stderr) {
      failedTestCase = JSON.stringify({ stderr: model.stderr });
    }

    // ── Language ─────────────────────────────────────────────────────────────
    const language = hrRaw.language || model.language || 'python3';

    return {
      version: 1,
      platform: 'hackerrank',
      externalSubmissionId: hrRaw.submissionId ?? String(model.id ?? '') ?? null,
      problemId: hrRaw.problemSlug,
      title: hrRaw.title,
      language,
      code: hrRaw.code,
      status,
      runtime,
      memory,
      timestamp: new Date(hrRaw.timestamp).toISOString(),
      testCasesPassed: testCasesPassed ?? (totalTestCases != null ? (status === 'Accepted' ? totalTestCases : 0) : null),
      totalTestCases: typeof totalTestCases === 'number' ? totalTestCases : null,
      failedTestCase,
    };
  }

  capabilities(): PlatformCapabilities {
    return {
      runtime: 'available',
      memory: 'available',
      submissionId: 'available',
      testcases: 'available',
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  extractCode(): string {
    // 1. Monaco API (HackerRank migrated from Ace to Monaco)
    try {
      const monacoModel = (window as any)?.monaco?.editor?.getModels?.()[0];
      if (monacoModel) {
        const val = monacoModel.getValue();
        if (val && val.trim().length > 0) return val;
      }
    } catch (e) {}

    // 2. Monaco DOM lines
    try {
      const lines = document.querySelectorAll('.monaco-editor .view-line');
      if (lines.length > 0) {
        const val = Array.from(lines).map(l => l.textContent || '').join('\n');
        if (val.trim().length > 0) return val;
      }
    } catch (e) {}

    // 3. Ace Editor (legacy fallback)
    try {
      const aceEl = document.querySelector('.ace_editor') as any;
      if (aceEl?.env?.editor) {
        const val = aceEl.env.editor.getValue();
        if (val && val.trim().length > 0) return val;
      }
    } catch (e) {}

    // 4. CodeMirror
    try {
      const cmContent = document.querySelector('.cm-content');
      if (cmContent) {
        const val = cmContent.textContent || '';
        if (val.trim().length > 0) return val;
      }
    } catch (e) {}

    // 5. Textarea fallback
    const selectors = [
      'textarea.inputarea',
      '.monaco-editor textarea',
      '.ace_text-input',
      '#code textarea',
      'textarea',
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel) as HTMLTextAreaElement;
        if (el?.value && el.value.trim().length > 0) return el.value;
      } catch (e) {}
    }

    return '';
  }

  detectLanguage(): string {
    // 1. Monaco editor language ID
    try {
      const model = (window as any)?.monaco?.editor?.getModels?.()[0];
      if (model) {
        const lang = model.getLanguageId?.();
        if (lang) return lang;
      }
    } catch (e) {}

    // 2. DOM selectors for language picker
    const selectors = [
      '.hr-monaco-editor-language-select .select2-choice',
      '.language-selector .select2-chosen',
      '[data-key="language"] .select2-chosen',
      'select[name="language"] option:checked',
      '.CodeMirror + .language-name',
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) return el.textContent.trim().toLowerCase();
      } catch (e) {}
    }

    return 'python3';
  }

  private extractSlugFromUrl(url: string): string {
    const m = url.match(/\/challenges\/([^/]+)/);
    return m ? m[1] : '';
  }

  private extractTitle(): string {
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
    const slug = this.extractSlugFromUrl(window.location.href);
    return slug
      ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Unknown Problem';
  }

  private extractDifficulty(): 'Easy' | 'Medium' | 'Hard' {
    const selectors = [
      '[class*="difficulty"]',
      '.difficulty-chip',
      '.challenge-difficulty',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = (el.textContent || '').toLowerCase();
        if (text.includes('easy')) return 'Easy';
        if (text.includes('medium')) return 'Medium';
        if (text.includes('hard')) return 'Hard';
      }
    }
    return 'Medium';
  }

  private extractTopics(): string[] {
    const topics: string[] = [];
    document
      .querySelectorAll('[class*="tag"], [class*="skill"], a[href*="/domains/"]')
      .forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 40 && !topics.includes(text)) {
          topics.push(text);
        }
      });
    return topics;
  }

  private normalizeStatus(status: string): string {
    const map: Record<string, string> = {
      'accepted': 'Accepted',
      'pass': 'Accepted',
      'wrong answer': 'Wrong Answer',
      'time limit exceeded': 'Time Limit Exceeded',
      'memory limit exceeded': 'Memory Limit Exceeded',
      'runtime error': 'Runtime Error',
      'signal': 'Runtime Error',
      'compilation error': 'Compilation Error',
      'output limit exceeded': 'Runtime Error',
      'internal error': 'Runtime Error',
      'failed': 'Wrong Answer',
    };
    return map[status.toLowerCase().trim()] || status;
  }
}
