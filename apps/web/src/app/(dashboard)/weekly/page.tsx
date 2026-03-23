'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RichEditor } from '@/components/common/rich-editor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Copy,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { WeeklyType, WeeklyWorkHistory, WeeklyWorkProject, WeeklyWorkUserSummary } from '@/features/weekly-work/types';
import { useAuth } from '@/providers/auth-provider';
import { WeekDatePicker } from '@/features/weekly-work/components/week-date-picker';
import {
  getCurrentWeekStartDate,
  shiftWeekStartDate,
  toSlackPasteText,
} from '@/features/weekly-work/utils';

type TypeFilter = 'all' | WeeklyType;
type UserFilter = 'all' | 'me' | string;

function typeBadgeLabel(type: WeeklyType) {
  return type === 'plan' ? '주간 계획' : '주간 보고';
}

function typeBadgeVariant(type: WeeklyType): 'secondary' | 'outline' {
  return type === 'plan' ? 'secondary' : 'outline';
}

export default function WeeklyWorkHistoryPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState<WeeklyWorkUserSummary[]>([]);
  const [histories, setHistories] = useState<WeeklyWorkHistory[]>([]);
  const [projects, setProjects] = useState<WeeklyWorkProject[]>([]);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekStartDate());

  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [markdownDraft, setMarkdownDraft] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  const selectedHistory = useMemo(
    () => histories.find((item) => item.id === selectedHistoryId) || null,
    [histories, selectedHistoryId],
  );

  const isHistoryDirty = useMemo(() => {
    if (!selectedHistory) return false;
    return selectedHistory.markdown !== markdownDraft;
  }, [markdownDraft, selectedHistory]);

  const canEditSelectedHistory = useMemo(() => {
    if (!selectedHistory || !user) return false;
    return selectedHistory.userId === user.id;
  }, [selectedHistory, user]);

  const userNameMap = useMemo(
    () => new Map(users.map((entry) => [entry.userId, entry.name])),
    [users],
  );

  const userFilterOptions = useMemo(
    () => users.filter((entry) => !entry.isMe),
    [users],
  );

  const projectNameMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const buildHistoryParams = (): Record<string, string> => {
    const params: Record<string, string> = { weekStartDate };

    if (typeFilter !== 'all') {
      params.type = typeFilter;
    }

    if (userFilter === 'all') {
      params.includeAllUsers = 'true';
    } else if (userFilter !== 'me') {
      params.userId = userFilter;
    }

    if (projectFilter !== 'all') {
      params.projectId = projectFilter;
    }

    return params;
  };

  const loadUsers = async () => {
    const rows = await fetcher<WeeklyWorkUserSummary[]>({
      url: '/weekly-work/users',
      method: 'GET',
      params: { weekStartDate },
    });

    setUsers(rows);
  };

  const loadHistories = async () => {
    const rows = await fetcher<WeeklyWorkHistory[]>({
      url: '/weekly-work/history',
      method: 'GET',
      params: buildHistoryParams(),
    });

    setHistories(rows);
    setSelectedHistoryId((prev) => {
      if (prev && rows.some((item) => item.id === prev)) return prev;
      return rows[0]?.id || null;
    });
  };

  const loadProjects = async () => {
    const rows = await fetcher<WeeklyWorkProject[]>({
      url: '/weekly-work/projects',
      method: 'GET',
    });
    setProjects(rows);
  };

  const loadMain = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadUsers(), loadHistories(), loadProjects()]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMain().catch(() => {
      toast.error('주간 업무 목록을 불러오지 못했습니다.');
    });
  }, [typeFilter, userFilter, projectFilter, weekStartDate]);

  useEffect(() => {
    if (!selectedHistory) {
      setMarkdownDraft('');
      return;
    }

    setMarkdownDraft(selectedHistory.markdown);
  }, [selectedHistory]);

  const persistHistory = async (historyId: string, markdown: string) => {
    setIsSavingHistory(true);
    try {
      const updated = await fetcher<WeeklyWorkHistory>({
        url: `/weekly-work/history/${historyId}`,
        method: 'PUT',
        data: { markdown },
      });

      setHistories((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMarkdownDraft((prev) => (selectedHistoryId === historyId && prev === markdown ? updated.markdown : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '히스토리 저장에 실패했습니다.');
    } finally {
      setIsSavingHistory(false);
    }
  };

  useEffect(() => {
    if (!selectedHistory || !canEditSelectedHistory) {
      return;
    }

    const markdown = markdownDraft.trim();
    if (!markdown || !isHistoryDirty) {
      return;
    }

    const timeout = window.setTimeout(() => {
      persistHistory(selectedHistory.id, markdown).catch(() => {
        // 오류 토스트는 persistHistory 내부에서 처리
      });
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [
    canEditSelectedHistory,
    isHistoryDirty,
    markdownDraft,
    selectedHistory,
  ]);

  const handleDeleteHistory = async () => {
    if (!selectedHistory) {
      toast.error('삭제할 히스토리를 선택해 주세요.');
      return;
    }

    if (!window.confirm('선택한 주간 업무를 삭제할까요?')) {
      return;
    }

    setIsDeletingHistory(true);
    try {
      await fetcher<void>({
        url: `/weekly-work/history/${selectedHistory.id}`,
        method: 'DELETE',
      });

      setHistories((prev) => prev.filter((item) => item.id !== selectedHistory.id));
      setSelectedHistoryId((prev) => (prev === selectedHistory.id ? null : prev));
      setMarkdownDraft('');
      toast.success('주간 업무를 삭제했습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '주간 업무 삭제에 실패했습니다.');
    } finally {
      setIsDeletingHistory(false);
    }
  };

  const moveWeek = (offset: number) => {
    setWeekStartDate((prev) => shiftWeekStartDate(prev, offset));
  };

  const handleCopyForSlack = async () => {
    if (!selectedHistory) {
      toast.error('복사할 히스토리를 선택해 주세요.');
      return;
    }

    const source = canEditSelectedHistory ? markdownDraft : selectedHistory.markdown;
    const slackText = toSlackPasteText(source);
    if (!slackText) {
      toast.error('복사할 내용이 없습니다.');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(slackText);
      } else {
        throw new Error('Clipboard API not available');
      }

      toast.success('Slack용 형식으로 복사했습니다.');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = slackText;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('Slack용 형식으로 복사했습니다.');
      } catch {
        toast.error('복사에 실패했습니다.');
      }
    }
  };

  return (
    <div className="space-y-5 px-6 pt-5 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">주간 업무</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            주차 기준으로 계획/보고 히스토리를 조회하고 수정합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadMain().catch(() => {
                toast.error('목록 새로고침에 실패했습니다.');
              });
            }}
          >
            <RefreshCw className="size-4" />
            새로고침
          </Button>
          <Button asChild variant="outline">
            <Link href="/weekly/settings">
              <Settings className="size-4" />
              설정
            </Link>
          </Button>
          <Button asChild>
            <Link href="/weekly/new">
              <Plus className="size-4" />
              주간 업무 추가
            </Link>
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.8fr)_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">유저</Label>
            <Select value={userFilter} onValueChange={(value) => setUserFilter(value)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유저</SelectItem>
                <SelectItem value="me">나 ({user?.name || '내 계정'})</SelectItem>
                {userFilterOptions.map((entry) => (
                  <SelectItem key={entry.userId} value={entry.userId}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">프로젝트</Label>
            <Select value={projectFilter} onValueChange={(value) => setProjectFilter(value)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 프로젝트</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">문서 타입</Label>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">계획 + 보고</SelectItem>
                <SelectItem value="plan">주간 계획</SelectItem>
                <SelectItem value="report">주간 보고</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">기준 주</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9"
                onClick={() => moveWeek(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <WeekDatePicker
                value={weekStartDate}
                onChange={setWeekStartDate}
                buttonClassName="h-9 min-w-72 justify-center"
                allowClear={false}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9"
                onClick={() => moveWeek(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              className="h-9"
              onClick={() => {
                setUserFilter('all');
                setProjectFilter('all');
                setTypeFilter('all');
                setWeekStartDate(getCurrentWeekStartDate());
              }}
            >
              필터 초기화
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-6 px-2.5 text-xs">
            목록 {histories.length}건
          </Badge>
          {isLoading && <span className="text-xs text-muted-foreground">불러오는 중...</span>}
        </div>
      </section>

      <div className={`grid gap-4 ${selectedHistory ? 'xl:grid-cols-[0.9fr_1.1fr]' : 'grid-cols-1'}`}>
        <div className={`space-y-2 ${selectedHistory ? 'xl:border-r xl:pr-4' : ''}`}>
          <h2 className="text-sm font-medium">주간 업무 리스트</h2>

          <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1 scrollbar-hide">
            {histories.length === 0 && (
              <p className="text-sm text-muted-foreground">조건에 맞는 히스토리가 없습니다.</p>
            )}

            {histories.map((item) => {
              const selected = item.id === selectedHistoryId;
              const ownerName = userNameMap.get(item.userId) || (item.userId === user?.id ? user.name : '알 수 없음');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedHistoryId(item.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={typeBadgeVariant(item.type)} className="h-5 px-2 text-[10px]">
                        {typeBadgeLabel(item.type)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {projectNameMap.get(item.projectId) || ''}
                      </span>
                      <span className="text-xs font-medium">{ownerName}</span>
                      <span className="text-[10px] text-muted-foreground">{item.weekStartDate}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedHistory && (
          <div className="space-y-2 xl:pl-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-medium">선택 항목 상세</h2>
                {canEditSelectedHistory && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="상세 메뉴 열기"
                        title="상세 메뉴"
                        disabled={isDeletingHistory}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={handleDeleteHistory}
                        disabled={isDeletingHistory}
                      >
                        <Trash2 className="size-4" />
                        {isDeletingHistory ? '삭제 중...' : '삭제'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="flex items-center gap-1">
                {canEditSelectedHistory && (
                  <span className="mr-1 text-xs text-muted-foreground">
                    {isSavingHistory ? '자동 저장 중...' : isHistoryDirty ? '변경됨' : '자동 저장됨'}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyForSlack}
                  aria-label="Slack 형식으로 복사"
                  title="Slack 형식으로 복사"
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedHistoryId(null)}
                  aria-label="선택 항목 닫기"
                  title="닫기"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {!canEditSelectedHistory && (
              <p className="text-xs text-muted-foreground">다른 사용자의 문서는 읽기 전용입니다.</p>
            )}
            <RichEditor
              key={`${selectedHistory.id}:${selectedHistory.markdown.length}:${selectedHistory.markdown.slice(0, 24)}`}
              defaultValue={selectedHistory.markdown}
              inputFormat="markdown"
              outputFormat="markdown"
              editable={canEditSelectedHistory}
              onChange={canEditSelectedHistory ? setMarkdownDraft : undefined}
              className="max-h-[70vh] overflow-y-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
