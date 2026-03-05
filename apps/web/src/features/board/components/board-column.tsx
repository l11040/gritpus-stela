'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import type { CardItem, Column } from '../types';
import { BoardCard } from './board-card';
import { AddCardForm } from './add-card-form';

const COLOR_PRESETS = [
  '#3B82F6',
  '#F59E0B',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#F97316',
  '#6B7280',
];

interface BoardColumnProps {
  column: Column;
  onEditCard: (card: CardItem) => void;
  onAddCard: (columnId: string, title: string) => void;
  onUpdateColumn: (columnId: string, data: { name?: string; color?: string }) => void;
  onDeleteColumn: (columnId: string) => void;
  selectedCardIds: ReadonlySet<string>;
}

export function BoardColumn({
  column,
  onEditCard,
  onAddCard,
  onUpdateColumn,
  onDeleteColumn,
  selectedCardIds,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const [editName, setEditName] = useState(column.name);
  const [menuOpen, setMenuOpen] = useState(false);

  const cardIds = column.cards.map((c) => c.id);

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== column.name) {
      onUpdateColumn(column.id, { name: trimmed });
    } else {
      setEditName(column.name);
    }
  };

  return (
    <div className="w-68 shrink-0">
      {/* Column header */}
      <div className="group flex items-center gap-2 px-1 pb-2">
        <div
          className="size-2.5 rounded-full"
          style={{ backgroundColor: column.color || '#6B7280' }}
        />
        <span className="cursor-default text-sm font-medium">{column.name}</span>
        <span className="text-xs text-muted-foreground">{column.cards.length}</span>
        <div className="ml-auto">
          <DropdownMenu open={menuOpen} onOpenChange={(open) => {
            setMenuOpen(open);
            if (open) setEditName(column.name);
          }}>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="mb-1.5 text-xs text-muted-foreground">이름</p>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName();
                      setMenuOpen(false);
                    } else if (e.key === 'Escape') {
                      setEditName(column.name);
                      setMenuOpen(false);
                    }
                    e.stopPropagation();
                  }}
                  className="h-7 w-full rounded border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="px-2 py-1.5">
                <p className="mb-1.5 text-xs text-muted-foreground">색상</p>
                <div className="flex gap-1">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        'size-5 rounded-full border-2 transition-transform hover:scale-110',
                        (column.color || '#6B7280') === color
                          ? 'border-foreground'
                          : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdateColumn(column.id, { color })}
                    />
                  ))}
                </div>
              </div>
              <DropdownMenuSeparator />
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
            'space-y-1.5 rounded-md p-1 transition-colors',
            cardIds.length === 0 && 'min-h-10',
            isOver && 'bg-muted/50',
          )}
        >
          {column.cards.map((card) => (
            <BoardCard
              key={card.id}
              card={card}
              columnId={column.id}
              onEdit={onEditCard}
              isSelected={selectedCardIds.has(card.id)}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add card */}
      <AddCardForm onAdd={(title) => onAddCard(column.id, title)} />
    </div>
  );
}
