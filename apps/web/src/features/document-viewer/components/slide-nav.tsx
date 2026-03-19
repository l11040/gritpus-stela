'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X, ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';

interface SlideNavProps {
  currentSlide: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function SlideNav({
  currentSlide,
  totalSlides,
  onPrev,
  onNext,
  onExit,
  isFullscreen,
  onToggleFullscreen,
}: SlideNavProps) {
  const progress = ((currentSlide + 1) / totalSlides) * 100;

  return (
    <>
      <div className="progress-bar" style={{ width: `${progress}%` }} />

      <nav className="slide-nav">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          title="문서 모드로 돌아가기 (Esc)"
          className="h-8 cursor-pointer gap-1.5 px-3 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" />
          닫기
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            disabled={currentSlide === 0}
            title="이전 (←)"
            className="h-8 w-8 cursor-pointer text-white/70 hover:bg-white/10 hover:text-white disabled:text-white/20 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="min-w-[48px] select-none text-center text-xs font-medium tabular-nums text-white/60">
            {currentSlide + 1}
            <Separator
              orientation="vertical"
              className="mx-1.5 inline-block h-3 !bg-white/20"
            />
            {totalSlides}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={currentSlide === totalSlides - 1}
            title="다음 (→)"
            className="h-8 w-8 cursor-pointer text-white/70 hover:bg-white/10 hover:text-white disabled:text-white/20 disabled:hover:bg-transparent"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              title={isFullscreen ? '전체화면 해제 (F)' : '전체화면 (F)'}
              className="h-8 cursor-pointer gap-1.5 px-3 text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="size-3.5" />
                  전체화면 해제
                </>
              ) : (
                <>
                  <Maximize className="size-3.5" />
                  전체화면
                </>
              )}
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50">F</kbd>
            </Button>
          )}
        </div>
      </nav>
    </>
  );
}
