import type { EditorEvidence } from '../adapters/base/types';

export class SnapshotBuffer {
  private readonly maxDepth: number;
  private snapshots: EditorEvidence[] = [];

  constructor(maxDepth = 5) {
    this.maxDepth = maxDepth;
  }

  /**
   * Pushes a new valid code snapshot into the buffer.
   * Empty, whitespace-only, or trivial placeholder code is ignored.
   * NOTE: A snapshot alone NEVER creates a submission event.
   */
  pushSnapshot(
    code: string,
    language: string,
    source: EditorEvidence['source'] = 'buffer'
  ): void {
    if (!code || code.trim().length <= 10) {
      return;
    }

    const now = Date.now();
    const last = this.snapshots[this.snapshots.length - 1];

    // Avoid pushing consecutive identical snapshots
    if (last && last.code === code && last.language === language) {
      last.timestamp = now;
      return;
    }

    this.snapshots.push({
      code,
      language,
      source,
      timestamp: now,
    });

    if (this.snapshots.length > this.maxDepth) {
      this.snapshots.shift();
    }
  }

  /**
   * Retrieves the most recent valid snapshot, or null if buffer is empty.
   */
  getLatestValid(): EditorEvidence | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Returns all buffered snapshots.
   */
  getAll(): EditorEvidence[] {
    return [...this.snapshots];
  }

  /**
   * Clears all snapshots. Must be called when problem context changes
   * to avoid stale code contaminating a subsequent problem.
   */
  clear(): void {
    this.snapshots = [];
  }
}
