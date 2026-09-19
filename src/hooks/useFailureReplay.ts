'use client';

import { useState, useCallback } from 'react';
import type {
  ReplaySessionData,
  ReasoningEvaluationResult,
  ProgressiveHint,
  TargetedTestCase,
} from '@/lib/replay/types';

export type ReplayStatus = 'idle' | 'loading' | 'success' | 'error' | 'not-applicable';

interface UseFailureReplayState {
  status: ReplayStatus;
  session: ReplaySessionData | null;
  error: string | null;
  evaluatingReasoning: boolean;
  runningTest: boolean;
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('praxis_token') ||
    sessionStorage.getItem('praxis_token')
  );
}

export function useFailureReplay(submissionId: string | null) {
  const [state, setState] = useState<UseFailureReplayState>({
    status: 'idle',
    session: null,
    error: null,
    evaluatingReasoning: false,
    runningTest: false,
  });

  const startReplay = useCallback(
    async (forceRegenerate: boolean = false) => {
      if (!submissionId) return;
      setState(prev => ({ ...prev, status: 'loading', error: null }));

      try {
        const token = getStoredToken();
        const res = await fetch('/api/practice/replay/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ submissionId, forceRegenerate }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: json.error?.message || 'Failed to start replay session.',
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          status: 'success',
          session: json.data,
          error: null,
        }));
      } catch (err: any) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: err.message || 'Network error occurred.',
        }));
      }
    },
    [submissionId]
  );

  const revealHint = useCallback(
    async (level: number) => {
      if (!state.session) return;
      try {
        const token = getStoredToken();
        const res = await fetch(`/api/practice/replay/${state.session.id}/hint`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ level }),
        });

        const json = await res.json();
        if (json.success && json.data?.hints) {
          setState(prev => {
            if (!prev.session) return prev;
            return {
              ...prev,
              session: {
                ...prev.session,
                hintLevel: json.data.hintLevel,
                hints: json.data.hints,
              },
            };
          });
        }
      } catch (err) {
        console.error('Failed to reveal hint:', err);
      }
    },
    [state.session]
  );

  const submitReasoning = useCallback(
    async (nodeId: string, answer: string): Promise<ReasoningEvaluationResult | null> => {
      if (!state.session) return null;
      setState(prev => ({ ...prev, evaluatingReasoning: true }));

      try {
        const token = getStoredToken();
        const res = await fetch(`/api/practice/replay/${state.session.id}/reason`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ nodeId, answer }),
        });

        const json = await res.json();
        setState(prev => ({ ...prev, evaluatingReasoning: false }));

        if (json.success && json.data) {
          setState(prev => {
            if (!prev.session) return prev;
            return {
              ...prev,
              session: {
                ...prev.session,
                conditionFlow: json.data.updatedFlow || prev.session.conditionFlow,
              },
            };
          });
          return json.data;
        }
        return null;
      } catch (err) {
        setState(prev => ({ ...prev, evaluatingReasoning: false }));
        console.error('Failed to submit reasoning:', err);
        return null;
      }
    },
    [state.session]
  );

  const runTestcase = useCallback(
    async (testCaseId: string, code?: string): Promise<{ test: TargetedTestCase; passed: boolean } | null> => {
      if (!state.session) return null;
      setState(prev => ({ ...prev, runningTest: true }));

      try {
        const token = getStoredToken();
        const res = await fetch(`/api/practice/replay/${state.session.id}/testcase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ testCaseId, code }),
        });

        const json = await res.json();
        setState(prev => ({ ...prev, runningTest: false }));

        if (json.success && json.data) {
          setState(prev => {
            if (!prev.session) return prev;
            const updatedTests = prev.session.targetedTests.map(t =>
              t.id === testCaseId ? json.data.test : t
            );
            return {
              ...prev,
              session: {
                ...prev.session,
                targetedTests: updatedTests,
              },
            };
          });
          return json.data;
        }
        return null;
      } catch (err) {
        setState(prev => ({ ...prev, runningTest: false }));
        console.error('Failed to run testcase:', err);
        return null;
      }
    },
    [state.session]
  );

  return {
    status: state.status,
    session: state.session,
    error: state.error,
    isLoading: state.status === 'loading',
    isEvaluatingReasoning: state.evaluatingReasoning,
    isRunningTest: state.runningTest,
    startReplay,
    revealHint,
    submitReasoning,
    runTestcase,
    regenerate: () => startReplay(true),
  };
}
