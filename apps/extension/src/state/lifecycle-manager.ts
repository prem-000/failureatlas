import type { LifecycleState } from '../adapters/base/types';
import type { SubmissionStatus } from '../types';

export class LifecycleManager {
  private static readonly TERMINAL_STATUSES: Set<SubmissionStatus> = new Set([
    'Accepted',
    'Wrong Answer',
    'Time Limit Exceeded',
    'Memory Limit Exceeded',
    'Runtime Error',
    'Compilation Error',
  ]);

  /**
   * Checks if a status is a final terminal verdict.
   */
  static isTerminalStatus(status?: string | null): boolean {
    if (!status) return false;
    return this.TERMINAL_STATUSES.has(status as SubmissionStatus);
  }

  /**
   * Normalizes raw platform statuses to either a terminal SubmissionStatus
   * or an intermediate lifecycle state.
   * Special case: GFG 'CALCULATED' is an intermediate evaluation state, NOT terminal.
   */
  static normalizeRawVerdict(rawVerdict: string): {
    state: LifecycleState;
    status?: SubmissionStatus;
  } {
    const raw = rawVerdict.trim().toLowerCase();

    // Intermediate states
    if (
      raw.includes('calculat') ||
      raw.includes('judging') ||
      raw.includes('running') ||
      raw.includes('evaluating') ||
      raw.includes('processing')
    ) {
      return { state: 'RUNNING' };
    }
    if (raw === 'submitted' || raw === 'pending' || raw === 'queued') {
      return { state: 'SUBMITTED' };
    }

    // Terminal Accepted
    if (
      raw.includes('accepted') ||
      raw.includes('correct answer') ||
      raw.includes('problem solved') ||
      raw.includes('success') ||
      raw.includes('pass')
    ) {
      return { state: 'TERMINAL', status: 'Accepted' };
    }

    // Terminal Wrong Answer
    if (
      raw.includes('wrong answer') ||
      raw.includes('wrong') ||
      raw.includes('failed') ||
      raw.includes('failure')
    ) {
      return { state: 'TERMINAL', status: 'Wrong Answer' };
    }

    // Terminal Time Limit Exceeded
    if (raw.includes('time limit')) {
      return { state: 'TERMINAL', status: 'Time Limit Exceeded' };
    }

    // Terminal Memory Limit Exceeded
    if (raw.includes('memory limit')) {
      return { state: 'TERMINAL', status: 'Memory Limit Exceeded' };
    }

    // Terminal Compilation Error
    if (raw.includes('compilation error') || raw.includes('compile error')) {
      return { state: 'TERMINAL', status: 'Compilation Error' };
    }

    // Terminal Runtime Error
    if (
      raw.includes('runtime error') ||
      raw.includes('signal') ||
      raw.includes('output limit') ||
      raw.includes('internal error')
    ) {
      return { state: 'TERMINAL', status: 'Runtime Error' };
    }

    // Default unknown
    return { state: 'UNKNOWN' };
  }

  /**
   * Transitions a context through the lifecycle state machine with strict terminal protection.
   * CRITICAL REQUIREMENT: A terminal status must NOT be downgraded by weaker later evidence.
   * e.g. GFG sequence: CALCULATED -> SUBMITTED -> SUCCESS -> SUBMITTED.
   * The final SUBMITTED signal must be rejected once terminal SUCCESS (Accepted) is achieved.
   */
  static evaluateTransition(
    currentState: LifecycleState,
    currentStatus: SubmissionStatus | undefined,
    incomingRawVerdict: string
  ): {
    allowed: boolean;
    newState: LifecycleState;
    newStatus?: SubmissionStatus;
    reason?: string;
  } {
    const normalized = this.normalizeRawVerdict(incomingRawVerdict);

    // If currently TERMINAL, block any transition that would downgrade or revert to non-terminal
    if (currentState === 'TERMINAL' && currentStatus) {
      if (normalized.state !== 'TERMINAL') {
        return {
          allowed: false,
          newState: currentState,
          newStatus: currentStatus,
          reason: `Terminal status '${currentStatus}' protected against downgrade by intermediate signal '${incomingRawVerdict}'.`,
        };
      }
    }

    // Normal progression
    return {
      allowed: true,
      newState: normalized.state,
      newStatus: normalized.status || currentStatus,
    };
  }
}
