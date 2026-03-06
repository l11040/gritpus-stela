'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { cn } from '@/lib/utils';
import type { CardItem } from '../types';
import { PRIORITY_LABELS } from '../types';
import { CalendarDays, ChevronDown, Flag, UserRound, X } from 'lucide-react';

interface ProjectMember {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

interface CardEditDialogProps {
  card: CardItem | null;
  members: ProjectMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (cardId: string, data: {
    title: string;
    description: string;
    priority: string;
    assigneeIds?: string[];
    dueDate?: string | null;
  }) => void | Promise<void>;
  onDelete: (cardId: string) => void;
}

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
}

interface CardSavePayload {
  title: string;
  description: string;
  priority: string;
  assigneeIds: string[];
  dueDate: string | null;
}

function formatSavedTime(value: Date): string {
  return value.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function CardEditDialog({
  card,
  members,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: CardEditDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef('');
  const saveRequestSeqRef = useRef(0);

  const buildPayload = useCallback(
    (): CardSavePayload => ({
      title: title.trim(),
      description,
      priority,
      assigneeIds,
      dueDate: dueDate || null,
    }),
    [title, description, priority, assigneeIds, dueDate],
  );

  const runSave = useCallback(
    async (snapshot: string, payload: CardSavePayload) => {
      if (!card || !payload.title) return;

      const requestSeq = ++saveRequestSeqRef.current;
      setSaveState('saving');
      try {
        await Promise.resolve(onSave(card.id, payload));
        if (requestSeq !== saveRequestSeqRef.current) return;
        lastSavedSnapshotRef.current = snapshot;
        setLastSavedAt(new Date());
        setSaveState('saved');
      } catch {
        if (requestSeq !== saveRequestSeqRef.current) return;
        setSaveState('error');
      }
    },
    [card, onSave],
  );

  const flushPendingSave = useCallback(() => {
    if (!card) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const payload = buildPayload();
    const snapshot = JSON.stringify(payload);
    if (!payload.title || snapshot === lastSavedSnapshotRef.current) return;
    void runSave(snapshot, payload);
  }, [buildPayload, card, runSave]);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setPriority(card.priority || 'medium');
      const nextAssigneeIds =
        card.assignees?.length
          ? card.assignees.map((assignee) => assignee.id)
          : card.assignee
            ? [card.assignee.id]
            : [];
      setAssigneeIds(nextAssigneeIds);
      setDueDate(toDateInputValue(card.dueDate));

      const initialPayload: CardSavePayload = {
        title: card.title.trim(),
        description: card.description || '',
        priority: card.priority || 'medium',
        assigneeIds: nextAssigneeIds,
        dueDate: toDateInputValue(card.dueDate) || null,
      };
      lastSavedSnapshotRef.current = JSON.stringify(initialPayload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      saveRequestSeqRef.current += 1;
      setSaveState('idle');
      setLastSavedAt(null);
    }
  }, [card]);

  useEffect(() => {
    if (!open || !card) return;
    const payload = buildPayload();
    const snapshot = JSON.stringify(payload);

    if (!payload.title) {
      setSaveState('idle');
      return;
    }
    if (snapshot === lastSavedSnapshotRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      void runSave(snapshot, payload);
    }, 900);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [open, card, buildPayload, runSave]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    },
    [],
  );

  const selectedAssignees = useMemo(
    () =>
      assigneeIds
        .map((id) => members.find((member) => member.userId === id))
        .filter((member): member is ProjectMember => !!member),
    [assigneeIds, members],
  );
  const assigneeLabel =
    selectedAssignees.length === 0
      ? '담당자 선택'
      : selectedAssignees.length === 1
        ? selectedAssignees[0].user.name
        : `${selectedAssignees[0].user.name} 외 ${selectedAssignees.length - 1}명`;
  const saveLabel = useMemo(() => {
    if (!title.trim()) return '제목 입력 후 자동 저장';
    if (saveState === 'saving') return '자동 저장 중…';
    if (saveState === 'error') return '자동 저장 실패';
    if (saveState === 'saved' && lastSavedAt) return `${formatSavedTime(lastSavedAt)} 저장됨`;
    return '자동 저장';
  }, [title, saveState, lastSavedAt]);

  const toggleAssignee = (memberId: string, checked: boolean) => {
    setAssigneeIds((prev) =>
      checked
        ? [...new Set([...prev, memberId])]
        : prev.filter((id) => id !== memberId),
    );
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      flushPendingSave();
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="w-full p-0 sm:max-w-4xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <SheetTitle className="sr-only">카드 상세</SheetTitle>
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-3xl flex-col px-5 py-7 sm:px-6">
                <div className="flex items-center justify-end gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-xs',
                      saveState === 'error' ? 'text-destructive' : 'text-muted-foreground',
                    )}
                    >
                      {saveLabel}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>

                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목 없음"
                  className="mt-2 h-auto border-none px-0 text-xl leading-tight font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-4xl"
                />

                <div className="mt-6">
                  <Label className="text-xs font-medium text-muted-foreground md:text-sm">속성</Label>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-muted/50">
                      <div className="flex w-24 shrink-0 items-center gap-2 text-xs text-muted-foreground md:text-sm">
                        <UserRound className="size-3.5" />
                        <span>담당자</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-full justify-between rounded-md border border-transparent px-2 text-xs font-normal hover:border-border hover:bg-background md:text-sm"
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
                  </div>
                </div>

                    <div className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-muted/50">
                      <div className="flex w-24 shrink-0 items-center gap-2 text-xs text-muted-foreground md:text-sm">
                        <CalendarDays className="size-3.5" />
                        <span>기한</span>
                      </div>
                      <div className="flex-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-full justify-start rounded-md border border-transparent px-2 text-xs font-normal hover:border-border hover:bg-background md:text-sm"
                            >
                              <CalendarDays className="size-3.5" />
                              {dueDate
                                ? new Date(dueDate + 'T00:00:00').toLocaleDateString('ko-KR')
                                : '날짜 선택'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const yyyy = date.getFullYear();
                                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                                  const dd = String(date.getDate()).padStart(2, '0');
                                  setDueDate(`${yyyy}-${mm}-${dd}`);
                                } else {
                                  setDueDate('');
                                }
                              }}
                            />
                            {dueDate && (
                              <div className="border-t px-3 py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-full text-xs text-muted-foreground"
                                  onClick={() => setDueDate('')}
                                >
                                  기한 제거
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-muted/50">
                      <div className="flex w-24 shrink-0 items-center gap-2 text-xs text-muted-foreground md:text-sm">
                        <Flag className="size-3.5" />
                        <span>우선순위</span>
                      </div>
                      <div className="flex-1">
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger className="h-8 border-transparent bg-transparent px-2 text-xs font-normal shadow-none hover:border-border hover:bg-background md:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Label className="text-xs font-medium text-muted-foreground md:text-sm">내용</Label>
                  <RichEditor
                    key={card?.id}
                    defaultValue={card?.description || ''}
                    onChange={setDescription}
                    placeholder="문서처럼 자유롭게 작성하세요. 슬래시(/)로 블록 명령을 열 수 있습니다."
                    className="mt-2 min-h-[420px] border-none px-0 py-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="카드 삭제"
        description="이 카드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        onConfirm={() => {
          if (card) {
            onDelete(card.id);
            onOpenChange(false);
          }
          setDeleteOpen(false);
        }}
      />
    </>
  );
}
