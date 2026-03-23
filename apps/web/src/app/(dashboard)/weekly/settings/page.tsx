'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { WeeklyWorkProject } from '@/features/weekly-work/types';
import {
  getRecurringMeetingStorageKey,
  getIncludeRecurringStorageKey,
} from '@/features/weekly-work/utils';

export default function WeeklyWorkSettingsPage() {
  const [projects, setProjects] = useState<WeeklyWorkProject[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [recurringMeetings, setRecurringMeetings] = useState('');
  const [includeRecurringMeetings, setIncludeRecurringMeetings] = useState(true);

  const loadProjects = async () => {
    const rows = await fetcher<WeeklyWorkProject[]>({
      url: '/weekly-work/projects',
      method: 'GET',
    });
    setProjects(rows);
    if (rows.length > 0 && !selectedProjectId) {
      setSelectedProjectId(rows[0].id);
    }
  };

  useEffect(() => {
    loadProjects().catch(() => {
      toast.error('프로젝트 목록을 불러오지 못했습니다.');
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setRecurringMeetings('');
      setIncludeRecurringMeetings(true);
      return;
    }

    const saved = window.localStorage.getItem(getRecurringMeetingStorageKey(selectedProjectId));
    setRecurringMeetings(saved || '');

    const savedInclude = window.localStorage.getItem(getIncludeRecurringStorageKey(selectedProjectId));
    setIncludeRecurringMeetings(savedInclude !== '0');
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    window.localStorage.setItem(getRecurringMeetingStorageKey(selectedProjectId), recurringMeetings);
  }, [recurringMeetings, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    window.localStorage.setItem(
      getIncludeRecurringStorageKey(selectedProjectId),
      includeRecurringMeetings ? '1' : '0',
    );
  }, [includeRecurringMeetings, selectedProjectId]);

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) {
      toast.error('프로젝트 이름을 입력해 주세요.');
      return;
    }

    setIsCreating(true);
    try {
      const created = await fetcher<WeeklyWorkProject>({
        url: '/weekly-work/projects',
        method: 'POST',
        data: { name },
      });
      setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProjectName('');
      setSelectedProjectId(created.id);
      toast.success(`프로젝트 "${created.name}"을(를) 추가했습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (project: WeeklyWorkProject) => {
    if (!window.confirm(`프로젝트 "${project.name}"을(를) 삭제할까요?\n해당 프로젝트의 모든 주간 업무 데이터가 삭제됩니다.`)) {
      return;
    }

    try {
      await fetcher<void>({
        url: `/weekly-work/projects/${project.id}`,
        method: 'DELETE',
      });
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      if (selectedProjectId === project.id) {
        setSelectedProjectId(projects.find((p) => p.id !== project.id)?.id || null);
      }
      toast.success(`프로젝트 "${project.name}"을(를) 삭제했습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '프로젝트 삭제에 실패했습니다.');
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-5 px-6 pt-5 pb-6">
      <div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="size-8">
            <Link href="/weekly" aria-label="뒤로가기">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">주간 업무 설정</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          프로젝트 관리 및 프로젝트별 반복 미팅을 설정합니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-4">
          <h2 className="text-sm font-medium">프로젝트 관리</h2>

          <div className="flex items-center gap-2">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="새 프로젝트 이름"
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
              }}
            />
            <Button
              size="sm"
              className="h-9 shrink-0"
              onClick={handleCreateProject}
              disabled={isCreating}
            >
              <Plus className="size-4" />
              {isCreating ? '추가 중...' : '추가'}
            </Button>
          </div>

          <div className="space-y-1">
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</p>
            )}
            {projects.map((project) => (
              <div
                key={project.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors cursor-pointer ${
                  selectedProjectId === project.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                }`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <span className="text-sm font-medium">{project.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project);
                  }}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium">
            반복 미팅 설정
            {selectedProject && (
              <span className="ml-1.5 text-muted-foreground font-normal">
                — {selectedProject.name}
              </span>
            )}
          </h2>

          {!selectedProjectId ? (
            <p className="text-sm text-muted-foreground">
              좌측에서 프로젝트를 선택하면 반복 미팅을 설정할 수 있습니다.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">반복 미팅 목록</Label>
                <Button
                  type="button"
                  variant={includeRecurringMeetings ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIncludeRecurringMeetings((prev) => !prev)}
                  className="h-7 text-xs"
                >
                  자동 반영 {includeRecurringMeetings ? 'ON' : 'OFF'}
                </Button>
              </div>
              <Textarea
                value={recurringMeetings}
                onChange={(e) => setRecurringMeetings(e.target.value)}
                className="min-h-40 text-sm"
                placeholder={'[매주 화 15:00~17:00] : 개발챕터\n[매주 목 13:30] : 테크 그룹 주간회의'}
              />
              <p className="text-[11px] text-muted-foreground">
                반복 표현은 주간 계획 생성 시 선택 주의 실제 날짜로 자동 변환됩니다.
                자동 반영이 OFF이면 계획 생성 시 반복 미팅이 포함되지 않습니다.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
