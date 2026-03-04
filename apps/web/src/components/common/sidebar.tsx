'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/api/fetcher';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetcher<Project[]>({ url: '/projects', method: 'GET' })
      .then(setProjects)
      .catch(() => {});
  }, []);

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="border-b p-4">
        <Link href="/dashboard" className="text-lg font-bold">
          Gritpus Stela
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-auto p-3">
        <Link
          href="/dashboard"
          className={cn(
            'block rounded-md px-3 py-2 text-sm',
            pathname === '/dashboard'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted',
          )}
        >
          대시보드
        </Link>

        {user?.role === 'admin' && (
          <Link
            href="/admin/users"
            className={cn(
              'block rounded-md px-3 py-2 text-sm',
              pathname.startsWith('/admin')
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
          >
            사용자 관리
          </Link>
        )}

        <div className="pt-4">
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">프로젝트</span>
            <Link href="/projects/new">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                + 새 프로젝트
              </Button>
            </Link>
          </div>
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={cn(
                'block rounded-md px-3 py-2 text-sm truncate',
                pathname.startsWith(`/projects/${project.id}`)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              {project.name}
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex-1 truncate text-sm">{user?.name}</div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-xs">
            로그아웃
          </Button>
        </div>
      </div>
    </aside>
  );
}
