import type { CanonicalSubmissionEvent } from '../adapters/base/types';

export class PersistentQueue {
  private static readonly STORAGE_KEY = 'pendingEvents';
  private static readonly MAX_QUEUE_SIZE = 50; // Preserving background.ts:144

  /**
   * Retrieves all pending events from chrome.storage.local.
   */
  static async getEvents(): Promise<CanonicalSubmissionEvent[]> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return [];
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      return (result[this.STORAGE_KEY] as CanonicalSubmissionEvent[]) || [];
    } catch (e) {
      console.error('[PersistentQueue] Failed to get pending events:', e);
      return [];
    }
  }

  /**
   * Appends an event to the queue, deduplicating by eventId and platformSubmissionId.
   */
  static async enqueue(event: CanonicalSubmissionEvent): Promise<number> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return 0;
      const events = await this.getEvents();

      const isDuplicate = events.some(
        e =>
          e.eventId === event.eventId ||
          (event.platformSubmissionId && e.platformSubmissionId === event.platformSubmissionId)
      );

      if (isDuplicate) {
        console.log(`[PersistentQueue] Event ${event.eventId} already queued. Skipping duplicate.`);
        return events.length;
      }

      events.push(event);
      const trimmed = events.slice(-this.MAX_QUEUE_SIZE);
      await chrome.storage.local.set({ [this.STORAGE_KEY]: trimmed });
      return trimmed.length;
    } catch (e) {
      console.error('[PersistentQueue] Failed to enqueue event:', e);
      return 0;
    }
  }

  /**
   * Clears acknowledged events from the front of the queue.
   */
  static async removeCount(count: number): Promise<CanonicalSubmissionEvent[]> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return [];
      const events = await this.getEvents();
      const remaining = events.slice(count);
      await chrome.storage.local.set({ [this.STORAGE_KEY]: remaining });
      return remaining;
    } catch (e) {
      console.error('[PersistentQueue] Failed to remove events:', e);
      return [];
    }
  }

  /**
   * Clears all events from the queue.
   */
  static async clear(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return;
      await chrome.storage.local.set({ [this.STORAGE_KEY]: [] });
    } catch (e) {
      console.error('[PersistentQueue] Failed to clear queue:', e);
    }
  }
}
