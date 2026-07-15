import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

export interface PracticeReviewStateData {
  id: string;
  userId: string;
  problemId: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  platform: 'LeetCode' | 'Codeforces' | 'CodeChef' | 'AtCoder';
  solveDate: string;
  lastReview: string | null;
  nextReview: string;
  repetitions: number;
  easeFactor: number;
  interval: number;
  reviewAgain: boolean;
  personalNotes: string;
  topics?: string[];
}

export interface PracticeSessionItemData {
  id: string;
  sessionId: string;
  practiceReviewStateId: string;
  order: number;
  completed: boolean;
  review: PracticeReviewStateData;
}

export interface PracticeSessionData {
  id: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  strategy: 'PRIORITY' | 'WEAKEST_TOPIC' | 'MIXED';
  filterTopic: string | null;
  averageRecall: number | null;
  retentionRate: number | null;
  currentIndex: number;
  items: PracticeSessionItemData[];
}

export interface PracticeQueueData {
  activeSession: PracticeSessionData | null;
  statistics: {
    reviewsCompleted: number;
    currentStreak: number;
    averageRecall: number;
    retentionRate: number;
    totalProblemsReviewed: number;
  };
  recentSessions: PracticeSessionData[];
  topics: string[];
  totalCount: number;
}

export function usePracticeQueue() {
  return useQuery({
    queryKey: ['practice-queue'],
    queryFn: () =>
      apiFetch<{ success: boolean; data: PracticeQueueData }>('/api/practice-queue').then(
        (r) => r.data
      ),
    refetchOnWindowFocus: true,
  });
}

export function useStartPracticeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { limit: number; strategy: string; topic?: string }) => {
      const { limit, strategy, topic } = params;
      let url = `/api/practice-queue?limit=${limit}&strategy=${strategy}`;
      if (topic) url += `&topic=${encodeURIComponent(topic)}`;
      return apiFetch<{ success: boolean; data: { session: PracticeSessionData } }>(url).then(
        (r) => r.data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-queue'] });
    },
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      id: string;
      sessionId?: string;
      quality: number;
      personalNotes?: string;
      reviewAgain?: boolean;
    }) =>
      apiFetch<{ success: boolean; data: PracticeReviewStateData }>('/api/practice-queue', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-queue'] });
    },
  });
}
