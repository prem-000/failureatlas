export interface PriorityReviewState {
  nextReview: Date | string;
  reviewAgain: boolean;
}

export interface PriorityProblem {
  difficulty: string;
}

export interface PrioritySubmission {
  status: string;
  timeSpent: number;
}

/**
 * Calculates the Priority Score for a practice review state.
 *
 * Priority Score = SM-2 Urgency
 *                  + Difficulty Weight
 *                  + Historical Failure Weight
 *                  + Time Spent Weight
 *                  + Review Again Weight
 *
 * - SM-2 Urgency: Days overdue: (now - nextReview) / (1 day in ms)
 * - Difficulty Weight: Hard = 3, Medium = 2, Easy = 1
 * - Historical Failure Weight: Count of failed submissions (status !== 'Accepted' && !== 'AC'), capped at 5.
 * - Time Spent Weight: Cumulative time spent (seconds) / 300 (5 minutes), capped at 5.
 * - Review Again Weight: reviewAgain ? 10 : 0
 */
export function calculatePriorityScore(
  reviewState: PriorityReviewState,
  problem: PriorityProblem,
  submissions: PrioritySubmission[],
  diagnosis?: any
): number {
  const now = new Date();
  const nextReviewDate = new Date(reviewState.nextReview);

  // 1. SM-2 Urgency
  const diffMs = now.getTime() - nextReviewDate.getTime();
  const sm2Urgency = diffMs / (24 * 60 * 60 * 1000);

  // 2. Difficulty Weight
  let difficultyWeight = 1;
  const diff = problem?.difficulty?.toLowerCase();
  if (diff === 'hard') {
    difficultyWeight = 3;
  } else if (diff === 'medium') {
    difficultyWeight = 2;
  }

  // 3. Historical Failure Weight
  const failedAttempts = submissions.filter(
    (s) => s.status !== 'Accepted' && s.status !== 'AC'
  ).length;
  const historicalFailureWeight = Math.min(5, failedAttempts);

  // 4. Time Spent Weight (assuming timeSpent is in seconds)
  const totalTimeSpent = submissions.reduce((sum, s) => sum + (s.timeSpent || 0), 0);
  const timeSpentWeight = Math.min(5, totalTimeSpent / 300);

  // 5. Review Again Weight
  const reviewAgainWeight = reviewState.reviewAgain ? 10.0 : 0.0;

  return sm2Urgency + difficultyWeight + historicalFailureWeight + timeSpentWeight + reviewAgainWeight;
}
