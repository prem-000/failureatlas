/**
 * Take U Forward (TUF) Platform Adapter
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  RawSubmission,
  EditorSnapshot,
  ProblemMetadata,
  NormalizedSubmission,
} from '@/types/platform-adapter';
import { TUFEditorHook } from './editor-hook';

export interface TUFRawSubmission extends RawSubmission {
  submissionId: string | null;
  result: {
    success: boolean;
    data: {
      completed: boolean;
      submission_status?: Array<{
        status: string;
        user_output?: string;
        expected_output?: string;
        error_message?: string;
      }>;
      message?: string;
      time?: string; // seconds
      memory?: string; // memory text, e.g., "9.12 KiB"
      language?: string;
    };
  };
  problemSlug: string;
  title: string;
  code: string;
  timestamp: number;
}

export class TakeUForwardAdapter implements PlatformAdapter {
  readonly platformId = 'takeuforward' as const;
  readonly platformName = 'Take U Forward';

  detect(location?: Location | { hostname: string; href: string }): boolean {
    const loc = location || (typeof window !== 'undefined' ? window.location : null);
    if (!loc) return false;
    return loc.hostname.includes('takeuforward.org');
  }

  async captureSubmission(): Promise<RawSubmission> {
    throw new Error('TakeUForward adapter: captureSubmission() is event-driven via network interceptor');
  }

  async captureEditor(): Promise<EditorSnapshot> {
    if (typeof window === 'undefined') {
      throw new Error('captureEditor() requires browser context');
    }
    const hook = new TUFEditorHook();
    hook.updateNow();
    return hook.getSnapshot();
  }

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

  normalize(raw: RawSubmission): NormalizedSubmission {
    const tufRaw = raw as TUFRawSubmission;
    const data = tufRaw.result.data;
    const statusList = data.submission_status || [];

    // Overall status/verdict is the first failing status, or Accepted if all passed
    let rawStatus = 'Accepted';
    const failedCase = statusList.find(c => c.status !== 'Accepted');
    if (failedCase) {
      rawStatus = failedCase.status;
    }

    // 1. Runtime parsing (time is in seconds as string, e.g., "0.017")
    let runtime: number | null = null;
    if (data.time) {
      const parsedTime = parseFloat(data.time);
      if (!isNaN(parsedTime)) {
        runtime = Math.round(parsedTime * 1000);
      }
    }

    // 2. Memory parsing (e.g. "9.12 KiB" or "1.2 MB")
    let memory: number | null = null;
    if (data.memory) {
      const memStr = data.memory.toLowerCase().trim();
      const val = parseFloat(memStr);
      if (!isNaN(val)) {
        if (memStr.includes('k')) {
          memory = val / 1024; // KB to MB
        } else if (memStr.includes('m')) {
          memory = val; // MB to MB
        } else if (memStr.includes('g')) {
          memory = val * 1024; // GB to MB
        } else {
          memory = val; // fallback
        }
      }
    }

    // 3. Failed test case details
    let failedTestCase: string | null = null;
    if (failedCase) {
      failedTestCase = JSON.stringify({
        status: failedCase.status,
        user_output: failedCase.user_output || '',
        expected_output: failedCase.expected_output || '',
        error_message: failedCase.error_message || '',
      });
    }

    return {
      version: 1,
      platform: 'takeuforward',
      externalSubmissionId: tufRaw.submissionId || null,
      problemId: tufRaw.problemSlug,
      title: tufRaw.title,
      language: data.language || 'python3',
      code: tufRaw.code,
      status: this.normalizeStatus(rawStatus),
      runtime,
      memory,
      timestamp: new Date(tufRaw.timestamp).toISOString(),
      testCasesPassed: statusList.filter(c => c.status === 'Accepted').length,
      totalTestCases: statusList.length,
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

  private extractSlugFromUrl(url: string): string {
    const problemMatch = url.match(/\/problems\/([^/]+)/);
    const contestMatch = url.match(/\/contest\/[^/]+\/problems\/([^/]+)/);
    const match = problemMatch || contestMatch;
    return match ? match[1] : '';
  }

  private extractTitle(): string {
    const selectors = [
      'h1',
      'h2',
      'h3',
      '.question-title',
      '[class*="title"]',
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    }
    const slug = this.extractSlugFromUrl(window.location.href);
    return slug
      ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Unknown Problem';
  }

  private extractDifficulty(): 'Easy' | 'Medium' | 'Hard' {
    const selectors = [
      '.text-difficulty-easy',
      '.text-difficulty-medium',
      '.text-difficulty-hard',
      '[class*="easy"]',
      '[class*="medium"]',
      '[class*="hard"]',
      '[class*="Easy"]',
      '[class*="Medium"]',
      '[class*="Hard"]',
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent?.trim().toLowerCase() || '';
        if (text.includes('easy')) return 'Easy';
        if (text.includes('medium')) return 'Medium';
        if (text.includes('hard')) return 'Hard';
      }
    }
    return 'Medium';
  }

  private extractTopics(): string[] {
    const topics: string[] = [];
    const elements = document.querySelectorAll('[class*="tag"], [class*="topic"], a[href*="/tag/"]');
    elements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 30 && !topics.includes(text)) {
        topics.push(text);
      }
    });
    return topics;
  }

  private normalizeStatus(status: string): string {
    const lower = status.toLowerCase().trim();
    const STATUS_MAP: Record<string, string> = {
      'accepted': 'Accepted',
      'wrong answer': 'Wrong Answer',
      'time limit exceeded': 'Time Limit Exceeded',
      'memory limit exceeded': 'Memory Limit Exceeded',
      'runtime error': 'Runtime Error',
      'compile error': 'Compilation Error',
      'compilation error': 'Compilation Error',
    };
    return STATUS_MAP[lower] || status;
  }
}
