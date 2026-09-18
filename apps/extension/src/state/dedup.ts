export class DeduplicationEngine {
  private static readonly DEDUP_WINDOW_MS = 30000; // Preserves existing content.ts 30s window
  private lastDedupKey: string | null = null;
  private lastSentTime = 0;

  /**
   * Evaluates whether an incoming submission payload should be blocked as a duplicate.
   * Duplicate = identical code + status within 30 seconds WITHOUT a distinct platformSubmissionId.
   */
  shouldBlockDuplicate(
    dedupKey: string,
    platformSubmissionId?: string
  ): boolean {
    const now = Date.now();

    // If a verified platform submission ID exists, check against the exact ID
    if (platformSubmissionId) {
      const idKey = `sub_id:${platformSubmissionId}`;
      if (this.lastDedupKey === idKey && now - this.lastSentTime < DeduplicationEngine.DEDUP_WINDOW_MS) {
        return true;
      }
      this.lastDedupKey = idKey;
      this.lastSentTime = now;
      return false;
    }

    // Otherwise use code+status fingerprint
    if (this.lastDedupKey === dedupKey && now - this.lastSentTime < DeduplicationEngine.DEDUP_WINDOW_MS) {
      return true;
    }

    this.lastDedupKey = dedupKey;
    this.lastSentTime = now;
    return false;
  }

  reset(): void {
    this.lastDedupKey = null;
    this.lastSentTime = 0;
  }
}
