'use client';

import { useState, useCallback, useEffect } from 'react';
import { AiSlideRenderer } from './ai-slide-renderer';
import { SlideNav } from './slide-nav';
import { useKeyboardNav } from '../hooks/use-keyboard-nav';
import { useFullscreen } from '../hooks/use-fullscreen';
import type { SlidesJson } from '../types';
import '../styles/presentation.css';

interface AiPresentationModeProps {
  slidesJson: SlidesJson;
  onExit: () => void;
}

export function AiPresentationMode({ slidesJson, onExit }: AiPresentationModeProps) {
  const slides = slidesJson.slides;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    enterFullscreen();
    return () => {
      exitFullscreen();
    };
  }, [enterFullscreen, exitFullscreen]);

  const goNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleExit = useCallback(() => {
    exitFullscreen();
    onExit();
  }, [exitFullscreen, onExit]);

  const handleGoToSlide = useCallback((n: number) => {
    const idx = Math.max(0, Math.min(n - 1, slides.length - 1));
    setCurrentSlide(idx);
    setIsTocOpen(false);
  }, [slides.length]);

  useKeyboardNav({
    onNext: goNext,
    onPrev: goPrev,
    onExit: handleExit,
    onToggleFullscreen: toggleFullscreen,
    enabled: !isTocOpen,
  });

  return (
    <div className="presentation-mode">
      <div className="relative h-screen w-screen overflow-hidden bg-white">
        {slides.map((slide, i) => (
          <AiSlideRenderer
            key={i}
            slide={slide}
            isActive={i === currentSlide}
            onGoToSlide={handleGoToSlide}
          />
        ))}
      </div>
      <SlideNav
        currentSlide={currentSlide}
        totalSlides={slides.length}
        onPrev={goPrev}
        onNext={goNext}
        onExit={handleExit}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      {/* TOC 패널 */}
      {isTocOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button
            className="flex-1 bg-black/50"
            onClick={() => setIsTocOpen(false)}
          />
          <div className="w-80 overflow-y-auto bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/80">슬라이드 목차</h3>
              <button
                onClick={() => setIsTocOpen(false)}
                className="text-white/50 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-1">
              {slides.map((slide, i) => {
                const title =
                  slide.type === 'title' ? slide.title :
                  slide.type === 'toc' ? '목차' :
                  slide.type === 'section' ? `${slide.num}. ${slide.title}` :
                  slide.title;
                return (
                  <button
                    key={i}
                    onClick={() => handleGoToSlide(i + 1)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      i === currentSlide
                        ? 'bg-blue-600 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="mr-2 text-xs text-white/40">{i + 1}</span>
                    {title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsTocOpen(true)}
        className="fixed right-4 top-4 z-40 rounded-full bg-black/40 p-2 text-white/60 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
        title="목차"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
    </div>
  );
}
