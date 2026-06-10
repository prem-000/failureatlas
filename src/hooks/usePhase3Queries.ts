'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

// ─── Profile ───────────────────────────────────────────────────────────────────
export interface ProfileData {
  user: {
    id: string;
    email: string;
    name: string | null;
    username: string | null;
    createdAt: string;
    apiKey: string | null;
  };
  stats: {
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number;
    uniqueProblems: number;
    languageDistribution: Array<{ language: string; count: number }>;
    difficultyDistribution: Array<{ difficulty: string; count: number }>;
    activityTimeline: Array<{ date: string; count: number }>;
    topWeaknesses: Array<{
      name: string;
      severity: string;
      frequency: number;
      pageRankScore: number;
      lastOccurrence: string;
    }>;
  };
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () =>
      apiFetch<{ success: boolean; data: ProfileData }>('/api/user/profile').then((r) => r.data),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (body: { name?: string; username?: string }) =>
      apiFetch<{ success: boolean; data: { user: ProfileData['user'] } }>('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  });
}

// ─── Graph ─────────────────────────────────────────────────────────────────────
export interface SubgraphData {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: { label: string; nodeType: string; properties: Record<string, unknown> };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    type?: string;
    animated?: boolean;
    data?: Record<string, unknown>;
    style?: Record<string, unknown>;
  }>;
  stats: {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
  };
}

export function useGraphSubgraph(limit = 300) {
  return useQuery({
    queryKey: ['graph', 'subgraph', limit],
    queryFn: () =>
      apiFetch<{ success: boolean; data: SubgraphData }>(`/api/graph/subgraph?limit=${limit}`).then(
        (r) => r.data
      ),
  });
}

// ─── Submissions ───────────────────────────────────────────────────────────────
export interface SubmissionListItem {
  eventId: string;
  problemSlug: string;
  problemTitle: string;
  submissionStatus: string;
  timestamp: number;
  attemptNumber: number;
  hasAnalysis: boolean;
}

export function useSubmissionsList(params?: { limit?: number; problemSlug?: string }) {
  const limit = params?.limit ?? 500;
  const slug = params?.problemSlug;
  const qs = new URLSearchParams({ limit: String(limit) });
  if (slug) qs.set('problemSlug', slug);

  return useQuery({
    queryKey: ['submissions', limit, slug ?? 'all'],
    queryFn: () =>
      apiFetch<{ success: boolean; submissions: SubmissionListItem[] }>(
        `/api/submissions?${qs.toString()}`
      ).then((r) => r.submissions),
  });
}

export function useSubmissionDetail(id: string | null) {
  return useQuery({
    queryKey: ['submissions', 'detail', id],
    enabled: !!id,
    queryFn: () =>
      apiFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/submissions/${id}`).then(
        (r) => r.data
      ),
  });
}

// ─── Diagnosis ─────────────────────────────────────────────────────────────────
export interface DiagnosisData {
  analysis: string;
  confidence: number;
  primaryWeaknessId: string;
  reasoningChain: string[];
  similarFailures: Array<{
    eventId: string;
    problemTitle: string;
    problemDifficulty: string;
    status: string;
    similarity: number;
    timestamp: string;
  }>;
  recommendations: Array<{ name: string; description: string; priority: number }>;
}

export function useDiagnosisGenerate() {
  return useMutation({
    mutationFn: (query: string) =>
      apiFetch<{ success: boolean; data: DiagnosisData }>('/api/diagnosis/generate', {
        method: 'POST',
        body: JSON.stringify({ query }),
      }).then((r) => r.data),
  });
}
