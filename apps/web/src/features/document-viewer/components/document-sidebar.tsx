'use client';

import { cn } from '@/lib/utils';
import type { TocHeading } from '../types';

interface DocumentSidebarProps {
  headings: TocHeading[];
  activeId: string;
}

export function DocumentSidebar({ headings, activeId }: DocumentSidebarProps) {
  if (headings.length === 0) return null;

  return (
    <aside className="hidden w-56 shrink-0 xl:block">
      <div className="sticky top-6">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          목차
        </h3>
        <nav className="space-y-0.5">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={cn(
                'block truncate rounded-md px-2 py-1 text-sm transition-colors',
                heading.level === 1 && 'font-medium',
                heading.level === 2 && 'pl-4',
                heading.level === 3 && 'pl-6 text-xs',
                activeId === heading.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {heading.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
