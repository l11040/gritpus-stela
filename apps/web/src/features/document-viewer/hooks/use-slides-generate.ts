'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetcher } from '@/api/fetcher';
import type { SlidesJson } from '../types';

const POLL_INTERVAL = 3000;

interface UseSlidesGenerateResult {
  slides: SlidesJson | null;
  isGenerating: boolean;
  error: string | null;
  generate: () => void;
  setSlides: (s: SlidesJson | null) => void;
}

export function useSlidesGenerate(documentId: string): UseSlidesGenerateResult {
  const [slides, setSlides] = useState<SlidesJson | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const fetchSlides = useCallback(async (): Promise<SlidesJson | null> => {
    try {
      const result = await fetcher<SlidesJson | null>({
        url: `/md-documents/${documentId}/slides`,
        method: 'GET',
      });
      if (result && Array.isArray(result.slides) && result.slides.length > 1) {
        return result;
      }
      return null;
    } catch {
      return null;
    }
  }, [documentId]);

  const startPolling = useCallback(() => {
    cleanup();
    pollRef.current = setInterval(async () => {
      const result = await fetchSlides();
      if (result) {
        cleanup();
        setSlides(result);
        setIsGenerating(false);
      }
    }, POLL_INTERVAL);
  }, [cleanup, fetchSlides]);

  const generate = useCallback(async () => {
    cleanup();
    setIsGenerating(true);
    setError(null);

    try {
      await fetcher({
        url: `/md-documents/${documentId}/slides/generate`,
        method: 'POST',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '슬라이드 생성 요청에 실패했습니다.');
      setIsGenerating(false);
      return;
    }

    // 폴링으로 완료 감지
    startPolling();
  }, [documentId, cleanup, startPolling]);

  return { slides, isGenerating, error, generate, setSlides };
}
