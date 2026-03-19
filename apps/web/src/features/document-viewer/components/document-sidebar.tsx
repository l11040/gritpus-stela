'use client';

import { useState, useRef, useEffect } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { TocHeading } from '../types';

interface DocumentSidebarProps {
  headings: TocHeading[];
  activeId: string;
  onHeadingClick: (id: string) => void;
}

export function DocumentSidebar({ headings, activeId, onHeadingClick }: DocumentSidebarProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('doc-toc-open') !== 'false';
  });
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeId]);

  if (headings.length === 0) return null;

  if (!isOpen) {
    return (
      <aside className="sticky top-0 hidden h-dvh shrink-0 border-l border-border xl:block">
        <div className="flex flex-col items-center pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setIsOpen(true); localStorage.setItem('doc-toc-open', 'true'); }}
            title="목차 열기"
          >
            <PanelRightClose className="size-3.5" />
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-l border-border xl:block">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">목차</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => { setIsOpen(false); localStorage.setItem('doc-toc-open', 'false'); }}
          >
            <PanelRightOpen className="size-3.5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          <div className="space-y-0.5">
            {headings.map((heading) => {
              const isActive = activeId === heading.id;
              return (
                <button
                  key={heading.id}
                  ref={isActive ? activeRef : null}
                  onClick={() => onHeadingClick(heading.id)}
                  className={cn(
                    'relative block w-full truncate rounded-md py-1 pr-2 text-left text-sm transition-colors',
                    heading.level === 1 && 'pl-2 font-medium',
                    heading.level === 2 && 'pl-4',
                    heading.level === 3 && 'pl-6 text-xs',
                    isActive
                      ? 'border-l-2 border-primary bg-primary/5 text-foreground font-medium'
                      : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {heading.text}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}
