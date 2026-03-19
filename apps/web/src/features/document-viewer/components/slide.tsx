'use client';

import { MarkdownRenderer } from './markdown-renderer';
import type { SlideContent } from '../types';

interface SlideProps {
  slide: SlideContent;
  isActive: boolean;
}

export function Slide({ slide, isActive }: SlideProps) {
  if (slide.isTitle && !slide.title) {
    return (
      <div className={`slide ${isActive ? 'active' : ''} slide-title`}>
        <div className="slide-inner text-center">
          <MarkdownRenderer content={slide.content} />
        </div>
      </div>
    );
  }

  return (
    <div className={`slide ${isActive ? 'active' : ''}`}>
      <div className="slide-inner">
        {slide.title && (
          <h2 className="mb-6 text-3xl font-bold text-foreground">
            {slide.title}
          </h2>
        )}
        <MarkdownRenderer content={slide.content} />
      </div>
    </div>
  );
}
