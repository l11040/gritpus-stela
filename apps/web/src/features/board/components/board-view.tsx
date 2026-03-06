'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type { DropAnimation } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { fetcher } from '@/api/fetcher';
import { useBoard } from '../hooks/use-board';
import { useBoardCards } from '../hooks/use-board-cards';
import { useBoardDnd } from '../hooks/use-board-dnd';
import { BoardColumn } from './board-column';
import { BoardCardOverlay } from './board-card-overlay';
import { CardEditDialog } from './card-edit-dialog';
import { AddColumnForm } from './add-column-form';
import { Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CardItem } from '../types';

const SELECTION_DISTANCE_THRESHOLD = 8;
const AUTO_SCROLL_EDGE = 40; // 가장자리에서 이 px 이내면 자동 스크롤
const AUTO_SCROLL_SPEED = 12; // 프레임당 스크롤 px

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
  duration: 200,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
};

interface Point {
  x: number;
  y: number;
}

interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SelectionSnapshot {
  start: Point;
  cards: { id: string; rect: DOMRect }[];
  /** snapshot 시점의 스크롤 위치 (스크롤 보정용) */
  scrollTop: number;
  scrollLeft: number;
}

interface BoardViewProps {
  projectId: string;
  boardId: string;
}

interface ProjectMember {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

function buildSelectionBox(start: Point, end: Point): SelectionBox {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function intersectsSelectionBox(box: SelectionBox, rect: DOMRect): boolean {
  const boxRight = box.left + box.width;
  const boxBottom = box.top + box.height;
  const rectRight = rect.left + rect.width;
  const rectBottom = rect.top + rect.height;

  return (
    box.left < rectRight &&
    boxRight > rect.left &&
    box.top < rectBottom &&
    boxBottom > rect.top
  );
}

export function BoardView({ projectId, boardId }: BoardViewProps) {
  const { board, setBoard, isLoading, refetch } = useBoard(projectId, boardId);
  const {
    addColumn,
    updateColumn,
    addCard,
    updateCard,
    deleteCard,
    deleteCards,
    deleteColumn,
    moveCard,
    reorderColumnCards,
  } = useBoardCards(projectId, boardId, refetch);
  const [editCard, setEditCard] = useState<CardItem | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [deletingColumn, setDeletingColumn] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [deletingSelectedCards, setDeletingSelectedCards] = useState(false);
  const boardCanvasRef = useRef<HTMLDivElement | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const selectionSnapshotRef = useRef<SelectionSnapshot | null>(null);
  const [canvasMinHeight, setCanvasMinHeight] = useState<number>(0);
  const selectedCount = selectedCardIds.size;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const {
    activeCard,
    draggedCardIds,
    syncRef,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useBoardDnd(setBoard, moveCard, reorderColumnCards, refetch, selectedCardIds);

  // boardRef를 React 상태와 동기화 (초기 로드, refetch 시)
  useEffect(() => {
    syncRef(board);
  }, [board, syncRef]);

  useEffect(() => {
    fetcher<ProjectMember[]>({
      url: `/projects/${projectId}/members`,
      method: 'GET',
    })
      .then((data) => setMembers(data))
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!board || activeCard) return; // 드래그 중에는 정리하지 않음

    const validCardIds = new Set(
      board.columns.flatMap((column) => column.cards.map((card) => card.id)),
    );
    setSelectedCardIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set([...prev].filter((id) => validCardIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [board, activeCard]);

  useEffect(() => {
    if (selectedCount > 0) return;
    if (deleteSelectedOpen) setDeleteSelectedOpen(false);
  }, [selectedCount, deleteSelectedOpen]);

  useEffect(() => {
    if (!activeCard && !isSelecting) return;

    const previous = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.userSelect = previous;
    };
  }, [activeCard, isSelecting]);

  useEffect(() => {
    const container = boardContainerRef.current;
    if (!container) return;

    const updateCanvasMinHeight = () => {
      const containerHeight = Math.floor(container.clientHeight);
      const available = Math.max(320, containerHeight);
      setCanvasMinHeight((prev) => (prev === available ? prev : available));
    };

    updateCanvasMinHeight();
    window.addEventListener('resize', updateCanvasMinHeight);
    window.addEventListener('orientationchange', updateCanvasMinHeight);
    window.visualViewport?.addEventListener('resize', updateCanvasMinHeight);
    const containerResizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateCanvasMinHeight)
        : null;
    containerResizeObserver?.observe(container);
    const raf = requestAnimationFrame(updateCanvasMinHeight);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateCanvasMinHeight);
      window.removeEventListener('orientationchange', updateCanvasMinHeight);
      window.visualViewport?.removeEventListener('resize', updateCanvasMinHeight);
      containerResizeObserver?.disconnect();
    };
  }, [boardId]);

  const getScrollContainer = useCallback((): HTMLElement | null => {
    return boardCanvasRef.current;
  }, []);

  const autoScrollRafRef = useRef<number>(0);
  const lastPointerRef = useRef<Point>({ x: 0, y: 0 });

  const updateSelectionFromPointer = useCallback((x: number, y: number) => {
    const snapshot = selectionSnapshotRef.current;
    if (!snapshot) return;

    lastPointerRef.current = { x, y };

    // 스크롤 변화량을 반영하여 selection box 계산
    const scrollContainer = getScrollContainer();
    const canvas = boardCanvasRef.current;
    const scrollDeltaY = scrollContainer ? scrollContainer.scrollTop - snapshot.scrollTop : 0;
    const scrollDeltaX = canvas ? canvas.scrollLeft - snapshot.scrollLeft : 0;

    // 스크롤 보정된 시작점 (화면 좌표 기준)
    const adjustedStart: Point = {
      x: snapshot.start.x - scrollDeltaX,
      y: snapshot.start.y - scrollDeltaY,
    };

    const box = buildSelectionBox(adjustedStart, { x, y });
    setSelectionBox(box);

    // 카드 rect도 스크롤 보정하여 비교
    const next = new Set<string>();
    for (const card of snapshot.cards) {
      const adjustedRect = new DOMRect(
        card.rect.x - scrollDeltaX,
        card.rect.y - scrollDeltaY,
        card.rect.width,
        card.rect.height,
      );
      if (intersectsSelectionBox(box, adjustedRect)) {
        next.add(card.id);
      }
    }
    setSelectedCardIds(next);
  }, [getScrollContainer]);

  const performAutoScroll = useCallback(() => {
    const { x, y } = lastPointerRef.current;
    const scrollContainer = getScrollContainer();
    const canvas = boardCanvasRef.current;
    let scrolled = false;

    // 수직 자동 스크롤 (보드 캔버스)
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      if (y < rect.top + AUTO_SCROLL_EDGE && scrollContainer.scrollTop > 0) {
        scrollContainer.scrollTop -= AUTO_SCROLL_SPEED;
        scrolled = true;
      } else if (y > rect.bottom - AUTO_SCROLL_EDGE &&
        scrollContainer.scrollTop < scrollContainer.scrollHeight - scrollContainer.clientHeight) {
        scrollContainer.scrollTop += AUTO_SCROLL_SPEED;
        scrolled = true;
      }
    }

    // 수평 자동 스크롤 (보드 캔버스)
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (x < rect.left + AUTO_SCROLL_EDGE && canvas.scrollLeft > 0) {
        canvas.scrollLeft -= AUTO_SCROLL_SPEED;
        scrolled = true;
      } else if (x > rect.right - AUTO_SCROLL_EDGE &&
        canvas.scrollLeft < canvas.scrollWidth - canvas.clientWidth) {
        canvas.scrollLeft += AUTO_SCROLL_SPEED;
        scrolled = true;
      }
    }

    // 스크롤 발생 시 selection box 업데이트
    if (scrolled) {
      updateSelectionFromPointer(x, y);
    }

    return scrolled;
  }, [getScrollContainer, updateSelectionFromPointer]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      // pending → 임계값 초과 시 selection 모드 활성화
      const pending = pendingSelectionRef.current;
      if (pending && !isSelecting) {
        const dx = event.clientX - pending.x;
        const dy = event.clientY - pending.y;
        if (Math.sqrt(dx * dx + dy * dy) >= SELECTION_DISTANCE_THRESHOLD) {
          const scrollContainer = getScrollContainer();
          const canvas = boardCanvasRef.current;
          selectionSnapshotRef.current = {
            start: { x: pending.x, y: pending.y },
            cards: pending.cards,
            scrollTop: scrollContainer?.scrollTop ?? 0,
            scrollLeft: canvas?.scrollLeft ?? 0,
          };
          pendingSelectionRef.current = null;
          clickedWithoutDragRef.current = false; // 드래그 선택 시작 → 클릭 해제 방지
          setSelectedCardIds(new Set());
          setIsSelecting(true);
          updateSelectionFromPointer(event.clientX, event.clientY);
        }
        return;
      }

      if (isSelecting) {
        updateSelectionFromPointer(event.clientX, event.clientY);
      }
    };

    const finishSelection = () => {
      pendingSelectionRef.current = null;
      cancelAnimationFrame(autoScrollRafRef.current);
      if (isSelecting) {
        selectionSnapshotRef.current = null;
        setIsSelecting(false);
        setSelectionBox(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishSelection);
    window.addEventListener('pointercancel', finishSelection);

    // 자동 스크롤 루프 (selection 중일 때만)
    let running = isSelecting;
    const tick = () => {
      if (!running) return;
      performAutoScroll();
      autoScrollRafRef.current = requestAnimationFrame(tick);
    };
    if (isSelecting) {
      autoScrollRafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      running = false;
      cancelAnimationFrame(autoScrollRafRef.current);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishSelection);
      window.removeEventListener('pointercancel', finishSelection);
    };
  }, [isSelecting, updateSelectionFromPointer, getScrollContainer, performAutoScroll]);

  const pendingSelectionRef = useRef<{ x: number; y: number; cards: { id: string; rect: DOMRect }[] } | null>(null);

  const clickedWithoutDragRef = useRef(false);

  const handleSelectionStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || activeCard) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (
      target.closest('[data-board-card="true"]') ||
      target.closest('button, input, textarea, select, a, [role="button"], [data-slot="button"]')
    ) {
      return;
    }

    const canvas = boardCanvasRef.current;
    if (!canvas) return;

    // 빈 영역 클릭 시 선택 해제를 위한 플래그
    clickedWithoutDragRef.current = true;

    const cards = Array.from(
      canvas.querySelectorAll<HTMLElement>('[data-board-card-id]'),
    )
      .map((element) => {
        const id = element.dataset.boardCardId;
        if (!id) return null;
        return { id, rect: element.getBoundingClientRect() };
      })
      .filter((item): item is { id: string; rect: DOMRect } => item !== null);

    if (cards.length === 0) {
      // 카드가 없어도 클릭으로 선택 해제
      return;
    }

    // 즉시 selection 모드로 들어가지 않고, 임계값 이동 후 시작
    pendingSelectionRef.current = { x: event.clientX, y: event.clientY, cards };
    event.preventDefault();
  };

  const handleCanvasPointerUp = useCallback(() => {
    // 드래그 없이 빈 영역 클릭 → 선택 해제
    if (clickedWithoutDragRef.current && !isSelecting && selectedCount > 0) {
      setSelectedCardIds(new Set());
    }
    clickedWithoutDragRef.current = false;
  }, [isSelecting, selectedCount]);

  const handleAddColumn = async (name: string) => {
    try {
      await addColumn(name);
      toast.success('컬럼이 추가되었습니다.');
    } catch (error) {
      toast.error('컬럼 추가에 실패했습니다.');
      throw error;
    }
  };

  const handleDeleteSelectedCards = async () => {
    if (selectedCount === 0) return;

    const cardIds = [...selectedCardIds];
    setDeletingSelectedCards(true);
    try {
      await deleteCards(cardIds);
      toast.success(`${cardIds.length}개의 카드가 삭제되었습니다.`);
      setSelectedCardIds(new Set());
      setDeleteSelectedOpen(false);
    } catch {
      toast.error('선택한 카드 삭제에 실패했습니다.');
    } finally {
      setDeletingSelectedCards(false);
    }
  };

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
    <div ref={boardContainerRef} className="flex h-full min-h-0 flex-1 flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild disabled={selectedCount === 0}>
            <div
              ref={boardCanvasRef}
              className="scrollbar-hide flex min-h-full flex-1 select-none gap-3 overflow-auto px-8 pb-32"
              style={
                canvasMinHeight > 0
                  ? { minHeight: `${canvasMinHeight}px`, height: `${canvasMinHeight}px` }
                  : undefined
              }
              onPointerDown={handleSelectionStart}
              onPointerUp={handleCanvasPointerUp}
            >
          {board.columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              onEditCard={setEditCard}
              onAddCard={addCard}
              onUpdateColumn={updateColumn}
              onDeleteColumn={setDeleteColumnId}
              selectedCardIds={selectedCardIds}
            />
          ))}
          <AddColumnForm onAdd={handleAddColumn} />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem className="gap-2 text-xs" disabled>
              {selectedCount}개 카드 선택됨
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="gap-2 text-xs"
              onClick={() => setSelectedCardIds(new Set())}
            >
              <X className="size-3.5" />
              선택 해제
            </ContextMenuItem>
            <ContextMenuItem
              className="gap-2 text-xs text-destructive focus:text-destructive"
              onClick={() => setDeleteSelectedOpen(true)}
            >
              <Trash2 className="size-3.5" />
              선택 카드 삭제
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard && (
            <div className="relative">
              {/* 스택 레이어 (뒤쪽 카드들) — z-0으로 메인 카드 뒤에 */}
              {draggedCardIds.current.size > 1 && (
                <>
                  {draggedCardIds.current.size > 2 && (
                    <div className="absolute left-1.5 top-1.5 z-0 h-full w-68 rounded-md border bg-muted/80 shadow-sm" />
                  )}
                  <div className="absolute left-0.5 top-0.5 z-0 h-full w-68 rounded-md border bg-muted/90 shadow-sm" />
                  <div className="absolute -right-2 -top-2 z-20 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow">
                    {draggedCardIds.current.size}
                  </div>
                </>
              )}
              <div className="relative z-10">
                <BoardCardOverlay card={activeCard} />
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <CardEditDialog
        card={editCard}
        members={members}
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

      <ConfirmDialog
        open={deleteSelectedOpen}
        onOpenChange={setDeleteSelectedOpen}
        title="선택한 카드 삭제"
        description={`${selectedCount}개의 카드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="일괄 삭제"
        loading={deletingSelectedCards}
        onConfirm={handleDeleteSelectedCards}
      />

      {selectionBox && (
        <div
          className="pointer-events-none fixed z-40 rounded-sm border border-primary/50 bg-primary/10"
          style={{
            left: selectionBox.left,
            top: selectionBox.top,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        />
      )}
    </div>
  );
}
