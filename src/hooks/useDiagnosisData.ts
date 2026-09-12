'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuthToken } from '@/lib/api/client';
import type { DiagnosisStage } from '@/types';
import type { DiagnosisData } from './usePhase3Queries';

export interface DiagnosisMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  elapsedMs?: number;
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const INITIAL_MESSAGE: DiagnosisMessage = {
  id: 'initial-welcome-message',
  role: 'assistant',
  content:
    "Hello! I'm your AI Failure Analyst. Ask me anything about your competitive programming patterns — I'll retrieve your past failures, analyze the evidence, and give you a targeted diagnosis.",
  timestamp: new Date(),
};

export function useDiagnosisData() {
  const [messages, setMessages] = useState<DiagnosisMessage[]>([INITIAL_MESSAGE]);
  const [currentStage, setCurrentStage] = useState<DiagnosisStage | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<DiagnosisData | null>(null);
  const [latestSubmissionId, setLatestSubmissionId] = useState<string | undefined>(undefined);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  const askQuestion = useCallback(
    async (text: string) => {
      const query = text.trim();
      if (!query || isLoading) return;

      const userMsg: DiagnosisMessage = {
        id: generateId(),
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setCurrentStage('retrieving_embeddings');
      setElapsedMs(0);

      const startTime = Date.now();
      stopTimer();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 50);

      try {
        const token = getAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch('/api/diagnosis/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, stream: true }),
        });

        if (!res.ok && !res.headers.get('content-type')?.includes('text/event-stream')) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson?.error?.message || errJson?.message || `Request failed (${res.status})`);
        }

        const isSSE = res.headers.get('content-type')?.includes('text/event-stream');

        if (isSSE && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let answerReceived = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const chunk of lines) {
              const trimmed = chunk.trim();
              if (!trimmed.startsWith('data:')) continue;
              const jsonStr = trimmed.slice(5).trim();
              if (!jsonStr) continue;

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === 'stage' && event.stage) {
                  setCurrentStage(event.stage as DiagnosisStage);
                } else if (event.type === 'answer') {
                  answerReceived = true;
                  const finalElapsed = Date.now() - startTime;
                  setElapsedMs(finalElapsed);

                  const data: DiagnosisData = event.data || event.evidence;
                  if (data) {
                    setLastResult(data);
                    if (data.latestSubmissionId) {
                      setLatestSubmissionId(data.latestSubmissionId);
                    }
                  }

                  const assistantContent =
                    event.content ||
                    data?.analysis ||
                    'Analysis complete. Check the evidence panel for detailed results.';

                  setMessages((prev) => [
                    ...prev,
                    {
                      id: generateId(),
                      role: 'assistant',
                      content: assistantContent,
                      timestamp: new Date(),
                      elapsedMs: finalElapsed,
                    },
                  ]);
                } else if (event.type === 'error') {
                  throw new Error(event.error || 'Diagnosis failed');
                }
              } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
                  console.warn('Diagnosis SSE parse error:', parseErr);
                }
              }
            }
          }

          if (!answerReceived) {
            const finalElapsed = Date.now() - startTime;
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: 'assistant',
                content: 'Analysis stream ended before response was complete.',
                timestamp: new Date(),
                elapsedMs: finalElapsed,
              },
            ]);
          }
        } else {
          // Standard JSON response fallback
          const json = await res.json();
          const finalElapsed = Date.now() - startTime;
          setElapsedMs(finalElapsed);

          if (!json.success && json.error) {
            throw new Error(json.error.message || 'Failed to generate diagnosis');
          }

          const data: DiagnosisData = json.data;
          if (data) {
            setLastResult(data);
            if (data.latestSubmissionId) {
              setLatestSubmissionId(data.latestSubmissionId);
            }
          }

          const assistantContent =
            data?.analysis || 'Analysis complete. Check the evidence panel for detailed results.';

          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant',
              content: assistantContent,
              timestamp: new Date(),
              elapsedMs: finalElapsed,
            },
          ]);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate diagnosis. Please try again.';
        const finalElapsed = Date.now() - startTime;
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: `⚠️ ${errorMsg}`,
            timestamp: new Date(),
            elapsedMs: finalElapsed,
          },
        ]);
      } finally {
        stopTimer();
        setIsLoading(false);
      }
    },
    [isLoading, stopTimer]
  );

  return {
    messages,
    askQuestion,
    sendMessage: askQuestion,
    currentStage,
    elapsedMs,
    isLoading,
    currentEvidence: lastResult,
    lastResult,
    latestSubmissionId,
    setLatestSubmissionId,
  };
}
