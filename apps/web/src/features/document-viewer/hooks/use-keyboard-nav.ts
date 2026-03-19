'use client';

import { useEffect } from 'react';

interface UseKeyboardNavProps {
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
  onToggleFullscreen?: () => void;
  enabled: boolean;
}

export function useKeyboardNav({
  onNext,
  onPrev,
  onExit,
  onToggleFullscreen,
  enabled,
}: UseKeyboardNavProps) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          onNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPrev();
          break;
        case 'Escape':
          e.preventDefault();
          onExit();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          onToggleFullscreen?.();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev, onExit, onToggleFullscreen, enabled]);
}
