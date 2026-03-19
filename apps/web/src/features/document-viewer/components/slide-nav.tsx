'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SlideNavProps {
  currentSlide: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}

export function SlideNav({
  currentSlide,
  totalSlides,
  onPrev,
  onNext,
  onExit,
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
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
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
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
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
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        </div>

        <span className="select-none text-[10px] tracking-wider text-white/30">
          ← → Space
        </span>
      </nav>
    </>
  );
}
