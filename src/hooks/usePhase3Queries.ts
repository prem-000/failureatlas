import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

// ─── Profile ───────────────────────────────────────────────────────────────────
export interface ProfileData {
  user: {
    id: string;
    email: string;
    name: string | null;
    username: string | null;
    image?: string | null;
    createdAt: string;
    apiKey: string | null;
    provider?: string | null;
  };
  stats: {
    lastSubmissionAt: string | null;
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


// ─── Failures ──────────────────────────────────────────────────────────────────
export interface FailureData {
  id: string;
  problemTitle: string;
  status: string;
  rootCause: string;
  confidence: number;
  timestamp: string;
  // Optional but returned UI fields
  problemSlug: string;
  difficulty: string;
  attemptNumber: number;
  timeSpent: number;
  failedTestCase?: string;
  code?: string;
  language?: string;
  rootCauses?: Array<{ type: string; name: string; confidence: number }>;
  evidence?: Array<{ type: string; description: string; confidence: number; rawData?: any }>;
}

export function useGraphFailures(limit = 50, days = 30) {
  return useQuery({
    queryKey: ['graph', 'failures', limit, days],
    queryFn: () =>
      apiFetch<FailureData[]>(
        `/api/graph/failures?limit=${limit}&days=${days}`
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
  /** ID of the most recent failed submission — used to fetch the FailureExplanation */
  latestSubmissionId?: string;
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

// ─── Roadmap ───────────────────────────────────────────────────────────────────

export interface RoadmapProblem {
  leetcodeId: number;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  patterns: string[];
  reason: string;
  nodeState: 'locked' | 'available' | 'solved' | 'failed' | 'previously_solved' | 'solving';
  userAttempts?: number;
  userStatus?: string;
}

export interface RoadmapLevel {
  level: number;
  nodes: RoadmapNodeData[];
  edges: RoadmapEdge[];
  clusters: string[];
  learningGoal: string;
  weaknessTarget: string;
  generatedAt: string;
}

export interface RoadmapNodeData extends RoadmapProblem {
  cluster?: string;
}

export interface RoadmapEdge {
  source: string;
  target: string;
  type?: string;
  confidence?: number;
  reason?: string;
}

export interface RoadmapStateData {
  id: string;
  userId: string;
  topic: string;
  currentLevel: number;
  levels: RoadmapLevel[];
  createdAt: string;
  updatedAt: string;
}

export function useRoadmapState(topic: string) {
  return useQuery({
    queryKey: ['roadmap', 'state', topic],
    queryFn: () =>
      apiFetch<{ success: boolean; state: RoadmapStateData | null }>(
        `/api/roadmap/state?topic=${encodeURIComponent(topic)}`
      ).then((r) => r.state),
    staleTime: 30000,
  });
}

export function useRoadmapGenerate() {
  return useMutation({
    mutationFn: (params: { topic: string; level: number; excludeSlugs?: string[] }) =>
      apiFetch<{
        success: boolean;
        topic: string;
        level: number;
        nodes: RoadmapNodeData[];
        edges: RoadmapEdge[];
        clusters: string[];
        learningGoal: string;
        weaknessTarget: string;
        generatedAt: string;
      }>('/api/roadmap/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
}

export function useSaveRoadmapState() {
  return useMutation({
    mutationFn: (params: { topic: string; currentLevel: number; levels: RoadmapLevel[] }) =>
      apiFetch<{ success: boolean; state: RoadmapStateData }>('/api/roadmap/state', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
}

// ─── Phase 3.1 AI Generation ───────────────────────────────────────────────────

export function useDynamicTopics() {
  return useQuery({
    queryKey: ['topics', 'dynamic'],
    queryFn: () =>
      apiFetch<{ success: boolean; topics: Array<{ id: string; label: string; reason: string }> }>('/api/topics/generate', {
        method: 'POST',
      }).then((r) => r.topics),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDynamicKnowledgeGraph(query: string) {
  return useQuery({
    queryKey: ['knowledge', 'dynamic', query],
    enabled: !!query,
    queryFn: () =>
      apiFetch<{ success: boolean; data: { nodes: any[]; edges: any[] } }>('/api/knowledge/generate', {
        method: 'POST',
        body: JSON.stringify({ query }),
      }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}



export function useLearningSheet(topic: string, difficulty: string, force: boolean = false) {
  return useQuery({
    queryKey: ['learning-sheet', topic, difficulty, force],
    enabled: !!topic,
    queryFn: () =>
      apiFetch<{ success: boolean; data: any }>(`/api/learning-sheet/generate${force ? '?force=true' : ''}`, {
        method: 'POST',
        body: JSON.stringify({ topic, difficulty }),
      }).then((r) => r.data),
    staleTime: force ? 0 : Infinity, // If forcing, bypass react-query cache and fetch fresh
  });
}

export function useLearningSheetList(category?: string) {
  return useQuery({
    queryKey: ['learning-sheets', category],
    queryFn: () =>
      apiFetch<{ success: boolean; data: any[] }>(
        `/api/learning-sheet${category ? `?category=${category}` : ''}`
      ).then((r) => r.data),
    staleTime: 30000,
  });
}

export function useBookmarkedLearningSheets() {
  return useQuery({
    queryKey: ['learning-sheets', 'bookmarked'],
    queryFn: () =>
      apiFetch<{ success: boolean; data: any[] }>('/api/learning-sheet?bookmarked=true').then((r) => r.data),
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topic, difficulty, bookmarked }: { topic: string; difficulty: string; bookmarked: boolean }) =>
      apiFetch<{ success: boolean; bookmarked: boolean }>('/api/learning-sheet/bookmark', {
        method: 'POST',
        body: JSON.stringify({ topic, difficulty, bookmarked }),
      }),
    onSuccess: (data, variables) => {
      // Invalidate specific learning sheet cache
      queryClient.invalidateQueries({ queryKey: ['learning-sheet', variables.topic, variables.difficulty] });
      // Invalidate bookmarked sheets list
      queryClient.invalidateQueries({ queryKey: ['learning-sheets', 'bookmarked'] });
    },
  });
}


// ─── Daily Coach Preferences ───────────────────────────────────────────────────

export interface UserPreferencesData {
  id?: string;
  userId?: string;
  dailyMissionEmail: boolean;
  preferredTime: string;
  leetcodeUsername?: string | null;
  codeforcesUsername?: string | null;
  codechefUsername?: string | null;
  atcoderUsername?: string | null;
  createdAt?: string;
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ['user', 'preferences'],
    queryFn: () =>
      apiFetch<{ success: boolean; preferences: UserPreferencesData }>('/api/user/preferences').then((r) => r.preferences),
    staleTime: 30000,
  });
}

export function useUpdateUserPreferences() {
  return useMutation({
    mutationFn: (body: Partial<UserPreferencesData>) =>
      apiFetch<{ success: boolean; preferences: UserPreferencesData }>('/api/user/preferences', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

// ─── Failure Explanation ───────────────────────────────────────────────────────

export type FailureExplanationData = {
  submissionId: string;
  verdict: string;
  testCasesPassed: number | null;
  totalTestCases: number | null;
  rootCause: string;
  rootCauseCategory: string;
  confidence: number;
  reason: string;
  logicBreakdown: string;
  learningConcept: string;
  recommendation: string;
  estimatedLearningTimeMinutes: number;
  evidenceItems: Array<{ label: string; confirmed: boolean; source: string }>;
  representativeTestCase: {
    input: string;
    expectedOutput: string;
    userOutput?: string;
    explanation: string;
    failureMode: string;
    isActualFailedCase: boolean;
  } | null;
  recurringPatterns: Array<{ category: string; count: number; problemType: string }>;
  generatedAt: string;
};

/**
 * Fetch an existing (cached) failure explanation for a submission.
 * Returns 404 data as null — use useGenerateFailureExplanation to trigger generation.
 */
export function useFailureExplanation(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['failure-explanation', submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      try {
        const r = await apiFetch<{ success: boolean; data: FailureExplanationData }>(
          `/api/submissions/${submissionId}/explain`
        );
        return r.data ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!submissionId,
    staleTime: 60000,
    retry: false,
  });
}

/**
 * Trigger generation (or regeneration) of a failure explanation.
 * Returns the newly-generated FailureExplanationData.
 */
export function useGenerateFailureExplanation() {
  return useMutation({
    mutationFn: ({ submissionId, force = false }: { submissionId: string; force?: boolean }) =>
      apiFetch<{ success: boolean; data: FailureExplanationData }>(
        `/api/submissions/${submissionId}/explain`,
        {
          method: 'POST',
          body: JSON.stringify({ force }),
        }
      ).then(r => r.data),
  });
}
