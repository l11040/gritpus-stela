'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetcher } from '@/api/fetcher';
import type { Board } from '../types';

export function useBoard(projectId: string, boardId: string) {
  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBoard = useCallback(
    (silent: boolean) => {
      if (!silent) setIsLoading(true);
      fetcher<Board>({ url: `/projects/${projectId}/boards/${boardId}`, method: 'GET' })
        .then(setBoard)
        .catch(() => {})
        .finally(() => {
          if (!silent) setIsLoading(false);
        });
    },
    [projectId, boardId],
  );

  useEffect(() => {
    fetchBoard(false);
  }, [fetchBoard]);

  // refetch는 스켈레톤 없이 백그라운드에서 갱신
  const refetch = useCallback(() => fetchBoard(true), [fetchBoard]);

  return { board, setBoard, isLoading, refetch };
}
