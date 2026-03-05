export interface CardItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  position: number;
  dueDate: string | null;
  createdAt?: string;
  assignee: { id: string; name: string } | null;
  labels: { id: string; name: string; color: string }[];
}

export interface Column {
  id: string;
  name: string;
  color: string;
  position: number;
  cards: CardItem[];
}

export interface Board {
  id: string;
  name: string;
  columns: Column[];
}

export const PRIORITY_DOT_COLORS: Record<string, string> = {
  low: 'bg-blue-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-400',
  urgent: 'bg-red-500',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
};
