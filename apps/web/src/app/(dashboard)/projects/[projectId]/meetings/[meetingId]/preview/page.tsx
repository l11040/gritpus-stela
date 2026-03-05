'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface ActionItem {
  title: string;
  description?: string;
  assigneeName?: string;
  assigneeId?: string;
  priority?: string;
  dueDate?: string;
}

interface Board {
  id: string;
  name: string;
  columns: { id: string; name: string }[];
}

interface Member {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

export default function MeetingPreviewPage() {
  const { projectId, meetingId } = useParams<{ projectId: string; meetingId: string }>();
  const router = useRouter();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
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

    fetcher<Member[]>({ url: `/projects/${projectId}/members`, method: 'GET' })
      .then((data) => setMembers(data))
      .catch(() => {});
  }, [projectId, meetingId]);

  // assigneeName이 있지만 assigneeId가 없는 항목을 멤버와 자동 매칭
  useEffect(() => {
    if (!members.length || !items.length) return;

    const needsMatch = items.some((item) => item.assigneeName && !item.assigneeId);
    if (!needsMatch) return;

    setItems((prev) =>
      prev.map((item) => {
        if (!item.assigneeName || item.assigneeId) return item;

        const name = item.assigneeName.trim().toLowerCase();
        const matched = members.find((m) => {
          const userName = m.user.name?.toLowerCase() || '';
          const userEmail = m.user.email?.toLowerCase() || '';
          return (
            userName === name ||
            userEmail === name ||
            userName.includes(name) ||
            name.includes(userName)
          );
        });

        return matched ? { ...item, assigneeId: matched.userId } : item;
      }),
    );
  }, [members, items.length]); // items.length로 최초 로드 시에만 트리거

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
      await fetcher({
        url: `/projects/${projectId}/meetings/${meetingId}/preview`,
        method: 'PATCH',
        data: { actionItems: items },
      });

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
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold">액션 아이템 미리보기</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          아래 항목을 수정한 후 칸반 보드에 등록하세요.
        </p>
      </div>

      {/* Board selection */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">등록할 보드</h3>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">보드</Label>
            <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="보드 선택" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedBoard && (
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">컬럼 (선택)</Label>
              <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="첫 번째 컬럼" />
                </SelectTrigger>
                <SelectContent>
                  {selectedBoard.columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </section>

      {/* Action items */}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-md border px-4 py-3 space-y-2.5">
            <div className="flex items-start gap-2">
              <Input
                value={item.title}
                onChange={(e) => updateItem(i, { title: e.target.value })}
                className="h-8 text-sm font-medium"
              />
              <button
                onClick={() => removeItem(i)}
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
            <Textarea
              value={item.description || ''}
              onChange={(e) => updateItem(i, { description: e.target.value })}
              placeholder="설명"
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Select
                value={item.priority || 'medium'}
                onValueChange={(v) => updateItem(i, { priority: v })}
              >
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">낮음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="urgent">긴급</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={item.assigneeId || '_none'}
                onValueChange={(v) => {
                  const member = members.find((m) => m.userId === v);
                  updateItem(i, {
                    assigneeId: v === '_none' ? undefined : v,
                    assigneeName: member ? member.user.name : undefined,
                  });
                }}
              >
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue placeholder="담당자" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">담당자 없음</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={item.dueDate || ''}
                onChange={(e) => updateItem(i, { dueDate: e.target.value })}
                className="h-7 flex-1 text-xs"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          취소
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={loading || !selectedBoardId || items.length === 0}>
          {loading ? '등록 중...' : `${items.length}개 카드 생성`}
        </Button>
      </div>
    </div>
  );
}
