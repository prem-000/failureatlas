import type { SubmissionEvent, BehavioralSignal } from '@/types';

export function parseBehavioralSignals(
  current: SubmissionEvent,
  previous: SubmissionEvent[]
): BehavioralSignal[] {
  const signals: BehavioralSignal[] = [];

  // Sort previous by timestamp descending (most recent first)
  const sortedPrev = [...previous].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const lastAttempt = sortedPrev[0];
  if (!lastAttempt) {
    return [];
  }

  const currTime = new Date(current.timestamp).getTime();
  const lastTime = new Date(lastAttempt.timestamp).getTime();
  const diffSeconds = Math.max(0, (currTime - lastTime) / 1000);

  // 1. Rapid Resubmission check
  if (current.rapidSubmission || diffSeconds < 60) {
    signals.push({
      type: 'rapid_resubmission',
      interval: diffSeconds,
      confidence: diffSeconds < 30 ? 0.90 : 0.75
    });
  }

  // 2. Long Gap check
  if (diffSeconds > 1800) { // 30 minutes
    signals.push({
      type: 'long_gap',
      interval: diffSeconds,
      confidence: diffSeconds > 3600 ? 0.85 : 0.70
    });
  }

  // 3. Many Minor Changes check
  // Check if there are >= 3 attempts in the last 10 minutes
  const recentAttempts = sortedPrev.filter(att => {
    const attTime = new Date(att.timestamp).getTime();
    return (currTime - attTime) / 1000 < 600; // 10 minutes
  });

  if (recentAttempts.length >= 3) {
    signals.push({
      type: 'many_minor_changes',
      interval: diffSeconds,
      confidence: Math.min(0.95, 0.5 + recentAttempts.length * 0.1)
    });
  }

  return signals;
}
