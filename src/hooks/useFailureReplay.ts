'use client';

import { useState, useCallback } from 'react';
import type { FailureReplay } from '@/types';

export type ReplayStatus = 'idle' | 'loading' | 'success' | 'error' | 'not-applicable';

interface UseFailureReplayState {
  status: ReplayStatus;
  data: FailureReplay | null;
  error: string | null;
}

export function useFailureReplay(submissionId: string | null) {
  const [state, setState] = useState<UseFailureReplayState>({
    status: 'idle',
    data: null,
    error: null,
  });

  const run = useCallback(
    async (seed?: number) => {
      if (!submissionId) return;
      setState({ status: 'loading', data: null, error: null });

      try {
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('praxis_token') || sessionStorage.getItem('praxis_token')
          : null;

        const res = await fetch(`/api/replay/${submissionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ seed: seed ?? Math.floor(Math.random() * 0xFFFFFF) }),
        });

        const json = await res.json() as { success: boolean; data?: FailureReplay; error?: { code: string; message: string } };

        if (!res.ok || !json.success) {
          if (json.error?.code === 'NOT_APPLICABLE') {
            setState({ status: 'not-applicable', data: null, error: json.error.message });
          } else {
            setState({ status: 'error', data: null, error: json.error?.message ?? 'Unknown error' });
          }
          return;
        }

        setState({ status: 'success', data: json.data ?? null, error: null });
      } catch (err) {
        setState({
          status: 'error',
          data: null,
          error: err instanceof Error ? err.message : 'Network error',
        });
      }
    },
    [submissionId]
  );

  const regenerate = useCallback(() => {
    run(Math.floor(Math.random() * 0xFFFFFF));
  }, [run]);

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    isLoading: state.status === 'loading',
    run,
    regenerate,
  };
}
