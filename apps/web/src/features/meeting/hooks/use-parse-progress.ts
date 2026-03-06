'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetcher } from '@/api/fetcher';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';
const STORAGE_KEY = 'gritpus-parsing-jobs';

export interface ParseProgressEvent {
  step:
    | 'started'
    | 'analyzing'
    | 'agent_iteration'
    | 'agent_tool'
    | 'resolving_assignees'
    | 'summarizing'
    | 'completed'
    | 'failed';
  message: string;
  detail?: string;
  iteration?: number;
  maxIterations?: number;
  timestamp: number;
}

export interface ParsingJob {
  meetingId: string;
  projectId: string;
  meetingTitle: string;
  startedAt: number;
}

interface ParseProgressState {
  job: ParsingJob | null;
  events: ParseProgressEvent[];
  currentStep: ParseProgressEvent | null;
  isComplete: boolean;
  isFailed: boolean;
}

function loadJob(): ParsingJob | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveJob(job: ParsingJob | null) {
  if (typeof window === 'undefined') return;
  if (job) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function useParseProgress() {
  const [state, setState] = useState<ParseProgressState>({
    job: null,
    events: [],
    currentStep: null,
    isComplete: false,
    isFailed: false,
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const onCompleteRef = useRef<((meetingId: string) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connectSSE = useCallback((job: ParsingJob) => {
    cleanup();

    const url = `${API_BASE}/projects/${job.projectId}/meetings/${job.meetingId}/parse/events`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: ParseProgressEvent = JSON.parse(event.data);
        setState((prev) => {
          const duplicate = prev.events.some(
            (existing) =>
              existing.timestamp === data.timestamp &&
              existing.step === data.step &&
              existing.message === data.message,
          );
          if (duplicate) {
            return prev;
          }

          const events = [...prev.events, data];
          const isComplete = data.step === 'completed';
          const isFailed = data.step === 'failed';

          if (isComplete || isFailed) {
            saveJob(null);
            onCompleteRef.current?.(job.meetingId);
          }

          return {
            ...prev,
            events,
            currentStep: data,
            isComplete,
            isFailed,
          };
        });
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // SSE connection lost — check if meeting is still parsing
      es.close();
      eventSourceRef.current = null;

      // Try to reconnect after a short delay if job is still active
      const savedJob = loadJob();
      if (savedJob && savedJob.meetingId === job.meetingId) {
        setTimeout(() => {
          // Check meeting status before reconnecting
          fetcher<{ status: string }>({
            url: `/projects/${job.projectId}/meetings/${job.meetingId}`,
            method: 'GET',
          })
            .then((meeting) => {
              if (meeting.status === 'parsing') {
                connectSSE(job);
              } else {
                saveJob(null);
                setState((prev) => ({
                  ...prev,
                  isComplete: meeting.status === 'parsed' || meeting.status === 'confirmed',
                  isFailed: meeting.status === 'failed',
                  currentStep: {
                    step: meeting.status === 'parsed' || meeting.status === 'confirmed' ? 'completed' : 'failed',
                    message: meeting.status === 'parsed' || meeting.status === 'confirmed' ? '파싱이 완료되었습니다!' : 'AI 파싱에 실패했습니다.',
                    timestamp: Date.now(),
                  },
                }));
                onCompleteRef.current?.(job.meetingId);
              }
            })
            .catch(() => {
              saveJob(null);
              setState((prev) => ({
                ...prev,
                isFailed: true,
                currentStep: {
                  step: 'failed',
                  message: '연결이 끊어졌습니다.',
                  timestamp: Date.now(),
                },
              }));
            });
        }, 2000);
      }
    };
  }, [cleanup]);

  // Restore from localStorage on mount
  useEffect(() => {
    const savedJob = loadJob();
    if (!savedJob) return cleanup;

    fetcher<{ status: string }>({
      url: `/projects/${savedJob.projectId}/meetings/${savedJob.meetingId}`,
      method: 'GET',
    })
      .then((meeting) => {
        if (meeting.status !== 'parsing') {
          saveJob(null);
          setState((prev) => ({
            ...prev,
            job: null,
            isComplete: meeting.status === 'parsed' || meeting.status === 'confirmed',
            isFailed: meeting.status === 'failed',
            currentStep: {
              step: meeting.status === 'parsed' || meeting.status === 'confirmed' ? 'completed' : 'failed',
              message: meeting.status === 'parsed' || meeting.status === 'confirmed' ? '파싱이 완료되었습니다!' : '파싱 작업이 종료되었습니다.',
              timestamp: Date.now(),
            },
          }));
          return;
        }

        setState((prev) => ({ ...prev, job: savedJob }));
        connectSSE(savedJob);
      })
      .catch(() => {
        saveJob(null);
      });

    return cleanup;
  }, [connectSSE, cleanup]);

  const startParsing = useCallback(
    async (projectId: string, meetingId: string, meetingTitle: string) => {
      const job: ParsingJob = {
        meetingId,
        projectId,
        meetingTitle,
        startedAt: Date.now(),
      };

      saveJob(job);
      setState({
        job,
        events: [],
        currentStep: null,
        isComplete: false,
        isFailed: false,
      });

      // Fire-and-forget parse request
      await fetcher({
        url: `/projects/${projectId}/meetings/${meetingId}/parse`,
        method: 'POST',
      });

      // Connect SSE
      connectSSE(job);
    },
    [connectSSE],
  );

  const cancelParsing = useCallback(async () => {
    const job = state.job;
    if (!job) return;

    try {
      const result = await fetcher<{ cancelled: boolean; message: string }>({
        url: `/projects/${job.projectId}/meetings/${job.meetingId}/parse/cancel`,
        method: 'POST',
      });

      if (!result?.cancelled) {
        cleanup();
        saveJob(null);
        setState((prev) => ({
          ...prev,
          job: null,
          isComplete: false,
          isFailed: true,
          currentStep: {
            step: 'failed',
            message: result?.message || '중단할 파싱 작업이 없습니다.',
            timestamp: Date.now(),
          },
        }));
        return;
      }

      cleanup();
      saveJob(null);
      setState((prev) => ({
        ...prev,
        job: null,
        isComplete: false,
        isFailed: true,
        currentStep: {
          step: 'failed',
          message: '사용자 요청으로 파싱을 중단했습니다.',
          timestamp: Date.now(),
        },
      }));
      onCompleteRef.current?.(job.meetingId);
    } catch {
      setState((prev) => ({
        ...prev,
        currentStep: {
          step: 'failed',
          message: '파싱 중단 요청에 실패했습니다.',
          timestamp: Date.now(),
        },
      }));
    }
  }, [cleanup, state.job]);

  const dismiss = useCallback(() => {
    cleanup();
    saveJob(null);
    setState({
      job: null,
      events: [],
      currentStep: null,
      isComplete: false,
      isFailed: false,
    });
  }, [cleanup]);

  const onComplete = useCallback((cb: (meetingId: string) => void) => {
    onCompleteRef.current = cb;
  }, []);

  return {
    job: state.job,
    events: state.events,
    currentStep: state.currentStep,
    isComplete: state.isComplete,
    isFailed: state.isFailed,
    isParsing: !!state.job && !state.isComplete && !state.isFailed,
    startParsing,
    cancelParsing,
    dismiss,
    onComplete,
  };
}
