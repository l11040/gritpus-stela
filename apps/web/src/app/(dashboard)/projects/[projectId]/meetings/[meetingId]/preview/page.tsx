'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface ActionItem {
  title: string;
  description?: string;
  assigneeName?: string;
  priority?: string;
  dueDate?: string;
}

interface Board {
  id: string;
  name: string;
  columns: { id: string; name: string }[];
}

export default function MeetingPreviewPage() {
  const { projectId, meetingId } = useParams<{ projectId: string; meetingId: string }>();
  const router = useRouter();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetcher<{ actionItems: ActionItem[] }>({
      url: `/projects/${projectId}/meetings/${meetingId}/preview`,
      method: 'GET',
    })
      .then((data) => setItems(data.actionItems))
      .catch(() => {});

    fetcher<Board[]>({ url: `/projects/${projectId}/boards`, method: 'GET' })
      .then((data) => {
        setBoards(data);
        if (data.length > 0) setSelectedBoardId(data[0].id);
      })
      .catch(() => {});
  }, [projectId, meetingId]);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  const updateItem = (index: number, updates: Partial<ActionItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!selectedBoardId) return;
    setLoading(true);

    try {
      // 수정된 아이템 저장
      await fetcher({
        url: `/projects/${projectId}/meetings/${meetingId}/preview`,
        method: 'PATCH',
        data: { actionItems: items },
      });

      // 확인 및 카드 생성
      const result = await fetcher<{ cardsCreated: number }>({
        url: `/projects/${projectId}/meetings/${meetingId}/confirm`,
        method: 'POST',
        data: {
          boardId: selectedBoardId,
          columnId: selectedColumnId || undefined,
        },
      });

      alert(`${result.cardsCreated}개의 카드가 생성되었습니다.`);
      router.push(`/projects/${projectId}/boards/${selectedBoardId}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">액션 아이템 미리보기</h1>
      <p className="text-muted-foreground">
        아래 항목을 수정한 후 칸반 보드에 등록하세요.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">등록할 보드 선택</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label>보드</Label>
            <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger><SelectValue placeholder="보드 선택" /></SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedBoard && (
            <div className="flex-1 space-y-2">
              <Label>컬럼 (선택)</Label>
              <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                <SelectTrigger><SelectValue placeholder="첫 번째 컬럼" /></SelectTrigger>
                <SelectContent>
                  {selectedBoard.columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {items.map((item, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-start justify-between gap-2">
                <Input
                  value={item.title}
                  onChange={(e) => updateItem(i, { title: e.target.value })}
                  className="font-medium"
                />
                <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-destructive">
                  삭제
                </Button>
              </div>
              <Textarea
                value={item.description || ''}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="설명"
                className="text-sm"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Select
                    value={item.priority || 'medium'}
                    onValueChange={(v) => updateItem(i, { priority: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  value={item.assigneeName || ''}
                  onChange={(e) => updateItem(i, { assigneeName: e.target.value })}
                  placeholder="담당자"
                  className="h-8 flex-1 text-xs"
                />
                <Input
                  type="date"
                  value={item.dueDate || ''}
                  onChange={(e) => updateItem(i, { dueDate: e.target.value })}
                  className="h-8 flex-1 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button onClick={handleConfirm} disabled={loading || !selectedBoardId || items.length === 0}>
          {loading ? '등록 중...' : `${items.length}개 카드 생성`}
        </Button>
      </div>
    </div>
  );
}
