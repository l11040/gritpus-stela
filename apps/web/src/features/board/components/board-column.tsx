'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import type { CardItem, Column } from '../types';
import { BoardCard } from './board-card';
import { AddCardForm } from './add-card-form';

interface BoardColumnProps {
  column: Column;
  onEditCard: (card: CardItem) => void;
  onAddCard: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function BoardColumn({ column, onEditCard, onAddCard, onDeleteColumn }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const cardIds = column.cards.map((c) => c.id);

  return (
    <div className="w-68 shrink-0">
      {/* Column header */}
      <div className="group flex items-center gap-2 px-1 pb-2">
        <div
          className="size-2.5 rounded-full"
          style={{ backgroundColor: column.color || '#6B7280' }}
        />
        <span className="text-sm font-medium">{column.name}</span>
        <span className="text-xs text-muted-foreground">{column.cards.length}</span>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteColumn(column.id)}
              >
                컬럼 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cards container */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'min-h-[40px] space-y-1.5 rounded-md p-1 transition-colors',
            isOver && 'bg-muted/50',
          )}
        >
          {column.cards.map((card) => (
            <BoardCard
              key={card.id}
              card={card}
              columnId={column.id}
              onEdit={onEditCard}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add card */}
      <AddCardForm onAdd={(title) => onAddCard(column.id, title)} />
    </div>
  );
}
