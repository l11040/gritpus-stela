'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useParseProgress } from '../hooks/use-parse-progress';

type ParseProgressContextType = ReturnType<typeof useParseProgress>;

const ParseProgressContext = createContext<ParseProgressContextType | null>(null);

export function ParseProgressProvider({ children }: { children: ReactNode }) {
  const progress = useParseProgress();

  return (
    <ParseProgressContext.Provider value={progress}>
      {children}
    </ParseProgressContext.Provider>
  );
}

export function useParseProgressContext() {
  const ctx = useContext(ParseProgressContext);
  if (!ctx) throw new Error('useParseProgressContext must be used within ParseProgressProvider');
  return ctx;
}
