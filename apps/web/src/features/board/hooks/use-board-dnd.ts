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
  selectedCardIds?: Set<string>,
) {
  const [activeCard, setActiveCard] = useState<CardItem | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const draggedCardIdsRef = useRef<Set<string>>(new Set());
  // 멀티드래그 시 보드에서 제거한 companion 카드를 보관
  const companionsRef = useRef<CardItem[]>([]);

  const boardRef = useRef<Board | null>(null);

  const updateBoard = useCallback(
    (updater: (prev: Board | null) => Board | null) => {
      const next = updater(boardRef.current);
      boardRef.current = next;
      setBoard(next);
    },
    [setBoard],
  );

  const syncRef = useCallback((board: Board | null) => {
    boardRef.current = board;
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const card = active.data.current?.card as CardItem | undefined;
      const colId = active.data.current?.columnId as string | undefined;
      if (!card) return;

      setActiveCard(card);
      setActiveColumnId(colId || null);

      const isMulti = selectedCardIds && selectedCardIds.has(card.id) && selectedCardIds.size > 1;
      if (isMulti) {
        draggedCardIdsRef.current = new Set(selectedCardIds);
        const companionIds = new Set(selectedCardIds);
        companionIds.delete(card.id);

        // companion 카드를 보드 데이터에서 제거하여 dnd-kit 간섭 방지
        updateBoard((prev) => {
          if (!prev) return prev;
          const removed: CardItem[] = [];
          const newColumns = prev.columns.map((col) => ({
            ...col,
            cards: col.cards.filter((c) => {
              if (companionIds.has(c.id)) {
                removed.push(c);
                return false;
              }
              return true;
            }),
          }));
          companionsRef.current = removed;
          return { ...prev, columns: newColumns };
        });
      } else {
        draggedCardIdsRef.current = new Set([card.id]);
        companionsRef.current = [];
      }
    },
    [selectedCardIds, updateBoard],
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
      const companions = companionsRef.current;
      setActiveCard(null);
      setActiveColumnId(null);
      draggedCardIdsRef.current = new Set();
      companionsRef.current = [];

      if (!over) {
        refetchBoard();
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      const prev = boardRef.current;
      if (!prev) {
        refetchBoard();
        return;
      }

      // over 요소로부터 타겟 컬럼 결정
      const overColumn =
        findColumnByCardId(prev.columns, overId) ||
        prev.columns.find((col) => col.id === overId);
      if (!overColumn) {
        refetchBoard();
        return;
      }

      const newColumns = prev.columns.map((column) => ({
        ...column,
        cards: [...column.cards],
      }));

      const isMultiDrag = companions.length > 0;

      if (isMultiDrag) {
        // ── 멀티드래그: 주 카드를 원래 위치에서 제거 후 companions와 함께 타겟 컬럼에 삽입 ──
        let activeCardData: CardItem | undefined;
        for (const col of newColumns) {
          const idx = col.cards.findIndex((c) => c.id === activeId);
          if (idx >= 0) {
            [activeCardData] = col.cards.splice(idx, 1);
            break;
          }
        }
        if (!activeCardData) {
          refetchBoard();
          return;
        }

        const targetCol = newColumns.find((c) => c.id === overColumn.id);
        if (!targetCol) {
          refetchBoard();
          return;
        }

        // over 카드 위치 기준으로 삽입 위치 결정
        const overCardIndex = targetCol.cards.findIndex((c) => c.id === overId);
        const insertAt = overCardIndex >= 0 ? overCardIndex : targetCol.cards.length;

        // 주 카드 + companions를 한꺼번에 삽입
        const allCards = [activeCardData, ...companions];
        targetCol.cards.splice(insertAt, 0, ...allCards);

        const newBoard = { ...prev, columns: newColumns };
        boardRef.current = newBoard;
        setBoard(newBoard);

        // API: 각 카드를 타겟 컬럼의 최종 위치로 이동
        const promises = allCards.map((card, i) =>
          moveCard(card.id, overColumn.id, insertAt + i),
        );
        Promise.allSettled(promises).then(() => refetchBoard());
      } else {
        // ── 단일 카드 드래그 ──
        const activeColumn = findColumnByCardId(prev.columns, activeId);
        if (!activeColumn) {
          refetchBoard();
          return;
        }

        const activeColIndex = prev.columns.findIndex((c) => c.id === activeColumn.id);
        const overColIndex = prev.columns.findIndex((c) => c.id === overColumn.id);
        if (activeColIndex < 0 || overColIndex < 0) {
          refetchBoard();
          return;
        }

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

        const newBoard = { ...prev, columns: newColumns };
        boardRef.current = newBoard;
        setBoard(newBoard);

        moveCard(activeId, targetColumnId, targetPosition).catch(() => {
          refetchBoard();
        });
      }
    },
    [moveCard, refetchBoard, setBoard],
  );

  return {
    activeCard,
    activeColumnId,
    draggedCardIds: draggedCardIdsRef,
    syncRef,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
