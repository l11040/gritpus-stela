'use client';

import { useEffect, useMemo, useState } from 'react';
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
  }) => void;
  onDelete: (cardId: string) => void;
}

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
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
    }
  }, [card]);

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

  const handleSave = () => {
    if (!card) return;
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;

    onSave(card.id, {
      title: normalizedTitle,
      description,
      priority,
      assigneeIds,
      dueDate: dueDate || null,
    });
    onOpenChange(false);
  };

  const toggleAssignee = (memberId: string, checked: boolean) => {
    setAssigneeIds((prev) =>
      checked
        ? [...new Set([...prev, memberId])]
        : prev.filter((id) => id !== memberId),
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full p-0 sm:max-w-3xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <SheetTitle className="sr-only">카드 상세</SheetTitle>
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b px-6 py-5">
              <p className="text-xs text-muted-foreground">카드 상세</p>
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-start text-xs"
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

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <Label className="text-xs text-muted-foreground">내용</Label>
              <RichEditor
                key={card?.id}
                defaultValue={card?.description || ''}
                onChange={setDescription}
                placeholder="문서처럼 자유롭게 작성하세요. 슬래시(/)로 블록 명령을 열 수 있습니다."
                className="mt-2 min-h-[320px]"
              />
            </div>

            <div className="flex items-center justify-between border-t px-6 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                삭제
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  취소
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
                  저장
                </Button>
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
