'use client';

import {
  ArrowLeft,
  Share2,
  Trash2,
  Presentation,
  Sparkles,
  History,
  Download,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface DocumentToolbarProps {
  title: string;
  isShared: boolean;
  isOwner: boolean;
  onToggleSharing: () => void;
  onDelete: () => void;
  onPresent: () => void;
  onSummarize: () => void;
  onShowVersions: () => void;
  onExportPdf: () => void;
  isSummarizing: boolean;
}

export function DocumentToolbar({
  title,
  isShared,
  isOwner,
  onToggleSharing,
  onDelete,
  onPresent,
  onSummarize,
  onShowVersions,
  onExportPdf,
  isSummarizing,
}: DocumentToolbarProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-3">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push('/docs')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {isShared ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            공유됨
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onSummarize}
          disabled={isSummarizing}
        >
          <Sparkles className="size-3.5" />
          AI 요약
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onPresent}
        >
          <Presentation className="size-3.5" />
          프레젠테이션
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onShowVersions}
        >
          <History className="size-3.5" />
          버전
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onExportPdf}
        >
          <Download className="size-3.5" />
          PDF
        </Button>
        {isOwner && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={onToggleSharing}
            >
              <Share2 className="size-3.5" />
              {isShared ? '공유 해제' : '공유'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
              삭제
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
