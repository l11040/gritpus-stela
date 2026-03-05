import type { CardItem } from '../types';
import { formatCardDate } from '../utils/date';

interface BoardCardOverlayProps {
  card: CardItem;
}

export function BoardCardOverlay({ card }: BoardCardOverlayProps) {
  const dueDateLabel = formatCardDate(card.dueDate);
  const createdDateLabel = formatCardDate(card.createdAt);
  const dateLabel = dueDateLabel ?? createdDateLabel;

  return (
    <div className="w-66 rounded-md border bg-background px-3 py-2.5 shadow-lg">
      <div className="text-sm">{card.title}</div>
      {card.description && (
        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {card.description}
        </div>
      )}
      {dateLabel && (
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          {dueDateLabel ? `마감 ${dateLabel}` : `생성 ${dateLabel}`}
        </div>
      )}
    </div>
  );
}
