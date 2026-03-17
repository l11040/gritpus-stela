'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { fetcher } from '@/api/fetcher';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Plus,
  LogOut,
  Hash,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { NotificationBell } from '@/features/notification/components/notification-bell';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Project {
  id: string;
  name: string;
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all duration-150',
            active
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetcher<Project[]>({ url: '/projects', method: 'GET' })
      .then(setProjects)
      .catch(() => {});
  }, []);

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-12 items-center justify-center">
          <button
            onClick={onToggle}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <PanelLeft className="size-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard"
                className={cn(
                  'rounded-md p-2 transition-all duration-150',
                  pathname === '/dashboard'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <LayoutDashboard className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">대시보드</TooltipContent>
          </Tooltip>

          <div className="my-1 h-px w-6 bg-border" />

          {projects.map((project) => {
            const isActive = pathname.startsWith(`/projects/${project.id}`);
            return (
              <Tooltip key={project.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={`/projects/${project.id}`}
                    className={cn(
                      'rounded-md p-2 transition-all duration-150',
                      isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Hash className="size-3.5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{project.name}</TooltipContent>
              </Tooltip>
            );
          })}

          <div className="my-1 h-px w-6 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/weekly"
                className={cn(
                  'rounded-md p-2 transition-all duration-150',
                  pathname.startsWith('/weekly')
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <ClipboardList className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">주간 업무</TooltipContent>
          </Tooltip>
        </nav>

        <div className="flex flex-col items-center gap-1 border-t border-border p-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  'rounded-md p-2 transition-all duration-150',
                  pathname === '/settings'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Settings className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">설정</TooltipContent>
          </Tooltip>
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {user?.name?.[0] || '?'}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar">
      {/* Header */}
      <div className="flex h-12 items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          Gritpus Stela
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={onToggle}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        <NavItem
          href="/dashboard"
          icon={LayoutDashboard}
          label="대시보드"
          active={pathname === '/dashboard'}
        />

        {/* Divider */}
        <div className="my-3! h-px bg-border" />

        {/* Projects section */}
        <div className="flex items-center justify-between px-2.5 pb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            프로젝트
          </span>
          <Link
            href="/projects/new"
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </Link>
        </div>

        {projects.map((project) => {
          const isActive = pathname.startsWith(`/projects/${project.id}`);
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all duration-150',
                isActive
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Hash className="size-3.5 shrink-0" />
              <span className="truncate">{project.name}</span>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3! h-px bg-border" />

        {/* Tools section */}
        <div className="flex items-center justify-between px-2.5 pb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            도구
          </span>
        </div>

        <NavItem
          href="/weekly"
          icon={ClipboardList}
          label="주간 업무"
          active={pathname.startsWith('/weekly')}
        />
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <NavItem
          href="/settings"
          icon={Settings}
          label="설정"
          active={pathname === '/settings'}
        />
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {user?.name?.[0] || '?'}
          </div>
          <span className="flex-1 truncate text-sm text-foreground">
            {user?.name}
          </span>
          <button
            onClick={logout}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
