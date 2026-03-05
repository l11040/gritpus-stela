'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParseProgressContext } from '../providers/parse-progress-provider';
import type { ParseProgressEvent } from '../hooks/use-parse-progress';

const STEP_ORDER = [
  'started',
  'analyzing',
  'resolving_assignees',
  'summarizing',
  'completed',
] as const;

const STEP_LABELS: Record<string, string> = {
  started: 'AI 파싱 시작',
  analyzing: '회의록 분석',
  resolving_assignees: '담당자 매칭',
  summarizing: '회의 요약 생성',
  completed: '완료',
};

function getCompletedSteps(events: ParseProgressEvent[]): Set<string> {
  const completed = new Set<string>();
  const seen = new Set<string>();
  for (const event of events) {
    if (STEP_ORDER.includes(event.step as (typeof STEP_ORDER)[number])) {
      seen.add(event.step);
    }
  }
  // A step is "completed" if a later step has been seen
  for (let i = 0; i < STEP_ORDER.length; i++) {
    const step = STEP_ORDER[i];
    const hasLaterStep = STEP_ORDER.slice(i + 1).some((s) => seen.has(s));
    if (hasLaterStep) completed.add(step);
  }
  return completed;
}

export function ParseProgressTracker() {
  const { job, events, currentStep, isComplete, isFailed, isParsing, dismiss } =
    useParseProgressContext();
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Auto-dismiss after completion
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        dismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, dismiss]);

  // Show/hide based on job presence
  useEffect(() => {
    if (job || isComplete || isFailed) {
      setVisible(true);
      setCollapsed(false);
    } else {
      setVisible(false);
    }
  }, [job, isComplete, isFailed]);

  if (!visible) return null;

  const completedSteps = getCompletedSteps(events);
  const currentMainStep = currentStep
    ? STEP_ORDER.find((s) => s === currentStep.step) || null
    : null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-lg border bg-background shadow-lg transition-all',
        isComplete && 'border-green-500/30',
        isFailed && 'border-destructive/30',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex cursor-pointer items-center justify-between px-3 py-2.5',
          isComplete && 'bg-green-500/5',
          isFailed && 'bg-destructive/5',
          isParsing && 'bg-muted/30',
        )}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {isParsing && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          {isComplete && <Check className="size-3.5 text-green-500" />}
          {isFailed && <AlertCircle className="size-3.5 text-destructive" />}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">
              {isComplete
                ? '파싱 완료'
                : isFailed
                  ? '파싱 실패'
                  : 'AI 파싱 중...'}
            </p>
            {job && (
              <p className="truncate text-[10px] text-muted-foreground">
                {job.meetingTitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(isComplete || isFailed) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          {collapsed ? (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="border-t px-3 py-2.5">
          <div className="space-y-1.5">
            {STEP_ORDER.map((step) => {
              if (step === 'completed') return null;
              const isDone = completedSteps.has(step) || isComplete;
              const isCurrent = currentMainStep === step && !isComplete && !isFailed;
              const isPending = !isDone && !isCurrent;

              return (
                <div key={step} className="flex items-center gap-2">
                  {isDone && (
                    <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                      <Check className="size-2.5 text-green-500" />
                    </div>
                  )}
                  {isCurrent && (
                    <div className="flex size-4 shrink-0 items-center justify-center">
                      <Loader2 className="size-3 animate-spin text-foreground" />
                    </div>
                  )}
                  {isPending && (
                    <div className="size-4 shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-xs',
                      isDone && 'text-muted-foreground',
                      isCurrent && 'font-medium text-foreground',
                      isPending && 'text-muted-foreground/50',
                    )}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detail message */}
          {currentStep && isParsing && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              {currentStep.message}
            </p>
          )}

          {isFailed && (
            <p className="mt-2 text-[10px] text-destructive">
              {currentStep?.message || 'AI 파싱에 실패했습니다.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
