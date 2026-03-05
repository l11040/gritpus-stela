'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FolderKanban } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  members: { id: string; role: string; user: { name: string } }[];
  boards: { id: string; name: string }[];
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetcher<Project[]>({ url: '/projects', method: 'GET' })
      .then(setProjects)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 px-6 pt-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-6 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">대시보드</h1>
        <Link href="/projects/new">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-sm">
            <Plus className="size-4" />
            새 프로젝트
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16 text-center">
          <FolderKanban className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            아직 프로젝트가 없습니다
          </p>
          <Link href="/projects/new">
            <Button variant="ghost" size="sm" className="mt-2 text-xs">
              프로젝트 만들기
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="group rounded-md border px-4 py-3.5 transition-all duration-150 hover:bg-muted/40">
                <div className="text-sm font-medium">{project.name}</div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {project.description || '설명 없음'}
                </p>
                <div className="mt-2.5 flex gap-3 text-[11px] text-muted-foreground">
                  <span>멤버 {project.members?.length || 0}명</span>
                  <span>보드 {project.boards?.length || 0}개</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
