'use client';

import { useCallback } from 'react';
import { fetcher } from '@/api/fetcher';

export function useBoardCards(
  projectId: string,
  boardId: string,
  refetch: () => void,
) {
  const addCard = useCallback(
    async (columnId: string, title: string) => {
      await fetcher({
        url: `/projects/${projectId}/boards/${boardId}/cards`,
        method: 'POST',
        data: { title, columnId },
      });
      refetch();
    },
    [projectId, boardId, refetch],
  );

  const updateCard = useCallback(
    async (cardId: string, data: { title?: string; description?: string; priority?: string }) => {
      await fetcher({
        url: `/projects/${projectId}/boards/${boardId}/cards/${cardId}`,
        method: 'PATCH',
        data,
      });
      refetch();
    },
    [projectId, boardId, refetch],
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      await fetcher({
        url: `/projects/${projectId}/boards/${boardId}/cards/${cardId}`,
        method: 'DELETE',
      });
      refetch();
    },
    [projectId, boardId, refetch],
  );

  const deleteColumn = useCallback(
    async (columnId: string) => {
      await fetcher({
        url: `/projects/${projectId}/boards/${boardId}/columns/${columnId}`,
        method: 'DELETE',
      });
      refetch();
    },
    [projectId, boardId, refetch],
  );

  const moveCard = useCallback(
    async (cardId: string, columnId: string, position: number) => {
      await fetcher({
        url: `/projects/${projectId}/boards/${boardId}/cards/${cardId}/move`,
        method: 'PATCH',
        data: { columnId, position },
      });
    },
    [projectId, boardId],
  );

  return { addCard, updateCard, deleteCard, deleteColumn, moveCard };
}
