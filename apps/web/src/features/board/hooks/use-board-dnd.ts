'use client';

import { useState, useCallback, useRef } from 'react';
import {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Board, CardItem, Column } from '../types';

function findColumnByCardId(columns: Column[], cardId: string): Column | undefined {
  return columns.find((col) => col.cards.some((card) => card.id === cardId));
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/**
 * React 18 자동 배치로 인해 setBoard(updater)의 업데이터 함수는 렌더링 단계까지
 * 지연 실행된다. 따라서 boardRef를 동기적으로 유지하여 handleDragEnd에서
 * 최신 보드 상태를 즉시 읽을 수 있도록 한다.
 */
export function useBoardDnd(
  setBoard: React.Dispatch<React.SetStateAction<Board | null>>,
  moveCard: (cardId: string, columnId: string, position: number) => Promise<void>,
  refetchBoard: () => void,
) {
  const [activeCard, setActiveCard] = useState<CardItem | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  // 최신 보드 상태를 동기적으로 추적하는 ref
  const boardRef = useRef<Board | null>(null);

  // boardRef를 동기 업데이트하면서 React 상태도 갱신
  const updateBoard = useCallback(
    (updater: (prev: Board | null) => Board | null) => {
      const next = updater(boardRef.current);
      boardRef.current = next;
      setBoard(next);
    },
    [setBoard],
  );

  // 외부에서 board 상태가 변경될 때 (초기 로드, refetch 등) ref 동기화를 위한 setter
  const syncRef = useCallback((board: Board | null) => {
    boardRef.current = board;
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const card = active.data.current?.card as CardItem | undefined;
      const colId = active.data.current?.columnId as string | undefined;
      if (card) {
        setActiveCard(card);
        setActiveColumnId(colId || null);
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      updateBoard((prev) => {
        if (!prev) return prev;

        const activeColumn = findColumnByCardId(prev.columns, activeId);
        const overColumn =
          findColumnByCardId(prev.columns, overId) ||
          prev.columns.find((col) => col.id === overId);
        if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) {
          return prev;
        }

        const activeColIndex = prev.columns.findIndex(
          (c) => c.id === activeColumn.id,
        );
        const overColIndex = prev.columns.findIndex(
          (c) => c.id === overColumn.id,
        );
        if (activeColIndex < 0 || overColIndex < 0) return prev;

        const activeCardIndex = prev.columns[activeColIndex].cards.findIndex(
          (c) => c.id === activeId,
        );
        if (activeCardIndex < 0) return prev;

        const overCardIndex = prev.columns[overColIndex].cards.findIndex(
          (c) => c.id === overId,
        );

        const newColumns = prev.columns.map((column) => ({
          ...column,
          cards: [...column.cards],
        }));

        const [movedCard] = newColumns[activeColIndex].cards.splice(activeCardIndex, 1);
        if (!movedCard) return prev;

        const insertIndex =
          overCardIndex >= 0 ? overCardIndex : newColumns[overColIndex].cards.length;

        newColumns[overColIndex].cards.splice(insertIndex, 0, movedCard);

        return { ...prev, columns: newColumns };
      });
    },
    [updateBoard],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);
      setActiveColumnId(null);

      if (!over) {
        refetchBoard();
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      // boardRef.current는 handleDragOver의 updateBoard에 의해 동기적으로 최신 상태
      const prev = boardRef.current;
      if (!prev) {
        refetchBoard();
        return;
      }

      const activeColumn = findColumnByCardId(prev.columns, activeId);
      const overColumn =
        findColumnByCardId(prev.columns, overId) ||
        prev.columns.find((col) => col.id === overId);

      if (!activeColumn || !overColumn) {
        refetchBoard();
        return;
      }

      const activeColIndex = prev.columns.findIndex((c) => c.id === activeColumn.id);
      const overColIndex = prev.columns.findIndex((c) => c.id === overColumn.id);
      if (activeColIndex < 0 || overColIndex < 0) {
        refetchBoard();
        return;
      }

      const newColumns = prev.columns.map((column) => ({
        ...column,
        cards: [...column.cards],
      }));

      const activeCardIndex = newColumns[activeColIndex].cards.findIndex(
        (c) => c.id === activeId,
      );
      if (activeCardIndex < 0) {
        refetchBoard();
        return;
      }

      let targetColumnId: string;
      let targetPosition: number;

      if (activeColumn.id === overColumn.id) {
        // 같은 컬럼 내 재정렬
        const overCardIndex = newColumns[overColIndex].cards.findIndex(
          (c) => c.id === overId,
        );
        const fallbackIndex = newColumns[overColIndex].cards.length - 1;
        const ti = clamp(
          overCardIndex >= 0 ? overCardIndex : fallbackIndex,
          newColumns[overColIndex].cards.length - 1,
        );
        const reordered = arrayMove(newColumns[overColIndex].cards, activeCardIndex, ti);
        newColumns[overColIndex].cards = reordered;

        const finalPos = reordered.findIndex((c) => c.id === activeId);
        targetColumnId = overColumn.id;
        targetPosition = finalPos >= 0 ? finalPos : 0;
      } else {
        // 다른 컬럼으로 이동
        const [movedCard] = newColumns[activeColIndex].cards.splice(activeCardIndex, 1);
        if (!movedCard) {
          refetchBoard();
          return;
        }

        const overCardIndex = newColumns[overColIndex].cards.findIndex(
          (c) => c.id === overId,
        );
        const insertIndex = clamp(
          overCardIndex >= 0 ? overCardIndex : newColumns[overColIndex].cards.length,
          newColumns[overColIndex].cards.length,
        );
        newColumns[overColIndex].cards.splice(insertIndex, 0, movedCard);

        targetColumnId = overColumn.id;
        targetPosition = insertIndex;
      }

      // UI 상태 동기 업데이트 (ref + React state)
      const newBoard = { ...prev, columns: newColumns };
      boardRef.current = newBoard;
      setBoard(newBoard);

      // API 호출 — targetColumnId/targetPosition은 동기적으로 계산됨
      moveCard(activeId, targetColumnId, targetPosition).catch(() => {
        refetchBoard();
      });
    },
    [moveCard, refetchBoard, setBoard],
  );

  return {
    activeCard,
    activeColumnId,
    syncRef,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
