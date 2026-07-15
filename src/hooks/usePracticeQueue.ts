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
}

export interface PracticeQueueData {
  queue: PracticeReviewStateData[];
  upcoming: PracticeReviewStateData[];
  statistics: {
    reviewsCompleted: number;
    currentStreak: number;
    averageRecall: number;
    retentionRate: number;
  };
  reviewedToday: number;
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

export function useImportProblems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { platform: string; username?: string }) =>
      apiFetch<{ success: boolean; importedCount: number }>('/api/practice-queue', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-queue'] });
    },
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { id: string; quality: number }) =>
      apiFetch<{ success: boolean; data: PracticeReviewStateData }>('/api/practice-queue', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-queue'] });
    },
  });
}
