'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuthToken } from '@/lib/api/client';
import type { DiagnosisStage } from '@/types';
import type { DiagnosisData } from './usePhase3Queries';
import type { QueryAwareDiagnosis, DiagnosisEntry } from '@/types/diagnosis-v2';
import type { StageKey } from '@/components/diagnosis/DiagnosisStatusLine';

export interface DiagnosisMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  diagnosisV2?: QueryAwareDiagnosis;
  timestamp: Date;
  elapsedMs?: number;
  isError?: boolean;
  error?: {
    stage: string;
    message: string;
    requestId?: string;
    retryable?: boolean;
  };
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const INITIAL_MESSAGE: DiagnosisMessage = {
  id: 'initial-welcome-message',
  role: 'assistant',
  content:
    "Hello! I'm your AI Failure Analyst. Paste your code or ask about your competitive programming failure patterns — I'll analyze the evidence and give you a targeted diagnosis.",
  timestamp: new Date(),
};

const STORAGE_KEY = 'failureatlas_diagnosis_entries';

export function useDiagnosisData() {
  const [messages, setMessages] = useState<DiagnosisMessage[]>([INITIAL_MESSAGE]);
  const [entries, setEntries] = useState<DiagnosisEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [currentStage, setCurrentStage] = useState<DiagnosisStage | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [stageTimings, setStageTimings] = useState<Partial<Record<StageKey, number>>>({});
  const [errorState, setErrorState] = useState<{
    stage: string;
    message: string;
    requestId?: string;
    retryable?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<DiagnosisData | null>(null);
  const [latestSubmissionId, setLatestSubmissionId] = useState<string | null>(null);

  const stageStartTimesRef = useRef<Partial<Record<DiagnosisStage, number>>>({});
  const currentStageRef = useRef<DiagnosisStage | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load entries from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setEntries(parsed);
          if (parsed.length > 0) {
            setActiveId(parsed[parsed.length - 1].id);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveEntry = useCallback((entry: DiagnosisEntry) => {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.id !== entry.id);
      const updated = [...filtered, entry].slice(-20);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
    setActiveId(entry.id);
  }, []);

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

  const openEntry = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const activeEntry: DiagnosisEntry | null =
    entries.find((e) => e.id === activeId) ?? entries.at(-1) ?? null;

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
      setErrorState(null);
      setCurrentStage('routing');
      setElapsedMs(0);
      setStageTimings({});
      stageStartTimesRef.current = { routing: Date.now() };
      currentStageRef.current = 'routing';

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
          let errorReceived = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() || '';

            for (const chunk of chunks) {
              const lines = chunk.split('\n');
              let eventType = '';
              let jsonStr = '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('event:')) {
                  eventType = trimmed.slice(6).trim();
                } else if (trimmed.startsWith('data:')) {
                  jsonStr = trimmed.slice(5).trim();
                }
              }

              if (!jsonStr) continue;

              try {
                const event = JSON.parse(jsonStr);
                const resolvedType = eventType || event.type;

                if (resolvedType === 'stage' && event.stage) {
                  const newStage = event.stage as DiagnosisStage;
                  const prev = currentStageRef.current;
                  if (prev && stageStartTimesRef.current[prev]) {
                    const duration = Date.now() - stageStartTimesRef.current[prev];
                    setStageTimings((st) => ({ ...st, [prev]: duration }));
                  }
                  currentStageRef.current = newStage;
                  stageStartTimesRef.current[newStage] = Date.now();
                  setCurrentStage(newStage);
                } else if (resolvedType === 'result' || resolvedType === 'answer') {
                  answerReceived = true;
                  const finalElapsed = Date.now() - startTime;
                  setElapsedMs(finalElapsed);

                  const diagV2: QueryAwareDiagnosis | undefined =
                    event.diagnosisV2 || event.data?.diagnosisV2;

                  const assistantMsgId = generateId();

                  if (diagV2) {
                    saveEntry({
                      id: assistantMsgId,
                      createdAt: Date.now(),
                      query,
                      result: diagV2,
                    });
                  }

                  const data: DiagnosisData = event.data || event.evidence;
                  if (data) {
                    setLastResult(data);
                    if (data.latestSubmissionId) {
                      setLatestSubmissionId(data.latestSubmissionId);
                    }
                  }

                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMsgId,
                      role: 'assistant',
                      content: event.content || data?.analysis,
                      diagnosisV2: diagV2,
                      timestamp: new Date(),
                      elapsedMs: finalElapsed,
                    },
                  ]);
                } else if (resolvedType === 'error') {
                  errorReceived = true;
                  const finalElapsed = Date.now() - startTime;
                  setElapsedMs(finalElapsed);
                  const errorStage = event.stage || currentStageRef.current || 'routing';
                  const errorMsg = event.message || event.error || 'Failed to generate diagnosis';

                  setErrorState({
                    stage: errorStage,
                    message: errorMsg,
                    requestId: event.requestId,
                    retryable: event.retryable ?? true,
                  });

                  const assistantMsgId = generateId();
                  saveEntry({
                    id: assistantMsgId,
                    createdAt: Date.now(),
                    query,
                    error: {
                      stage: errorStage,
                      message: errorMsg,
                      requestId: event.requestId,
                      retryable: event.retryable ?? true,
                    },
                  });

                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMsgId,
                      role: 'assistant',
                      content: `Failed at ${errorStage}: ${errorMsg}`,
                      timestamp: new Date(),
                      elapsedMs: finalElapsed,
                      isError: true,
                      error: {
                        stage: errorStage,
                        message: errorMsg,
                        requestId: event.requestId,
                        retryable: event.retryable ?? true,
                      },
                    },
                  ]);
                }
              } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
                  console.warn('Diagnosis SSE parse error:', parseErr);
                }
              }
            }
          }

          if (!answerReceived && !errorReceived) {
            const finalElapsed = Date.now() - startTime;
            setElapsedMs(finalElapsed);
            const fallbackStage = currentStageRef.current || 'routing';
            const fallbackMsg = 'Analysis stream ended before response was complete.';

            setErrorState({
              stage: fallbackStage,
              message: fallbackMsg,
              retryable: true,
            });

            const assistantMsgId = generateId();
            saveEntry({
              id: assistantMsgId,
              createdAt: Date.now(),
              query,
              error: {
                stage: fallbackStage,
                message: fallbackMsg,
                retryable: true,
              },
            });

            setMessages((prev) => [
              ...prev,
              {
                id: assistantMsgId,
                role: 'assistant',
                content: `Failed at ${fallbackStage}: ${fallbackMsg}`,
                timestamp: new Date(),
                elapsedMs: finalElapsed,
                isError: true,
                error: {
                  stage: fallbackStage,
                  message: fallbackMsg,
                  retryable: true,
                },
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

          const diagV2: QueryAwareDiagnosis | undefined =
            json.diagnosisV2 || json.data?.diagnosisV2;
          const assistantMsgId = generateId();

          if (diagV2) {
            saveEntry({
              id: assistantMsgId,
              createdAt: Date.now(),
              query,
              result: diagV2,
            });
          }

          const data: DiagnosisData = json.data || json.evidence;
          if (data) {
            setLastResult(data);
            if (data.latestSubmissionId) {
              setLatestSubmissionId(data.latestSubmissionId);
            }
          }

          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: 'assistant',
              content: json.content || data?.analysis,
              diagnosisV2: diagV2,
              timestamp: new Date(),
              elapsedMs: finalElapsed,
            },
          ]);
        }
      } catch (err: any) {
        console.error('Diagnosis request error:', err);
        const finalElapsed = Date.now() - startTime;
        setElapsedMs(finalElapsed);
        const errorMsg = err?.message || 'Failed to connect to diagnosis service';
        const errorStage = currentStageRef.current || 'routing';

        setErrorState({
          stage: errorStage,
          message: errorMsg,
          retryable: true,
        });

        const assistantMsgId = generateId();
        saveEntry({
          id: assistantMsgId,
          createdAt: Date.now(),
          query,
          error: {
            stage: errorStage,
            message: errorMsg,
            retryable: true,
          },
        });

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: `⚠️ Failed at ${errorStage}: ${errorMsg}`,
            timestamp: new Date(),
            elapsedMs: finalElapsed,
            isError: true,
            error: {
              stage: errorStage,
              message: errorMsg,
              retryable: true,
            },
          },
        ]);
      } finally {
        stopTimer();
        setIsLoading(false);
      }
    },
    [isLoading, stopTimer, saveEntry]
  );

  const retryLastQuery = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg?.content) {
      askQuestion(lastUserMsg.content);
    }
  }, [messages, askQuestion]);

  return {
    messages,
    entries,
    activeId,
    activeEntry,
    openEntry,
    askQuestion,
    sendMessage: askQuestion,
    currentStage,
    elapsedMs,
    stageTimings,
    isLoading,
    errorState,
    error: errorState,
    retryLastQuery,
    currentEvidence: lastResult,
    lastResult,
    latestSubmissionId,
    setLatestSubmissionId,
  };
}
