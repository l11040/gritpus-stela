'use client';

import { useState } from 'react';
import {
  Sparkles,
  Clock,
  LayoutGrid,
  Timer,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { MdDocumentSummary } from '../types';

/** DB에 이전 형식(keyPoints)으로 저장된 데이터를 새 형식으로 변환 */
function normalizeSummary(raw: MdDocumentSummary): MdDocumentSummary {
  const legacy = raw as MdDocumentSummary & { keyPoints?: string[] };
  return {
    slideCount: raw.slideCount ?? 0,
    estimatedDuration: raw.estimatedDuration ?? '',
    keyMessages: raw.keyMessages ?? legacy.keyPoints ?? [],
    audienceNotes: raw.audienceNotes ?? '',
    suggestedFlow: raw.suggestedFlow ?? [],
    tableOfContents: raw.tableOfContents ?? [],
    estimatedReadTime: raw.estimatedReadTime ?? 0,
  };
}

interface SummaryPanelProps {
  summary: MdDocumentSummary | null;
  isProcessing: boolean;
  isFailed: boolean;
  currentMessage: string | null;
  onStartSummary: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function SummaryPanel({
  summary,
  isProcessing,
  isFailed,
  currentMessage,
  onStartSummary,
  isOpen,
  onClose,
}: SummaryPanelProps) {
  const [showAudienceNotes, setShowAudienceNotes] = useState(false);

  const renderContent = () => {
    if (isProcessing) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Loader2 className="size-4 animate-spin" />
            AI 분석 중...
          </div>
          {currentMessage && (
            <p className="mt-2 text-xs text-muted-foreground">
              {currentMessage}
            </p>
          )}
        </div>
      );
    }

    if (isFailed) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="size-4" />
            분석 생성에 실패했습니다.
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="mb-2 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            아직 분석 결과가 없습니다.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={onStartSummary}
          >
            <Sparkles className="size-3.5" />
            AI 분석 시작
          </Button>
        </div>
      );
    }

    const s = normalizeSummary(summary);

    return (
      <div className="space-y-5">
        {/* 메트릭 뱃지 */}
        <div className="flex flex-wrap items-center gap-2">
          {s.slideCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <LayoutGrid className="size-3" />
              슬라이드 {s.slideCount}장
            </Badge>
          )}
          {s.estimatedDuration && (
            <Badge variant="secondary" className="gap-1">
              <Timer className="size-3" />
              발표 {s.estimatedDuration}
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3" />
            읽기 약 {s.estimatedReadTime}분
          </Badge>
        </div>

        {/* 핵심 메시지 */}
        {s.keyMessages.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">
              핵심 메시지
            </h4>
            <ol className="space-y-1.5">
              {s.keyMessages.map((msg, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-foreground"
                >
                  <span className="shrink-0 text-xs font-medium text-primary">
                    {i + 1}.
                  </span>
                  {msg}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 발표 흐름 */}
        {s.suggestedFlow.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">
              추천 발표 흐름
            </h4>
            <div className="space-y-2">
              {s.suggestedFlow.map((flow, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-md border border-border bg-background p-3"
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {flow.section}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {flow.slides}장
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {flow.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 청중 분석 */}
        {s.audienceNotes && (
          <div>
            <button
              onClick={() => setShowAudienceNotes(!showAudienceNotes)}
              className="flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Users className="size-3" />
              청중 분석
              {showAudienceNotes ? (
                <ChevronUp className="ml-auto size-3" />
              ) : (
                <ChevronDown className="ml-auto size-3" />
              )}
            </button>
            {showAudienceNotes && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.audienceNotes}
              </p>
            )}
          </div>
        )}

        {/* 재분석 버튼 */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={onStartSummary}
        >
          <Sparkles className="size-3.5" />
          다시 분석
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[440px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI 문서 분석
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
}
