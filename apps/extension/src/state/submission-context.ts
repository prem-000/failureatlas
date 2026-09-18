import type {
  Platform,
  EditorEvidence,
  NetworkEvidence,
  ResultEvidence,
  SubmitEvidence,
  ProblemEvidence,
  LifecycleState,
} from '../adapters/base/types';
import type { SubmissionStatus } from '../types';

export interface SubmissionContext {
  contextKey: string;
  tabId: number;
  platform: Platform;
  lifecycleState: LifecycleState;
  problem: ProblemEvidence;
  activeSubmissionId?: string;
  lastSubmitEvidence?: SubmitEvidence;
  lastEditorEvidence?: EditorEvidence;
  lastNetworkEvidence?: NetworkEvidence;
  lastResultEvidence?: ResultEvidence;
  currentStatus?: SubmissionStatus;
  startedAt: number;
  updatedAt: number;
}

export class SubmissionContextManager {
  private contexts = new Map<string, SubmissionContext>();

  /**
   * Generates isolated context key for a tab and platform.
   */
  static makeKey(tabId: number | string, platform: Platform): string {
    return `${tabId}:${platform}`;
  }

  getContext(tabId: number | string, platform: Platform): SubmissionContext | undefined {
    const key = SubmissionContextManager.makeKey(tabId, platform);
    return this.contexts.get(key);
  }

  getOrCreateContext(
    tabId: number | string,
    platform: Platform,
    initialProblem: ProblemEvidence
  ): SubmissionContext {
    const key = SubmissionContextManager.makeKey(tabId, platform);
    let ctx = this.contexts.get(key);

    if (!ctx) {
      ctx = {
        contextKey: key,
        tabId: typeof tabId === 'number' ? tabId : 0,
        platform,
        lifecycleState: 'UNKNOWN',
        problem: initialProblem,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.contexts.set(key, ctx);
    } else if (initialProblem.slug && ctx.problem.slug !== initialProblem.slug) {
      // Problem changed within the same tab — reset submission-specific state
      ctx.problem = initialProblem;
      ctx.lifecycleState = 'UNKNOWN';
      ctx.activeSubmissionId = undefined;
      ctx.lastSubmitEvidence = undefined;
      ctx.lastResultEvidence = undefined;
      ctx.currentStatus = undefined;
      ctx.updatedAt = Date.now();
    }

    return ctx;
  }

  updateContext(
    tabId: number | string,
    platform: Platform,
    updates: Partial<SubmissionContext>
  ): SubmissionContext | undefined {
    const key = SubmissionContextManager.makeKey(tabId, platform);
    const ctx = this.contexts.get(key);
    if (!ctx) return undefined;

    Object.assign(ctx, updates, { updatedAt: Date.now() });
    return ctx;
  }

  removeContext(tabId: number | string, platform: Platform): boolean {
    const key = SubmissionContextManager.makeKey(tabId, platform);
    return this.contexts.delete(key);
  }

  clear(): void {
    this.contexts.clear();
  }
}
