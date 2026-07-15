export interface SM2State {
  repetitions: number;
  easeFactor: number;
  interval: number;
}

export interface SM2Result extends SM2State {
  nextReview: Date;
}

/**
 * Calculates the next SM-2 state based on the recall quality rating.
 * 
 * Quality scores mapping:
 * 5: Solved Independently
 * 4: Solved After Thinking
 * 3: Solved With Difficulty
 * 2: Needed Editorial / Hints
 * 1: Couldn't Solve
 */
export function updateSM2(
  state: SM2State,
  quality: number,
  today: Date = new Date()
): SM2Result {
  // Clamp quality between 1 and 5
  const Q = Math.max(1, Math.min(5, quality));
  const EF = state.easeFactor;

  // Step 1: Recalculate Ease Factor (EF') unconditionally
  // EF' = EF + (0.1 - (5 - Q) * (0.08 + (5 - Q) * 0.02))
  const delta = 5 - Q;
  let newEF = EF + (0.1 - delta * (0.08 + delta * 0.02));
  newEF = Math.max(1.3, newEF); // Clamp to a minimum of 1.3

  let newRepetitions = state.repetitions;
  let newInterval = state.interval;

  // Step 2: Branch based on quality
  if (Q >= 3) {
    // Successful Review
    newRepetitions = newRepetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(state.interval * newEF);
    }
  } else {
    // Failed Review
    newRepetitions = 0;
    newInterval = 1;
  }

  // Calculate next review date
  const nextReview = new Date(today);
  nextReview.setDate(nextReview.getDate() + newInterval);
  // Set time to midnight for consistency in scheduling checks
  nextReview.setHours(0, 0, 0, 0);

  return {
    repetitions: newRepetitions,
    easeFactor: newEF,
    interval: newInterval,
    nextReview,
  };
}
