'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { fetcher } from '@/api/fetcher';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  LayoutDashboard,
  ClipboardList,
  FolderKanban,
  CircleUserRound,
  LogOut,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

export function MobileNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetcher<Project[]>({ url: '/projects', method: 'GET' })
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const updateOffset = () => {
      if (window.matchMedia('(min-width: 768px)').matches) {
        root.style.setProperty('--mobile-nav-offset', '0px');
        return;
      }
      const navHeight = navRef.current
        ? Math.ceil(navRef.current.getBoundingClientRect().height)
        : 0;
      root.style.setProperty('--mobile-nav-offset', `${navHeight}px`);
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);
    window.addEventListener('orientationchange', updateOffset);
    window.visualViewport?.addEventListener('resize', updateOffset);

    const resizeObserver =
      navRef.current && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateOffset)
        : null;
    if (resizeObserver && navRef.current) {
      resizeObserver.observe(navRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateOffset);
      window.removeEventListener('orientationchange', updateOffset);
      window.visualViewport?.removeEventListener('resize', updateOffset);
      resizeObserver?.disconnect();
      root.style.setProperty('--mobile-nav-offset', '0px');
    };
  }, []);

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const currentProjectId = projectMatch?.[1];
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const isHome = pathname === '/dashboard';
  const isWeekly = pathname.startsWith('/weekly');
  const isProject = !!currentProjectId;

  return (
    <>
      {/* Profile drawer (shadcn/vaul) */}
      <Drawer open={profileOpen} onOpenChange={setProfileOpen}>
        <DrawerContent className="mx-auto max-w-sm rounded-t-3xl md:hidden">
          <DrawerTitle className="sr-only">내 정보</DrawerTitle>
          <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-2">
            <div className="flex items-center gap-3 pb-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-primary/5 text-base font-semibold text-primary">
                {user?.name?.[0] || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{user?.name}</p>
                <p className="truncate text-[13px] text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            <button
              onClick={() => {
                setProfileOpen(false);
                logout();
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-1 py-3 text-[15px] text-destructive transition-colors active:bg-destructive/8"
            >
              <LogOut className="size-4.5" />
              로그아웃
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Bottom navigation — liquid glass pill */}
      <nav
        ref={navRef}
        data-mobile-nav="true"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+6px)] md:hidden"
      >
        <div className="mobile-nav-glass flex items-stretch rounded-full">
          <NavPill
            href="/dashboard"
            icon={LayoutDashboard}
            label="홈"
            active={isHome}
          />

          <NavPill
            href="/weekly"
            icon={ClipboardList}
            label="주간"
            active={isWeekly}
          />

          {projects.length > 0 && (
            <NavPill
              href={
                currentProject
                  ? `/projects/${currentProject.id}`
                  : `/projects/${projects[0].id}`
              }
              icon={FolderKanban}
              label={currentProject?.name || '프로젝트'}
              active={isProject}
            />
          )}

          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="mobile-nav-item relative flex flex-col items-center justify-center gap-0.75 px-6 py-2 transition-all duration-200 active:scale-[0.92]"
          >
            {profileOpen && (
              <span className="absolute inset-1 rounded-full bg-foreground/[0.07]" />
            )}
            <CircleUserRound
              className={cn(
                'relative size-5.25 stroke-[1.6] transition-colors duration-200',
                profileOpen ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'relative text-[10px] font-medium leading-none tracking-tight transition-colors duration-200',
                profileOpen ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              내 정보
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

function NavPill({
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
    <Link
      href={href}
      className="mobile-nav-item relative flex flex-col items-center justify-center gap-0.75 px-6 py-2 transition-all duration-200 active:scale-[0.92]"
    >
      {active && (
        <span className="absolute inset-1 rounded-full bg-foreground/[0.07]" />
      )}
      <Icon
        className={cn(
          'relative size-5.25 stroke-[1.6] transition-colors duration-200',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      />
      <span
        className={cn(
          'relative max-w-13 truncate text-[10px] font-medium leading-none tracking-tight transition-colors duration-200',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </Link>
  );
}
