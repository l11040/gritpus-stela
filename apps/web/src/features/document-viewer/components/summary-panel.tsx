'use client';

import { Sparkles, Clock, List, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MdDocumentSummary } from '../types';

interface SummaryPanelProps {
  summary: MdDocumentSummary | null;
  isProcessing: boolean;
  isFailed: boolean;
  currentMessage: string | null;
  onStartSummary: () => void;
}

export function SummaryPanel({
  summary,
  isProcessing,
  isFailed,
  currentMessage,
  onStartSummary,
}: SummaryPanelProps) {
  if (isProcessing) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Loader2 className="size-4 animate-spin" />
          AI 요약 생성 중...
        </div>
        {currentMessage && (
          <p className="mt-2 text-xs text-muted-foreground">{currentMessage}</p>
        )}
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertCircle className="size-4" />
          요약 생성에 실패했습니다.
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onStartSummary}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  if (!summary) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onStartSummary}
      >
        <Sparkles className="size-3.5" />
        AI 요약
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="size-4 text-primary" />
        AI 요약
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">
            핵심 포인트
          </h4>
          <ul className="space-y-1">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="text-sm leading-relaxed text-foreground">
                <span className="mr-1.5 text-primary">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            읽기 약 {summary.estimatedReadTime}분
          </span>
          <span className="flex items-center gap-1">
            <List className="size-3" />
            섹션 {summary.tableOfContents.length}개
          </span>
        </div>
      </div>
    </div>
  );
}
