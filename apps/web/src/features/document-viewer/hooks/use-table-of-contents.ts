'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTableOfContents(
  contentRef: React.RefObject<HTMLDivElement | null>,
) {
  const [activeId, setActiveId] = useState<string>('');

  const observe = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    const headings = el.querySelectorAll('h1[id], h2[id], h3[id]');
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [contentRef]);

  useEffect(() => {
    const cleanup = observe();
    return cleanup;
  }, [observe]);

  return { activeId, refreshObserver: observe };
}
