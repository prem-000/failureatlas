import {
  SubmissionEvent,
  CodeDiff,
  ProblemMetadata,
  SubmissionStatus,
  ProblemDifficulty
} from './types';

// Track last-sent event & cached code on window to persist across DOM changes
interface CustomWindow extends Window {
  __fa_lastSentKey?: string;
  __fa_lastSentTime?: number;
  __fa_cachedCode?: string;  // ✅ NEW: Cache code before submission
}
const customWindow = window as unknown as CustomWindow;

// ─── Problem Metadata Extractor ──────────────────────────────────────────────
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

  extractAll(): ProblemMetadata {
    return {
      slug: this.extractSlugFromUrl(),
      title: this.extractTitle(),
      difficulty: this.extractDifficulty(),
      topics: this.extractTopics(),
      url: window.location.href
    };
  }
}

// ─── Code Editor Handler ──────────────────────────────────────────────────────
class CodeEditorHandler {
  private cachedCode = '';
  private monitorInterval: number | null = null;

  /**
   * ✅ KEY FIX: Continuously monitor and cache the code
   * This ensures we always have the latest code available
   */
  startCaching(): void {
    if (this.monitorInterval !== null) return;

    // Capture code immediately
    this.updateCache();

    // Update cache every 2 seconds (before user submits)
    this.monitorInterval = window.setInterval(() => {
      this.updateCache();
    }, 2000);

    console.log('[FailureAtlas] Code caching started');
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
      // Also cache on window for persistence across navigation
      customWindow.__fa_cachedCode = code;
    }
  }

  /**
   * Extract code from Monaco or textarea
   * This is called frequently to keep cache fresh
   */
  private extractCode(): string {
    // Try Monaco API (highest priority - most reliable)
    try {
      const monacoModel = (window as any)?.monaco?.editor?.getModels?.()[0];
      if (monacoModel) {
        const value = monacoModel.getValue();
        if (value && value.length > 10) {
          return value;
        }
      }
    } catch (e) {
      // Monaco not ready, fall through
    }

    // Try Monaco DOM lines
    try {
      const lines = document.querySelectorAll('.monaco-editor .view-line');
      if (lines.length > 0) {
        const code = Array.from(lines)
          .map(line => line.textContent || '')
          .join('\n');
        if (code && code.length > 10) {
          return code;
        }
      }
    } catch (e) {
      // Fall through
    }

    // Try textarea elements (various selectors)
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
      } catch (e) {
        // Continue to next selector
      }
    }

    // Last resort: try finding any contenteditable div with code
    try {
      const contentEditable = document.querySelector('[contenteditable="true"]');
      if (contentEditable) {
        const code = contentEditable.textContent || '';
        if (code && code.length > 10) {
          return code;
        }
      }
    } catch (e) {
      // Fall through
    }

    return '';
  }

  /**
   * Get cached code - use this when building submission event
   */
  getCachedCode(): string {
    // First try the instance cache
    if (this.cachedCode && this.cachedCode.length > 10) {
      return this.cachedCode;
    }
    // Fall back to window cache
    if (customWindow.__fa_cachedCode && customWindow.__fa_cachedCode.length > 10) {
      return customWindow.__fa_cachedCode;
    }
    return '';
  }

  /**
   * Public method to update cache immediately (called on submit button click)
   */
  updateCacheNow(): void {
    this.updateCache();
  }

  reset(): void {
    this.stopCaching();
    this.cachedCode = '';
    customWindow.__fa_cachedCode = '';
  }
}

// ─── Code Evolution Tracker ──────────────────────────────────────────────────
interface CodeSnapshot {
  timestamp: number;
  code: string;
  lineCount: number;
  charCount: number;
}

class CodeEvolutionTracker {
  private codeHistory: CodeSnapshot[] = [];
  private lastCode = '';

  captureSnapshot(code: string): void {
    if (!code || code === this.lastCode || code.length < 10) return;

    this.codeHistory.push({
      timestamp: Date.now(),
      code: code,
      lineCount: code.split('\n').length,
      charCount: code.length
    });

    // Keep only last 20 snapshots
    if (this.codeHistory.length > 20) this.codeHistory.shift();
    this.lastCode = code;
  }

  computeDiff(oldCode: string, newCode: string): CodeDiff {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    return {
      timestamp: Date.now(),
      additions: newLines.filter(line => !oldLines.includes(line)),
      deletions: oldLines.filter(line => !newLines.includes(line)),
      lineCount: newLines.length,
      charCount: newCode.length
    };
  }

  getEvolution(): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    for (let i = 1; i < this.codeHistory.length; i++) {
      diffs.push(this.computeDiff(this.codeHistory[i - 1].code, this.codeHistory[i].code));
    }
    return diffs.slice(-5);
  }

  reset(): void {
    this.codeHistory = [];
    this.lastCode = '';
  }
}

// ─── Submission Monitor ──────────────────────────────────────────────────────
interface DetectedResult {
  status: SubmissionStatus;
  runtime?: number;
  memory?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  failedTestCase?: string;
}

class SubmissionMonitor {
  private observer: MutationObserver | null = null;
  private onDetectedCallback: (result: DetectedResult) => void;
  private lastDetectionTime = 0;

  constructor(onDetected: (result: DetectedResult) => void) {
    this.onDetectedCallback = onDetected;
  }

  private parseSubmissionResult(node: Node): DetectedResult | null {
    const container = node instanceof Element ? node : document.body;

    // ✅ IMPROVED: More comprehensive status detection
    const statusSelectors = [
      '[data-cy="submission-result"]',
      'h3',  // Status text in h3 on result page
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
      } catch (e) {
        // Continue
      }
    }

    if (!statusText) return null;

    const status = this.normalizeStatus(statusText);
    if (!status) return null;

    // Dedup: don't fire twice within 3 seconds for same status
    const now = Date.now();
    if (now - this.lastDetectionTime < 3000) {
      return null;
    }
    this.lastDetectionTime = now;

    // Extract metrics from page text
    const bodyText = document.body.innerText || '';

    let runtime: number | undefined;
    let memory: number | undefined;
    let testCasesPassed: number | undefined;
    let totalTestCases: number | undefined;

    // "0 ms"
    const runtimeMatch = bodyText.match(/(\d+)\s*ms/i);
    if (runtimeMatch) runtime = parseInt(runtimeMatch[1], 10);

    // "12.98 MB"
    const memMatch = bodyText.match(/([\d.]+)\s*MB/i);
    if (memMatch) memory = parseFloat(memMatch[1]);

    // "54 / 57 testcases passed"
    const testMatch = bodyText.match(/(\d+)\s*\/\s*(\d+)\s+test\s*cases?\s+passed/i);
    if (testMatch) {
      testCasesPassed = parseInt(testMatch[1], 10);
      totalTestCases = parseInt(testMatch[2], 10);
    }

    return {
      status,
      runtime: runtime !== undefined && !isNaN(runtime) ? runtime : undefined,
      memory: memory !== undefined && !isNaN(memory) ? memory : undefined,
      testCasesPassed,
      totalTestCases,
      failedTestCase: undefined
    };
  }

  private normalizeStatus(text: string): SubmissionStatus | null {
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
      '.result-container',
      '#result_container'
    ];

    let target: Node = document.body;
    for (const sel of containerSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        target = el;
        break;
      }
    }

    this.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        // Check added nodes
        for (const node of Array.from(mutation.addedNodes)) {
          const result = this.parseSubmissionResult(node);
          if (result) {
            this.onDetectedCallback(result);
            return;
          }
        }
        // Check modified attributes
        if (mutation.type === 'attributes') {
          const result = this.parseSubmissionResult(mutation.target);
          if (result) {
            this.onDetectedCallback(result);
            return;
          }
        }
      }
    });

    this.observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-status']
    });

    console.log('[FailureAtlas] Result observer attached');
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// ─── FailureAtlasCollector (Orchestrator) ────────────────────────────────────
class FailureAtlasCollector {
  private metadataExtractor = new ProblemMetadataExtractor();
  private codeEditor = new CodeEditorHandler();  // ✅ NEW
  private evolutionTracker = new CodeEvolutionTracker();
  private submissionMonitor = new SubmissionMonitor(res => this.onResultDetected(res));

  private sessionId = crypto.randomUUID();
  private attemptCount = 0;
  private startTime = Date.now();
  private lastSubmissionTime = 0;
  private isActive = false;
  private currentProblem: ProblemMetadata | null = null;
  private submitListenerAttached = false;

  activate(): void {
    const slug = this.metadataExtractor.extractSlugFromUrl();
    if (!slug) {
      this.isActive = false;
      this.submissionMonitor.disconnect();
      this.codeEditor.stopCaching();
      return;
    }

    // Reset per-problem state
    const isNewProblem = this.currentProblem?.slug !== slug;
    if (isNewProblem) {
      this.attemptCount = 0;
      this.startTime = Date.now();
      this.lastSubmissionTime = 0;
      this.evolutionTracker.reset();
      this.codeEditor.reset();
    }

    this.isActive = true;
    this.currentProblem = this.metadataExtractor.extractAll();

    // ✅ KEY: Start caching code immediately
    this.codeEditor.startCaching();
    this.submissionMonitor.attach();
    this.attachSubmitButtonListener();

    console.log(`[FailureAtlas] Activated for problem: ${slug}`);
  }

  private extractLanguage(): string {
    const selectors = [
      '[data-cy="lang-select"] .ant-select-selection-item',
      '.lang-select .ant-select-selection-item',
      'button[id*="headlessui-listbox-button"]',
      '[class*="lang"] button'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim().toLowerCase().replace(/\s+/g, '');
      }
    }
    return 'python3';
  }

  private attachSubmitButtonListener(): void {
    if (this.submitListenerAttached) return;
    this.submitListenerAttached = true;

    document.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      if (!target) return;

      const isSubmit =
        target.closest('[data-cy="submit-code-btn"]') ||
        target.closest('[data-e2e-locator="console-submit-button"]') ||
        target.closest('button[class*="submit"]') ||
        (target.tagName === 'BUTTON' && target.textContent?.trim() === 'Submit');

      if (isSubmit) {
        console.log('[FailureAtlas] Submit button clicked — monitoring for result…');
        // Ensure we have fresh code capture before result page loads
        this.codeEditor.updateCacheNow();
        setTimeout(() => this.submissionMonitor.attach(), 500);
      }
    }, true);
  }

  private async onResultDetected(result: DetectedResult): Promise<void> {
    this.attemptCount++;
    const traceId = Math.random().toString(36).substring(2, 10).toUpperCase();

    console.log(`[TRACE ${traceId}]\nDetected`);

    // ── Retry code extraction up to 5s (10 × 500ms) ──────────────────────────
    let code = this.codeEditor.getCachedCode();
    if (!code || code.length <= 20) {
      console.log(`[TRACE ${traceId}]\nCode too short (${code?.length ?? 0} chars) or not ready. Retrying...`);
      for (let attempt = 1; attempt <= 10; attempt++) {
        await new Promise(r => setTimeout(r, 500));
        this.codeEditor.updateCacheNow();
        code = this.codeEditor.getCachedCode();
        console.log(`[TRACE ${traceId}]\nAttempt: ${attempt}\nLength retrieved: ${code?.length ?? 0}`);
        if (code && code.length > 20) {
          break;
        }
      }
    }

    const event = this.buildSubmissionEvent(result, code, traceId);

    console.log(`[TRACE ${traceId}]\nPayload Created`);

    // ── Deduplication ─────────────────────────────────────────────────────────
    const dedupKey = `${event.problemSlug}-${event.submissionStatus}-${event.attemptNumber}`;
    const now = Date.now();
    if (
      customWindow.__fa_lastSentKey === dedupKey &&
      now - (customWindow.__fa_lastSentTime || 0) < 5000
    ) {
      console.log(`[TRACE ${traceId}]\nFailure Reason: Duplicate submission within 5 seconds`);
      return;
    }
    customWindow.__fa_lastSentKey = dedupKey;
    customWindow.__fa_lastSentTime = now;

    console.log(`[TRACE ${traceId}]\nSending To Background`);
    this.sendToBackground(event, traceId);
    this.lastSubmissionTime = now;
  }

  private buildSubmissionEvent(result: DetectedResult, preExtractedCode: string, traceId: string): SubmissionEvent {
    const meta = this.currentProblem || this.metadataExtractor.extractAll();
    const code = (preExtractedCode && preExtractedCode.length >= 20)
      ? preExtractedCode
      : this.codeEditor.getCachedCode();
    const language = this.extractLanguage();
    const now = Date.now();
    const timeSinceLastSubmit = this.lastSubmissionTime > 0 ? now - this.lastSubmissionTime : 0;

    if (code && code.length > 20) {
      this.evolutionTracker.captureSnapshot(code);
    }

    return {
      eventId: crypto.randomUUID(),
      submissionTraceId: traceId,
      sessionId: this.sessionId,
      userId: '',
      timestamp: now,
      problemSlug: meta.slug,
      problemTitle: meta.title,
      problemDifficulty: meta.difficulty,
      problemTopics: meta.topics,
      problemUrl: meta.url,
      submissionStatus: result.status,
      submissionLanguage: language,
      submissionCode: code,
      runtime: result.runtime,
      memory: result.memory,
      testCasesPassed: result.testCasesPassed,
      totalTestCases: result.totalTestCases,
      failedTestCase: result.failedTestCase,
      timeSpent: now - this.startTime,
      attemptNumber: this.attemptCount,
      rapidSubmission: timeSinceLastSubmit > 0 && timeSinceLastSubmit < 30000,
      codeEvolution: this.evolutionTracker.getEvolution(),
    };
  }

  private sendToBackground(event: SubmissionEvent, traceId: string): void {
    chrome.runtime.sendMessage(
      { type: 'SUBMISSION_EVENT', data: event },
      (response: any) => {
        if (chrome.runtime.lastError) {
          console.error(`[TRACE ${traceId}]\nFailure Reason: ${chrome.runtime.lastError.message}`);
          return;
        }
        if (response?.success) {
          console.log(`[TRACE ${traceId}]\nStored Successfully`);
          this.showToast(event.submissionStatus, true);
        } else {
          console.error(`[TRACE ${traceId}]\nFailure Reason: ${response?.error}`);
          this.showToast(event.submissionStatus, false);
        }
      }
    );
  }

  private showToast(status: SubmissionStatus, success: boolean): void {
    const existing = document.getElementById('fa-toast');
    if (existing) existing.remove();

    const isAccepted = status === 'Accepted';
    const toast = document.createElement('div');
    toast.id = 'fa-toast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 999999;
      padding: 10px 16px; border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px; font-weight: 600; color: #fff;
      background: ${isAccepted ? 'rgba(34,197,94,0.92)' : 'rgba(255,95,82,0.92)'};
      backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      display: flex; align-items: center; gap: 8px;
      animation: fa-slide-in 0.3s ease;
    `;
    toast.innerHTML = `
      <style>@keyframes fa-slide-in { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }</style>
      <span style="font-size:16px">${success ? '✅' : '📊'}</span>
      <span>FailureAtlas ${success ? 'captured' : 'queued'}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast?.remove(), 3500);
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const collector = new FailureAtlasCollector();

function activate() {
  collector.activate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', activate);
} else {
  activate();
}

// ─── SPA Navigation ───────────────────────────────────────────────────────────
const originalPushState = history.pushState.bind(history);
history.pushState = (...args: Parameters<typeof history.pushState>) => {
  originalPushState(...args);
  window.dispatchEvent(new Event('locationchange'));
};

const originalReplaceState = history.replaceState.bind(history);
history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
  originalReplaceState(...args);
  window.dispatchEvent(new Event('locationchange'));
};

window.addEventListener('locationchange', () => setTimeout(activate, 1000));
window.addEventListener('popstate', () => setTimeout(activate, 1000));

// ─── Message Handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ pong: true });
  }
  return false;
});