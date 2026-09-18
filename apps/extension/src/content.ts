import { PlatformRouter } from './adapters/base/router';
import { LeetCodeAdapter } from './adapters/leetcode/adapter';
import { HackerRankAdapter } from './adapters/hackerrank/adapter';
import { GFGAdapter } from './adapters/geeksforgeeks/adapter';
import { SubmissionContextManager } from './state/submission-context';
import { SnapshotBuffer } from './capture/snapshot-buffer';
import { EvidenceMerger } from './capture/evidence-merger';
import { SubmissionCorrelator } from './capture/submission-correlator';
import { DeduplicationEngine } from './state/dedup';
import { LifecycleManager } from './state/lifecycle-manager';
import type { CanonicalSubmissionEvent, ProblemEvidence } from './adapters/base/types';
import type { SubmissionStatus } from './types';

// Multi-adapter orchestrator
class PraxisCollector {
  private router = new PlatformRouter();
  private contextManager = new SubmissionContextManager();
  private snapshotBuffer = new SnapshotBuffer();
  private correlator = new SubmissionCorrelator();
  private dedupEngine = new DeduplicationEngine();

  private sessionId: string;
  private currentProblem: ProblemEvidence | null = null;
  private pollInterval: number | null = null;
  private attemptCount = 0;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();

    // Register all platform adapters
    this.router.register(new LeetCodeAdapter());
    this.router.register(new HackerRankAdapter());
    this.router.register(new GFGAdapter());
  }

  private getOrCreateSessionId(): string {
    const key = '__praxis_session_id';
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      try {
        sessionStorage.setItem(key, sid);
      } catch {}
    }
    return sid;
  }

  async activate(): Promise<void> {
    const url = window.location.href;
    const adapter = await this.router.route(url);

    if (!adapter) {
      this.stopEditorPolling();
      return;
    }

    // Capture problem evidence
    const problem = adapter.captureProblem();

    // Check if problem changed (SPA navigation)
    if (!this.currentProblem || this.currentProblem.slug !== problem.slug) {
      console.log(`[Praxis] Problem context changed: ${this.currentProblem?.slug} -> ${problem.slug}`);
      this.currentProblem = problem;
      this.snapshotBuffer.clear(); // Clear snapshot buffer so old code does not contaminate
      this.dedupEngine.reset();
      this.attemptCount = 0;
    }

    // Get or create isolated context for this tab and platform
    this.contextManager.getOrCreateContext(0, adapter.platform, problem);

    // Start editor snapshot polling (2s interval, snapshot alone never triggers submit)
    this.startEditorPolling(adapter);

    // Wire submit action detection
    try {
      adapter.detectSubmitAction((submitEvidence) => {
        console.log(`[Praxis] Submit action detected on ${adapter.platform}`);
        const snap = adapter.captureEditor();
        if (snap) {
          this.snapshotBuffer.pushSnapshot(snap.code, snap.language, snap.source);
        }
        this.contextManager.updateContext(0, adapter.platform, {
          lifecycleState: 'SUBMITTED',
          lastSubmitEvidence: submitEvidence,
        });
      });
    } catch (e) {
      console.warn(`[Praxis] Non-fatal error in detectSubmitAction on ${adapter.platform}:`, e);
    }

    // Wire result monitoring
    try {
      adapter.startResultMonitor((resultEvidence) => {
        console.log(`[Praxis] Result evidence detected on ${adapter.platform}:`, resultEvidence.status);
        this.onResultDetected(adapter.platform, resultEvidence);
      });
    } catch (e) {
      console.warn(`[Praxis] Non-fatal error in startResultMonitor on ${adapter.platform}:`, e);
    }
  }

  private startEditorPolling(adapter: any): void {
    if (this.pollInterval !== null) return;

    // Immediately capture
    const initial = adapter.captureEditor();
    if (initial) {
      this.snapshotBuffer.pushSnapshot(initial.code, initial.language, initial.source);
    }

    // Poll every 2 seconds
    this.pollInterval = window.setInterval(() => {
      const snap = adapter.captureEditor();
      if (snap) {
        this.snapshotBuffer.pushSnapshot(snap.code, snap.language, snap.source);
      }
    }, 2000);
  }

  private stopEditorPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async onResultDetected(platform: any, result: any): Promise<void> {
    const adapter = this.router.getActiveAdapter();
    if (!adapter) return;

    const ctx = this.contextManager.getContext(0, platform);
    const currentState = ctx?.lifecycleState || 'UNKNOWN';
    const currentStatus = ctx?.currentStatus;

    // Evaluate transition with terminal status protection (prevents downgrades)
    const transition = LifecycleManager.evaluateTransition(currentState, currentStatus, result.rawStatus || result.status);
    if (!transition.allowed) {
      console.warn(`[Praxis] Blocked downgrade: ${transition.reason}`);
      return;
    }

    // Update context state
    this.contextManager.updateContext(0, platform, {
      lifecycleState: transition.newState,
      currentStatus: transition.newStatus || result.status,
      lastResultEvidence: result,
    });

    // Merge evidence into canonical event
    const problem = this.currentProblem || adapter.captureProblem();
    const editorSnap = adapter.captureEditor();
    const bufferSnap = this.snapshotBuffer.getLatestValid();

    this.attemptCount++;

    const canonicalEvent = EvidenceMerger.merge({
      platform,
      sessionId: this.sessionId,
      problem,
      editor: editorSnap,
      bufferSnapshot: bufferSnap,
      result,
      attemptNumber: this.attemptCount,
    });

    if (!canonicalEvent) {
      console.warn('[Praxis] Failed to assemble canonical event (no valid code).');
      return;
    }

    // Deduplication check
    const dedupKey = `${canonicalEvent.platform}:${canonicalEvent.problem.slug}:${canonicalEvent.submissionStatus}`;
    if (this.dedupEngine.shouldBlockDuplicate(dedupKey, canonicalEvent.platformSubmissionId)) {
      console.log('[Praxis] Duplicate submission blocked by dedup engine within 30s window.');
      return;
    }

    console.log(`[Praxis] Sending canonical event to background (${canonicalEvent.platform}):`, canonicalEvent.eventId);
    this.sendToBackground(canonicalEvent);
  }

  private sendToBackground(event: CanonicalSubmissionEvent): void {
    chrome.runtime.sendMessage(
      { type: 'CANONICAL_SUBMISSION_EVENT', data: event },
      (response: any) => {
        if (chrome.runtime.lastError) {
          console.error('[Praxis] Runtime message error:', chrome.runtime.lastError.message);
          this.showToast(event.submissionStatus, false);
          return;
        }
        if (response?.success) {
          console.log('[Praxis] Submission stored successfully.');
          this.showToast(event.submissionStatus, true);
        } else {
          console.error('[Praxis] Storage error:', response?.error);
          this.showToast(event.submissionStatus, false);
        }
      }
    );
  }

  private showToast(status: SubmissionStatus, success: boolean): void {
    const id = '__praxis_toast';
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = id;

    const bg = success ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)';
    const icon = success ? '✓' : '✗';

    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      background: ${bg};
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      opacity: 0;
      transform: translateY(8px);
    `;

    toast.innerHTML = `<span>${icon}</span><span>Praxis: ${status} captured</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }
}

// ─── SPA Navigation & Bootstrap ────────────────────────────────────────────────
const collector = new PraxisCollector();

let lastUrl = window.location.href;

function bootstrap(): void {
  collector.activate().catch(err => console.error('[Praxis] Activation failed:', err));
}

// 1. Poll URL changes for SPAs (React Router, Next.js, etc.)
window.setInterval(() => {
  if (window.location.href !== lastUrl) {
    console.log(`[Praxis] URL changed detected via poll: ${lastUrl} -> ${window.location.href}`);
    lastUrl = window.location.href;
    bootstrap();
  }
}, 800);

// 2. Listen to background script webNavigation events
try {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'TAB_URL_CHANGED' && msg.url) {
      if (msg.url !== lastUrl) {
        console.log(`[Praxis] URL changed detected via background: ${lastUrl} -> ${msg.url}`);
        lastUrl = msg.url;
        bootstrap();
      }
    }
  });
} catch (e) {}

// 3. Patch pushState and replaceState in case of same-world calls
const origPushState = history.pushState.bind(history);
history.pushState = (...args: Parameters<typeof history.pushState>) => {
  origPushState(...args);
  window.dispatchEvent(new Event('locationchange'));
};

const origReplaceState = history.replaceState.bind(history);
history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
  origReplaceState(...args);
  window.dispatchEvent(new Event('locationchange'));
};

window.addEventListener('locationchange', () => setTimeout(bootstrap, 400));
window.addEventListener('popstate', () => setTimeout(bootstrap, 400));
window.addEventListener('load', () => bootstrap());

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootstrap());
} else {
  bootstrap();
}