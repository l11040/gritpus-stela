'use client';

import { useCallback } from 'react';
import { fetcher } from '@/api/fetcher';

export function useBoardCards(
  projectId: string,
  boardId: string,
  refetch: () => void,
) {
  const addColumn = useCallback(
    async (name: string) => {
      await fetcher({
        url: `/projects/${projectId}/boards/${boardId}/columns`,
        method: 'POST',
        data: { name },
      });
      refetch();
    },
    [projectId, boardId, refetch],
  );

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
    async (
      cardId: string,
      data: {
        title?: string;
        description?: string;
        priority?: string;
        assigneeIds?: string[];
        dueDate?: string | null;
      },
    ) => {
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

  const deleteCards = useCallback(
    async (cardIds: string[]) => {
      if (cardIds.length === 0) return;

      const results = await Promise.allSettled(
        cardIds.map((cardId) =>
          fetcher<void>({
            url: `/projects/${projectId}/boards/${boardId}/cards/${cardId}`,
            method: 'DELETE',
          }),
        ),
      );

      refetch();

      const failedCount = results.filter((result) => result.status === 'rejected').length;
      if (failedCount > 0) {
        throw new Error(`FAILED_TO_DELETE_${failedCount}`);
      }
    },
    [projectId, boardId, refetch],
  );

  const updateColumn = useCallback(
    async (columnId: string, data: { name?: string; color?: string }) => {
      await fetcher({
        url: `/projects/${projectId}/boards/${boardId}/columns/${columnId}`,
        method: 'PATCH',
        data,
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

  return { addColumn, updateColumn, addCard, updateCard, deleteCard, deleteCards, deleteColumn, moveCard };
}
