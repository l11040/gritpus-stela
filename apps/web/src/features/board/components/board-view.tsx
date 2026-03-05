'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useBoard } from '../hooks/use-board';
import { useBoardCards } from '../hooks/use-board-cards';
import { useBoardDnd } from '../hooks/use-board-dnd';
import { BoardColumn } from './board-column';
import { BoardCardOverlay } from './board-card-overlay';
import { CardEditDialog } from './card-edit-dialog';
import { toast } from 'sonner';
import type { CardItem } from '../types';

interface BoardViewProps {
  projectId: string;
  boardId: string;
}

export function BoardView({ projectId, boardId }: BoardViewProps) {
  const { board, setBoard, isLoading, refetch } = useBoard(projectId, boardId);
  const { addCard, updateCard, deleteCard, deleteColumn, moveCard } = useBoardCards(
    projectId,
    boardId,
    refetch,
  );
  const [editCard, setEditCard] = useState<CardItem | null>(null);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [deletingColumn, setDeletingColumn] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const {
    activeCard,
    syncRef,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useBoardDnd(setBoard, moveCard, refetch);

  // boardRef를 React 상태와 동기화 (초기 로드, refetch 시)
  useEffect(() => {
    syncRef(board);
  }, [board, syncRef]);

  if (isLoading || !board) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-68 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {board.columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              onEditCard={setEditCard}
              onAddCard={addCard}
              onDeleteColumn={setDeleteColumnId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard && <BoardCardOverlay card={activeCard} />}
        </DragOverlay>
      </DndContext>

      <CardEditDialog
        card={editCard}
        open={!!editCard}
        onOpenChange={(open) => !open && setEditCard(null)}
        onSave={(cardId, data) => updateCard(cardId, data)}
        onDelete={(cardId) => deleteCard(cardId)}
      />

      <ConfirmDialog
        open={!!deleteColumnId}
        onOpenChange={(open) => !open && setDeleteColumnId(null)}
        title="컬럼 삭제"
        description="이 컬럼과 포함된 모든 카드가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        onConfirm={async () => {
          if (!deleteColumnId) return;
          setDeletingColumn(true);
          try {
            await deleteColumn(deleteColumnId);
            toast.success('컬럼이 삭제되었습니다.');
          } catch {
            toast.error('컬럼 삭제에 실패했습니다.');
          } finally {
            setDeletingColumn(false);
            setDeleteColumnId(null);
          }
        }}
        loading={deletingColumn}
      />
    </>
  );
}
