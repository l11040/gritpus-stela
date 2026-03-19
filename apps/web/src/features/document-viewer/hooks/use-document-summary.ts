'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetcher } from '@/api/fetcher';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

export interface SummaryProgressEvent {
  step: 'started' | 'analyzing' | 'summarizing' | 'completed' | 'failed';
  message: string;
  timestamp: number;
}

interface SummaryState {
  isProcessing: boolean;
  isComplete: boolean;
  isFailed: boolean;
  currentStep: SummaryProgressEvent | null;
}

export function useDocumentSummary(documentId: string) {
  const [state, setState] = useState<SummaryState>({
    isProcessing: false,
    isComplete: false,
    isFailed: false,
    currentStep: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startSummary = useCallback(async () => {
    cleanup();
    setState({
      isProcessing: true,
      isComplete: false,
      isFailed: false,
      currentStep: null,
    });

    await fetcher({
      url: `/md-documents/${documentId}/summarize`,
      method: 'POST',
    });

    const url = `${API_BASE}/md-documents/${documentId}/summarize/events`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: SummaryProgressEvent = JSON.parse(event.data);
        const isComplete = data.step === 'completed';
        const isFailed = data.step === 'failed';

        setState({
          isProcessing: !isComplete && !isFailed,
          isComplete,
          isFailed,
          currentStep: data,
        });

        if (isComplete || isFailed) {
          es.close();
          eventSourceRef.current = null;
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        isFailed: true,
        currentStep: {
          step: 'failed',
          message: '연결이 끊어졌습니다.',
          timestamp: Date.now(),
        },
      }));
    };
  }, [documentId, cleanup]);

  return {
    ...state,
    startSummary,
  };
}
