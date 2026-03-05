'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichEditor } from '@/components/common/rich-editor';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  ChevronDown,
  Flag,
  ListTodo,
  Plus,
  UserRound,
  Users,
  X,
} from 'lucide-react';

interface ActionItem {
  title: string;
  description?: string;
  assigneeName?: string;
  assigneeId?: string;
  assigneeNames?: string[];
  assigneeIds?: string[];
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

const ASSIGNEE_SPLIT_REGEX =
  /\s*(?:,|\/|\\|&|\+|·|ㆍ|、|;|\band\b|\bwith\b|및|그리고|와|과)\s*/giu;
const GENERIC_ASSIGNEE_TOKENS = new Set([
  '',
  'none',
  'n/a',
  'na',
  'all',
  'everyone',
  'team',
  '미배정',
  '미정',
  '담당자없음',
]);
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PRIORITY_OPTIONS = [
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음' },
  { value: 'urgent', label: '긴급' },
] as const;

const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
};

function normalizeAssigneeText(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^담당\s*[:：]?\s*/u, '')
    .replace(/[()]/g, '')
    .replace(
      /(님|씨|매니저|팀장|리드|대표|담당자|manager|lead|owner|pm|pl)$/u,
      '',
    )
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}@._-]/gu, '');
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  return 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length);
}

function splitAssigneeNames(rawName: string): string[] {
  return rawName
    .split(ASSIGNEE_SPLIT_REGEX)
    .map((name) => name.trim())
    .filter(Boolean);
}

function scoreMemberMatch(rawCandidate: string, member: Member): number {
  const candidate = normalizeAssigneeText(rawCandidate);
  if (!candidate || GENERIC_ASSIGNEE_TOKENS.has(candidate)) return 0;

  const normalizedName = normalizeAssigneeText(member.user.name || '');
  const normalizedEmail = normalizeAssigneeText(member.user.email || '');
  const normalizedEmailLocal = normalizedEmail.split('@')[0] || '';
  const pools = [normalizedName, normalizedEmail, normalizedEmailLocal].filter(Boolean);
  if (pools.length === 0) return 0;

  if (pools.some((value) => value === candidate)) {
    return candidate.includes('@') ? 1 : 0.98;
  }
  if (
    candidate.length >= 2 &&
    pools.some((value) => value.includes(candidate) || candidate.includes(value))
  ) {
    return 0.9;
  }
  return Math.max(...pools.map((value) => similarity(candidate, value)));
}

function findBestMember(rawCandidate: string, members: Member[]): Member | null {
  const normalizedCandidate = normalizeAssigneeText(rawCandidate);
  if (!normalizedCandidate || GENERIC_ASSIGNEE_TOKENS.has(normalizedCandidate)) {
    return null;
  }

  const ranked = members
    .map((member) => ({ member, score: scoreMemberMatch(rawCandidate, member) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return null;

  const threshold = normalizedCandidate.length <= 3 ? 0.92 : 0.72;
  if (best.score < threshold) return null;

  const second = ranked[1];
  if (second && best.score - second.score < 0.05 && best.score < 0.95) {
    return null;
  }
  return best.member;
}

function collectAssigneeNames(item: ActionItem): string[] {
  const merged = [
    ...(item.assigneeNames ?? []),
    ...(item.assigneeName ? splitAssigneeNames(item.assigneeName) : []),
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of merged) {
    const key = normalizeAssigneeText(name);
    if (!key || seen.has(key) || GENERIC_ASSIGNEE_TOKENS.has(key)) continue;
    seen.add(key);
    result.push(name.trim());
  }
  return result;
}

function mergeAssigneeIds(item: ActionItem): string[] {
  return [
    ...new Set(
      [...(item.assigneeIds ?? []), ...(item.assigneeId ? [item.assigneeId] : [])]
        .map((id) => id?.trim())
        .filter((id): id is string => !!id && UUID_V4_REGEX.test(id)),
    ),
  ];
}

function toDateInputValue(value?: string): string {
  if (!value) return '';
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
}

function toPlainText(value?: string): string {
  if (!value) return '';
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ActionItemEditSheetProps {
  open: boolean;
  item: ActionItem | null;
  itemKey: string;
  members: Member[];
  onOpenChange: (open: boolean) => void;
  onSave: (nextItem: ActionItem) => void;
  onDelete: () => void;
}

function ActionItemEditSheet({
  open,
  item,
  itemKey,
  members,
  onOpenChange,
  onSave,
  onDelete,
}: ActionItemEditSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title || '');
    setDescription(item.description || '');
    setPriority(item.priority || 'medium');
    setDueDate(toDateInputValue(item.dueDate));
    setAssigneeIds(mergeAssigneeIds(item));
  }, [item]);

  const selectedAssignees = useMemo(
    () =>
      assigneeIds
        .map((id) => members.find((member) => member.userId === id))
        .filter((member): member is Member => !!member),
    [assigneeIds, members],
  );
  const selectedAssigneeNames = selectedAssignees.map((member) => member.user.name);
  const assigneeLabel =
    selectedAssigneeNames.length === 0
      ? '담당자 선택'
      : selectedAssigneeNames.length === 1
        ? selectedAssigneeNames[0]
        : `${selectedAssigneeNames[0]} 외 ${selectedAssigneeNames.length - 1}명`;

  const toggleAssignee = (memberId: string, checked: boolean) => {
    setAssigneeIds((prev) =>
      checked
        ? [...new Set([...prev, memberId])]
        : prev.filter((id) => id !== memberId),
    );
  };

  const handleSave = () => {
    if (!item) return;
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;

    onSave({
      ...item,
      title: normalizedTitle,
      description,
      priority,
      dueDate: dueDate || undefined,
      assigneeId: assigneeIds[0],
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      assigneeName: selectedAssigneeNames[0],
      assigneeNames: selectedAssigneeNames.length > 0 ? selectedAssigneeNames : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-3xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetTitle className="sr-only">액션 아이템 상세</SheetTitle>
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b px-6 py-5">
            <p className="text-xs text-muted-foreground">액션 아이템 상세</p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 없음"
              className="mt-2 h-auto border-none px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="border-b px-6 py-4">
            <h4 className="text-xs font-medium text-muted-foreground">속성</h4>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-[96px_1fr] items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserRound className="size-3.5" />
                  <span>담당자</span>
                </div>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-between text-xs"
                      >
                        <span className="truncate text-left">{assigneeLabel}</span>
                        <ChevronDown className="size-3.5 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {members.map((member) => (
                        <DropdownMenuCheckboxItem
                          key={member.userId}
                          checked={assigneeIds.includes(member.userId)}
                          onCheckedChange={(checked) =>
                            toggleAssignee(member.userId, checked === true)}
                        >
                          {member.user.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedAssignees.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {selectedAssignees.map((member) => (
                        <button
                          key={member.userId}
                          type="button"
                          onClick={() => toggleAssignee(member.userId, false)}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
                        >
                          {member.user.name}
                          <X className="size-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[96px_1fr] items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  <span>기한</span>
                </div>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-[96px_1fr] items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flag className="size-3.5" />
                  <span>우선순위</span>
                </div>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <Label className="text-xs text-muted-foreground">내용</Label>
            <RichEditor
              key={itemKey}
              defaultValue={item?.description || ''}
              onChange={setDescription}
              placeholder="문서처럼 자유롭게 작성하세요. 슬래시(/)로 블록 명령을 열 수 있습니다."
              className="mt-2 min-h-[320px]"
            />
          </div>

          <div className="flex items-center justify-between border-t px-6 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              항목 삭제
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={!title.trim()}>
                저장
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function MeetingPreviewPage() {
  const { projectId, meetingId } = useParams<{ projectId: string; meetingId: string }>();
  const router = useRouter();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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

  useEffect(() => {
    if (!members.length || !items.length) return;

    const needsMatch = items.some((item) => {
      const existingIds = mergeAssigneeIds(item);
      const names = collectAssigneeNames(item);
      return names.length > 0 && existingIds.length === 0;
    });
    if (!needsMatch) return;

    setItems((prev) =>
      prev.map((item) => {
        const existingIds = mergeAssigneeIds(item);
        if (existingIds.length > 0) return item;

        const names = collectAssigneeNames(item);
        if (names.length === 0) return item;

        const matchedIds = new Set<string>();
        for (const name of names) {
          const matched = findBestMember(name, members);
          if (matched) matchedIds.add(matched.userId);
        }

        const assigneeIds = [...matchedIds];
        const assigneeNames = assigneeIds
          .map((id) => members.find((member) => member.userId === id)?.user.name)
          .filter((name): name is string => !!name);

        return assigneeIds.length > 0
          ? {
              ...item,
              assigneeId: assigneeIds[0],
              assigneeIds,
              assigneeName: assigneeNames[0],
              assigneeNames,
            }
          : item;
      }),
    );
  }, [members, items.length]);

  useEffect(() => {
    if (editingIndex === null) return;
    if (editingIndex >= items.length) {
      setEditingIndex(items.length > 0 ? items.length - 1 : null);
    }
  }, [editingIndex, items.length]);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);
  const selectedColumnName = selectedBoard?.columns.find((c) => c.id === selectedColumnId)?.name;
  const unassignedCount = items.filter((item) => mergeAssigneeIds(item).length === 0).length;
  const dueDateSetCount = items.filter((item) => !!item.dueDate).length;
  const hasInvalidTitle = items.some((item) => !item.title.trim());
  const editingItem = editingIndex !== null ? items[editingIndex] ?? null : null;

  const updateItem = (index: number, updates: Partial<ActionItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex((prev) => {
      if (prev === null) return prev;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        title: '',
        description: '',
        priority: 'medium',
      },
    ]);
  };

  const handleConfirm = async () => {
    if (!selectedBoardId || hasInvalidTitle) return;
    setLoading(true);

    try {
      const normalizedItems = items
        .map((item) => {
          const safeIds = mergeAssigneeIds(item);
          return {
            ...item,
            title: item.title.trim(),
            description: item.description?.trim() || undefined,
            assigneeIds: safeIds.length > 0 ? safeIds : undefined,
            assigneeId: safeIds[0],
          };
        })
        .filter((item) => item.title.length > 0);

      await fetcher({
        url: `/projects/${projectId}/meetings/${meetingId}/preview`,
        method: 'PATCH',
        data: { actionItems: normalizedItems },
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
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">액션 아이템 미리보기</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          보드 카드처럼 확인하고, 클릭해서 상세 편집 후 등록하세요.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <ListTodo className="size-3.5" />
            총 {items.length}개
          </Badge>
          <Badge variant={unassignedCount > 0 ? 'outline' : 'secondary'} className="gap-1">
            <Users className="size-3.5" />
            미배정 {unassignedCount}개
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CalendarDays className="size-3.5" />
            기한 설정 {dueDateSetCount}개
          </Badge>
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">등록 위치</h3>
        {boards.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
            등록 가능한 보드가 없습니다. 먼저 보드를 생성해주세요.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">보드</Label>
              <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="보드 선택" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">컬럼 (선택)</Label>
              <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="첫 번째 컬럼으로 등록" />
                </SelectTrigger>
                <SelectContent>
                  {selectedBoard?.columns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>{column.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {selectedBoard && (
          <p className="mt-2 text-xs text-muted-foreground">
            현재 설정: <span className="font-medium text-foreground">{selectedBoard.name}</span>
            {' / '}
            <span className="font-medium text-foreground">{selectedColumnName || '첫 번째 컬럼'}</span>
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">액션 아이템</h3>
          <Button type="button" variant="ghost" size="sm" onClick={addItem}>
            <Plus className="size-3.5" />
            항목 추가
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            등록할 액션 아이템이 없습니다.
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-2">
            <div className="space-y-2">
              {items.map((item, index) => {
                const title = item.title.trim();
                const invalidTitle = title.length === 0;
                const selectedAssigneeIds = mergeAssigneeIds(item);
                const selectedAssigneeNames = selectedAssigneeIds
                  .map((id) => members.find((member) => member.userId === id)?.user.name)
                  .filter((name): name is string => !!name);
                const assigneeLabel =
                  selectedAssigneeNames.length === 0
                    ? '미배정'
                    : selectedAssigneeNames.length === 1
                      ? selectedAssigneeNames[0]
                      : `${selectedAssigneeNames[0]} 외 ${selectedAssigneeNames.length - 1}명`;
                const previewText = toPlainText(item.description);
                const priorityLabel = PRIORITY_LABELS[item.priority || 'medium'] || '보통';

                return (
                  <article
                    key={`${index}-${item.title}-${item.dueDate || ''}`}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'rounded-md border bg-background px-3 py-2.5 transition-colors',
                      'cursor-pointer hover:bg-muted/40',
                    )}
                    onClick={() => setEditingIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setEditingIndex(index);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted/40 text-[10px] text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className={cn('truncate text-sm font-medium', invalidTitle && 'text-destructive')}>
                            {title || '제목 없음'}
                          </p>
                          {invalidTitle && (
                            <Badge variant="outline" className="h-4 px-1 text-[10px] text-destructive">
                              제목 필요
                            </Badge>
                          )}
                        </div>
                        {previewText && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {previewText}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            {priorityLabel}
                          </Badge>
                          <Badge
                            variant={selectedAssigneeNames.length > 0 ? 'secondary' : 'outline'}
                            className="h-5 px-1.5 text-[10px]"
                          >
                            {assigneeLabel}
                          </Badge>
                          {item.dueDate && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              {item.dueDate}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeItem(index);
                        }}
                        aria-label="항목 삭제"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="rounded-md border px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {hasInvalidTitle
              ? '제목이 비어 있는 항목이 있습니다.'
              : `${items.length}개 항목을 보드에 등록할 준비가 되었습니다.`}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={loading || !selectedBoardId || items.length === 0 || hasInvalidTitle}
            >
              {loading ? '등록 중...' : `${items.length}개 카드 생성`}
            </Button>
          </div>
        </div>
      </div>

      <ActionItemEditSheet
        open={editingIndex !== null && !!editingItem}
        item={editingItem}
        itemKey={editingIndex !== null ? `item-${editingIndex}` : 'item-none'}
        members={members}
        onOpenChange={(open) => {
          if (!open) setEditingIndex(null);
        }}
        onSave={(nextItem) => {
          if (editingIndex === null) return;
          updateItem(editingIndex, nextItem);
        }}
        onDelete={() => {
          if (editingIndex === null) return;
          removeItem(editingIndex);
          setEditingIndex(null);
        }}
      />
    </div>
  );
}
