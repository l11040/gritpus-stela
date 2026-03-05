'use client';

import { useParams, useSelectedLayoutSegment } from 'next/navigation';
import Link from 'next/link';
import { useProject } from '@/features/project/hooks/use-project';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

const TABS = [
  { key: null, label: '개요', href: '' },
  { key: 'boards', label: '보드', href: '/boards' },
  { key: 'meetings', label: '회의록', href: '/meetings' },
  { key: 'documents', label: '문서', href: '/documents' },
  { key: 'settings', label: '설정', href: '/settings' },
] as const;

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { projectId } = useParams<{ projectId: string }>();
  const segment = useSelectedLayoutSegment();
  const { project, isLoading } = useProject(projectId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-5 px-6 pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">대시보드</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                <BreadcrumbPage>{project?.name}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {isLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : (
          <header className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {project?.name}
            </h1>
            {project?.description && (
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </header>
        )}
      </div>

      <div className="mt-5 border-b border-border">
        <div className="flex gap-1 overflow-x-auto px-6 scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = segment === tab.key;
            return (
              <Link
                key={tab.label}
                href={`/projects/${projectId}${tab.href}`}
                className={cn(
                  'relative shrink-0 whitespace-nowrap px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
