'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CardItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  position: number;
  dueDate: string;
  assignee: { id: string; name: string } | null;
  labels: { id: string; name: string; color: string }[];
}

interface Column {
  id: string;
  name: string;
  color: string;
  position: number;
  cards: CardItem[];
}

interface Board {
  id: string;
  name: string;
  columns: Column[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [editCard, setEditCard] = useState<CardItem | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const load = useCallback(() => {
    fetcher<Board>({ url: `/projects/${projectId}/boards/${boardId}`, method: 'GET' })
      .then(setBoard)
      .catch(() => {});
  }, [projectId, boardId]);

  useEffect(() => { load(); }, [load]);

  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    await fetcher({
      url: `/projects/${projectId}/boards/${boardId}/cards`,
      method: 'POST',
      data: { title: newCardTitle, columnId },
    });
    setNewCardTitle('');
    setAddingToColumn(null);
    load();
  };

  const moveCard = async (cardId: string, columnId: string, position: number) => {
    await fetcher({
      url: `/projects/${projectId}/boards/${boardId}/cards/${cardId}/move`,
      method: 'PATCH',
      data: { columnId, position },
    });
    load();
  };

  const updateCard = async () => {
    if (!editCard) return;
    await fetcher({
      url: `/projects/${projectId}/boards/${boardId}/cards/${editCard.id}`,
      method: 'PATCH',
      data: {
        title: editCard.title,
        description: editCard.description,
        priority: editCard.priority,
      },
    });
    setEditCard(null);
    load();
  };

  const deleteCard = async (cardId: string) => {
    await fetcher({
      url: `/projects/${projectId}/boards/${boardId}/cards/${cardId}`,
      method: 'DELETE',
    });
    setEditCard(null);
    load();
  };

  if (!board) return <div className="text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{board.name}</h1>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <div
            key={column.id}
            className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: column.color || '#6B7280' }}
                />
                <h3 className="font-semibold">{column.name}</h3>
                <span className="text-xs text-muted-foreground">{column.cards.length}</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {column.cards.map((card) => (
                  <Card
                    key={card.id}
                    className="cursor-pointer p-3 transition-shadow hover:shadow-md"
                    onClick={() => setEditCard(card)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('cardId', card.id);
                      e.dataTransfer.setData('sourceColumnId', column.id);
                    }}
                  >
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{card.title}</div>
                      {card.description && (
                        <div className="line-clamp-2 text-xs text-muted-foreground">
                          {card.description}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${PRIORITY_COLORS[card.priority] || ''}`}>
                          {card.priority}
                        </span>
                        {card.labels?.map((label) => (
                          <Badge
                            key={label.id}
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: label.color, color: label.color }}
                          >
                            {label.name}
                          </Badge>
                        ))}
                      </div>
                      {card.assignee && (
                        <div className="text-xs text-muted-foreground">
                          {card.assignee.name}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div
              className="mt-2 min-h-[40px] rounded border-2 border-dashed border-transparent transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.replace('border-transparent', 'border-primary/30');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.replace('border-primary/30', 'border-transparent');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.replace('border-primary/30', 'border-transparent');
                const cardId = e.dataTransfer.getData('cardId');
                if (cardId) moveCard(cardId, column.id, column.cards.length);
              }}
            />

            {addingToColumn === column.id ? (
              <div className="mt-2 space-y-2">
                <Input
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="카드 제목"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && addCard(column.id)}
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => addCard(column.id)}>추가</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingToColumn(null)}>취소</Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-start text-muted-foreground"
                onClick={() => setAddingToColumn(column.id)}
              >
                + 카드 추가
              </Button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!editCard} onOpenChange={() => setEditCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카드 수정</DialogTitle>
          </DialogHeader>
          {editCard && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={editCard.title}
                  onChange={(e) => setEditCard({ ...editCard, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={editCard.description || ''}
                  onChange={(e) => setEditCard({ ...editCard, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>우선순위</Label>
                <Select
                  value={editCard.priority}
                  onValueChange={(v) => setEditCard({ ...editCard, priority: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={() => editCard && deleteCard(editCard.id)}>
              삭제
            </Button>
            <Button onClick={updateCard}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
