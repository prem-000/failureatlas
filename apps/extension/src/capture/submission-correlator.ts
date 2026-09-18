import type { Platform } from '../adapters/base/types';

export interface CorrelationIdentity {
  platform: Platform;
  platformSubmissionId?: string;
  problemSlug?: string;
  fingerprint: string;
  timestamp: number;
}

export class SubmissionCorrelator {
  private static readonly CORRELATION_WINDOW_MS = 30000;
  private recentCorrelations: CorrelationIdentity[] = [];

  /**
   * Computes the strong identity for a submission event.
   * Priority:
   * 1. Platform submission ID (e.g. hackerrank:483087426)
   * 2. Submission context fingerprint (platform:slug:hash:status)
   */
  computeIdentityKey(
    platform: Platform,
    platformSubmissionId?: string,
    problemSlug?: string,
    codeHash?: string
  ): string {
    if (platformSubmissionId) {
      return `${platform}:${platformSubmissionId}`;
    }
    return `${platform}:${problemSlug || 'unknown'}:${codeHash || 'nocode'}`;
  }

  /**
   * Checks if an incoming submission is an exact duplicate of a recently
   * recorded physical event (e.g. double DOM detection) within the 30s window.
   * NOTE: Intentional re-submissions of identical code with a new platformSubmissionId
   * or beyond the 30s window are NOT considered duplicates.
   */
  isDuplicateEvent(
    platform: Platform,
    platformSubmissionId?: string,
    fingerprint?: string
  ): boolean {
    const now = Date.now();
    // Prune stale records
    this.recentCorrelations = this.recentCorrelations.filter(
      r => now - r.timestamp < SubmissionCorrelator.CORRELATION_WINDOW_MS
    );

    for (const recent of this.recentCorrelations) {
      // If platform submission ID matches, it's definitely the same event
      if (
        platformSubmissionId &&
        recent.platformSubmissionId &&
        recent.platform === platform &&
        recent.platformSubmissionId === platformSubmissionId
      ) {
        return true;
      }

      // If no platform submission ID exists on either side, compare fingerprint within window
      if (
        !platformSubmissionId &&
        !recent.platformSubmissionId &&
        fingerprint &&
        recent.fingerprint === fingerprint &&
        now - recent.timestamp < SubmissionCorrelator.CORRELATION_WINDOW_MS
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Records a processed correlation to protect against rapid duplicate firings.
   */
  record(identity: CorrelationIdentity): void {
    this.recentCorrelations.push(identity);
  }

  clear(): void {
    this.recentCorrelations = [];
  }
}
