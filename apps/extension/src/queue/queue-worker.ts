import { PersistentQueue } from './persistent-queue';
import type { CanonicalSubmissionEvent } from '../adapters/base/types';

export interface QueueSender {
  sendSubmission(event: CanonicalSubmissionEvent): Promise<{ success: boolean; error?: string }>;
}

export class QueueWorker {
  private static readonly BATCH_SIZE = 10; // Preserves background.ts:343
  private isProcessing = false;
  private backoffDelay = 1000;
  private sender: QueueSender;

  constructor(sender: QueueSender) {
    this.sender = sender;
  }

  /**
   * Processes up to BATCH_SIZE events from the persistent queue.
   */
  async processQueue(): Promise<{ processed: number; remaining: number }> {
    if (this.isProcessing) {
      console.log('[QueueWorker] Already processing queue.');
      const all = await PersistentQueue.getEvents();
      return { processed: 0, remaining: all.length };
    }

    this.isProcessing = true;

    try {
      const queue = await PersistentQueue.getEvents();
      if (queue.length === 0) {
        this.isProcessing = false;
        return { processed: 0, remaining: 0 };
      }

      const batch = queue.slice(0, QueueWorker.BATCH_SIZE);
      let successCount = 0;

      for (const event of batch) {
        try {
          const res = await this.sender.sendSubmission(event);
          if (res.success) {
            successCount++;
            this.backoffDelay = 1000; // Reset backoff on success
          } else {
            console.warn(`[QueueWorker] Failed to deliver event ${event.eventId}:`, res.error);
            // Apply backoff and stop batch
            this.backoffDelay = Math.min(this.backoffDelay * 2, 60000);
            break;
          }
        } catch (err) {
          console.error(`[QueueWorker] Network error delivering event ${event.eventId}:`, err);
          this.backoffDelay = Math.min(this.backoffDelay * 2, 60000);
          break;
        }
      }

      if (successCount > 0) {
        const remaining = await PersistentQueue.removeCount(successCount);
        this.isProcessing = false;
        return { processed: successCount, remaining: remaining.length };
      }

      this.isProcessing = false;
      return { processed: 0, remaining: queue.length };
    } catch (e) {
      console.error('[QueueWorker] Fatal queue processing error:', e);
      this.isProcessing = false;
      return { processed: 0, remaining: 0 };
    }
  }

  getBackoffDelay(): number {
    return this.backoffDelay;
  }
}
