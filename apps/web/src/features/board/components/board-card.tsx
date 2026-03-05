'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CardItem } from '../types';
import { PRIORITY_DOT_COLORS, PRIORITY_LABELS } from '../types';
import { formatCardDate } from '../utils/date';

interface BoardCardProps {
  card: CardItem;
  columnId: string;
  onEdit: (card: CardItem) => void;
}

export function BoardCard({ card, columnId, onEdit }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card, columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const dueDateLabel = formatCardDate(card.dueDate);
  const createdDateLabel = formatCardDate(card.createdAt);
  const dateLabel = dueDateLabel ?? createdDateLabel;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-pointer rounded-md border bg-background px-3 py-2.5 transition-all duration-150',
        'hover:bg-muted/40',
        isDragging && 'opacity-40',
      )}
      onClick={() => onEdit(card)}
      {...attributes}
      {...listeners}
    >
      <div className="text-sm">{card.title}</div>
      {card.description && (
        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {card.description}
        </div>
      )}
      {/* 담당자: 윗줄 좌측 */}
      <div className="mt-2 flex items-center">
        {card.assignee ? (
          <div
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium"
            title={card.assignee.name}
          >
            {card.assignee.name[0]}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/70">미배정</span>
        )}
      </div>
      {/* 중요도, 라벨, 날짜 */}
      <div className="mt-1.5 flex items-center gap-1.5">
        {card.priority && PRIORITY_LABELS[card.priority] && (
          <div
            className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"
            title={`우선순위: ${PRIORITY_LABELS[card.priority]}`}
          >
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                PRIORITY_DOT_COLORS[card.priority],
              )}
              aria-hidden
            />
            <span>{PRIORITY_LABELS[card.priority]}</span>
          </div>
        )}
        {card.labels?.map((label) => (
          <Badge
            key={label.id}
            variant="outline"
            className="h-4 px-1 text-[10px] leading-none"
            style={{ borderColor: label.color, color: label.color }}
          >
            {label.name}
          </Badge>
        ))}
        <div className="flex-1 min-w-0" />
        {dateLabel && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {dateLabel}
          </span>
        )}
      </div>
    </div>
  );
}
