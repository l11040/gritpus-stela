'use client';

import { cn } from '@/lib/utils';
import type { SlideContent } from '../types';

interface SlideTocProps {
  slides: SlideContent[];
  currentSlide: number;
  isOpen: boolean;
  onClose: () => void;
  onGoToSlide: (index: number) => void;
}

export function SlideToc({
  slides,
  currentSlide,
  isOpen,
  onClose,
  onGoToSlide,
}: SlideTocProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-72 bg-slate-900 shadow-2xl transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-medium text-white/80">슬라이드 목차</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <nav className="overflow-y-auto p-2">
          {slides.map((slide, i) => (
            <button
              key={i}
              onClick={() => {
                onGoToSlide(i);
                onClose();
              }}
              className={cn(
                'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                i === currentSlide
                  ? 'bg-primary/20 text-primary'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <span className="mr-2 text-xs text-white/30">{i + 1}.</span>
              {slide.title || (slide.isTitle ? '타이틀' : `슬라이드 ${i + 1}`)}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
