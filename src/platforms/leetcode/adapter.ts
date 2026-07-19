/**
 * LeetCode Platform Adapter
 *
 * Implements the PlatformAdapter interface for LeetCode.
 * Normalization logic lives here — the shared pipeline never branches on platform.
 *
 * NOTE: The detect(), captureSubmission(), captureEditor(), and captureMetadata()
 * methods are designed for browser context (extension content script).
 * The normalize() method works in any context (browser or server-side).
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  RawSubmission,
  EditorSnapshot,
  ProblemMetadata,
  NormalizedSubmission,
} from '@/types/platform-adapter';
import { LEETCODE_CAPABILITIES } from './capabilities';

/**
 * Shape of a raw LeetCode submission before normalization.
 * This is what the LeetCode content script captures.
 */
export interface LeetCodeRawSubmission extends RawSubmission {
  submissionId?: string;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  url: string;
  language: string;
  code: string;
  status: string;
  runtime?: number;
  memory?: number;
  timestamp: number; // epoch ms
  testCasesPassed?: number;
  totalTestCases?: number;
  failedTestCase?: string;
}

export class LeetCodeAdapter implements PlatformAdapter {
  readonly platformId = 'leetcode' as const;
  readonly platformName = 'LeetCode';

  detect(location?: Location | { hostname: string; href: string }): boolean {
    const loc = location || (typeof window !== 'undefined' ? window.location : null);
    if (!loc) return false;
    return loc.hostname === 'leetcode.com' || loc.hostname.includes('leetcode.com');
  }

  /**
   * Capture raw submission data from LeetCode.
   * This extracts from the network interceptor response and DOM state.
   *
   * In practice, the extension's content script calls the specialized
   * extractor functions and passes the result here. This method provides
   * the adapter-layer contract.
   */
  async captureSubmission(): Promise<RawSubmission> {
    // In the extension, this is wired to the existing network interceptor
    // and DOM extraction logic. The adapter provides the contract;
    // the extension's content script supplies the implementation.
    throw new Error(
      'LeetCodeAdapter.captureSubmission() must be called from the extension content script context. ' +
      'Use the extension bridge to invoke this method.'
    );
  }

  /**
   * Capture the current editor state from LeetCode's Monaco editor.
   */
  async captureEditor(): Promise<EditorSnapshot> {
    if (typeof window === 'undefined') {
      throw new Error('captureEditor() requires browser context');
    }

    const editorEl = document.querySelector('.monaco-editor');
    const monacoInstance = (editorEl as any)?.__monacoEditor;

    const code = monacoInstance?.getValue?.() ?? '';
    const position = monacoInstance?.getPosition?.();

    // Fallback: read from view lines if Monaco instance not directly available
    const fallbackCode = Array.from(
      document.querySelectorAll('.view-line')
    ).map(el => el.textContent || '').join('\n');

    return {
      code: code || fallbackCode,
      language: this.detectLanguage(),
      cursorPosition: position ? { line: position.lineNumber, column: position.column } : undefined,
      timestamp: Date.now(),
    };
  }

  /**
   * Extract problem metadata from LeetCode's page.
   */
  async captureMetadata(): Promise<ProblemMetadata> {
    const slug = this.extractSlugFromUrl();
    return {
      slug,
      title: this.extractTitle(),
      difficulty: this.extractDifficulty(),
      topics: this.extractTopics(),
      url: window.location.href,
    };
  }

  /**
   * Convert LeetCode raw submission into the unified NormalizedSubmission schema.
   * All LeetCode-specific quirks are handled here.
   */
  normalize(raw: RawSubmission): NormalizedSubmission {
    const leetcodeRaw = raw as LeetCodeRawSubmission;

    return {
      version: 1,
      platform: 'leetcode',
      externalSubmissionId: leetcodeRaw.submissionId ?? null,
      problemId: leetcodeRaw.slug,
      title: leetcodeRaw.title,
      language: leetcodeRaw.language,
      code: leetcodeRaw.code,
      status: this.normalizeStatus(leetcodeRaw.status),
      runtime: leetcodeRaw.runtime ?? null,
      memory: leetcodeRaw.memory ?? null,
      timestamp: new Date(leetcodeRaw.timestamp).toISOString(),
      testCasesPassed: leetcodeRaw.testCasesPassed ?? null,
      totalTestCases: leetcodeRaw.totalTestCases ?? null,
      failedTestCase: leetcodeRaw.failedTestCase ?? null,
    };
  }

  /**
   * Declare LeetCode's capabilities.
   */
  capabilities(): PlatformCapabilities {
    return LEETCODE_CAPABILITIES;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private extractSlugFromUrl(): string {
    if (typeof window === 'undefined') return '';
    const contestMatch = window.location.pathname.match(/\/contest\/[^/]+\/problems\/([^/]+)/);
    const problemMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
    const match = contestMatch || problemMatch;
    return match ? match[1] : '';
  }

  private extractTitle(): string {
    if (typeof window === 'undefined') return '';
    const selectors = [
      '[data-cy="question-title"]',
      '.question-title h3',
      '.mr-2.text-label-1',
      'h1',
      '.text-title-large',
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

  private extractDifficulty(): 'Easy' | 'Medium' | 'Hard' {
    if (typeof window === 'undefined') return 'Medium';
    const selectors = [
      '.text-difficulty-easy',
      '.text-difficulty-medium',
      '.text-difficulty-hard',
      '[diff]',
      '.text-olive',
      '.text-pink',
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
    return 'Medium';
  }

  private extractTopics(): string[] {
    if (typeof window === 'undefined') return [];
    const topicEls = document.querySelectorAll(
      '.topic-tag__1jni, [class*="topic-tag"], .tag__2PqS, a[href*="/tag/"]'
    );
    const topics: string[] = [];
    topicEls.forEach(el => {
      const text = el.textContent?.trim();
      if (text && !topics.includes(text)) topics.push(text);
    });
    return topics;
  }

  private detectLanguage(): string {
    if (typeof window === 'undefined') return 'unknown';
    const langButton = document.querySelector(
      '[class*="lang-btn"], button[id*="lang"], .ant-select-selection-item'
    );
    return langButton?.textContent?.trim()?.toLowerCase() || 'python3';
  }

  /**
   * Normalize LeetCode's submission status strings to the unified format.
   */
  private normalizeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'Accepted': 'Accepted',
      'Wrong Answer': 'Wrong Answer',
      'Time Limit Exceeded': 'Time Limit Exceeded',
      'Memory Limit Exceeded': 'Memory Limit Exceeded',
      'Runtime Error': 'Runtime Error',
      'Compile Error': 'Compilation Error',
      'Compilation Error': 'Compilation Error',
      'Output Limit Exceeded': 'Runtime Error',
    };
    return statusMap[status] || status;
  }
}
