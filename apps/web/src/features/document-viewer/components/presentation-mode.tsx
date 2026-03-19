'use client';

import { useState, useCallback, useEffect } from 'react';
import { Slide } from './slide';
import { SlideNav } from './slide-nav';
import { SlideToc } from './slide-toc';
import { useKeyboardNav } from '../hooks/use-keyboard-nav';
import { useFullscreen } from '../hooks/use-fullscreen';
import { splitIntoSlides } from '../lib/markdown-utils';
import '../styles/presentation.css';

interface PresentationModeProps {
  content: string;
  onExit: () => void;
}

export function PresentationMode({ content, onExit }: PresentationModeProps) {
  const slides = splitIntoSlides(content);
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

  useKeyboardNav({
    onNext: goNext,
    onPrev: goPrev,
    onExit: handleExit,
    onToggleFullscreen: toggleFullscreen,
    enabled: !isTocOpen,
  });

  return (
    <div className="presentation-mode">
      <div className="relative h-screen w-screen">
        {slides.map((slide, i) => (
          <Slide key={i} slide={slide} isActive={i === currentSlide} />
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
      <SlideToc
        slides={slides}
        currentSlide={currentSlide}
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        onGoToSlide={setCurrentSlide}
      />
      <button
        onClick={() => setIsTocOpen(true)}
        className="fixed right-4 top-4 z-40 rounded-full bg-black/40 p-2 text-white/60 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
        title="목차"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      </button>
    </div>
  );
}
