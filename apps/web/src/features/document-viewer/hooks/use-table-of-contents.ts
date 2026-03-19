'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TocHeading } from '../types';

const HEADING_SELECTOR = 'h1[id], h2[id], h3[id]';
/** 뷰포트 상단에서 이 픽셀 이내에 있으면 "지나간 헤딩"으로 간주 */
const ACTIVE_OFFSET = 100;

function collectHeadings(): TocHeading[] {
  const nodes = document.querySelectorAll<HTMLElement>(HEADING_SELECTOR);
  return Array.from(nodes).map((node) => ({
    id: node.id,
    text: node.textContent?.trim().replace(/^#\s*/, '') || '',
    level: parseInt(node.tagName[1], 10),
  }));
}

/** 뷰포트 기준으로 활성 헤딩 계산 — 스크롤 컨테이너에 의존하지 않음 */
function computeActiveId(): string {
  const nodes = document.querySelectorAll<HTMLElement>(HEADING_SELECTOR);
  let active = '';

  for (const node of nodes) {
    // getBoundingClientRect().top 은 뷰포트 상단 기준
    if (node.getBoundingClientRect().top <= ACTIVE_OFFSET) {
      active = node.id;
    } else {
      break;
    }
  }

  if (!active && nodes.length > 0) {
    active = nodes[0].id;
  }

  return active;
}

export function useTableOfContents(contentKey?: string | null) {
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState('');
  const rafRef = useRef(0);
  const isClickScrolling = useRef(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 1) 헤딩 수집
  useEffect(() => {
    let pollCount = 0;
    let timer: ReturnType<typeof setTimeout>;

    function tryCollect() {
      const collected = collectHeadings();

      if (collected.length === 0 && ++pollCount < 30) {
        timer = setTimeout(tryCollect, 200);
        return;
      }

      setHeadings(collected);
      if (collected.length > 0) {
        setActiveId(computeActiveId());
      }
    }

    timer = setTimeout(tryCollect, 100);
    return () => clearTimeout(timer);
  }, [contentKey]);

  // 2) 스크롤 감지 — document capture 로 어떤 요소의 스크롤이든 잡음
  useEffect(() => {
    if (headings.length === 0) return;

    function onScroll() {
      if (isClickScrolling.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setActiveId(computeActiveId());
      });
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [headings]);

  // 3) 목차 클릭 → 해당 헤딩으로 스크롤
  const scrollToHeading = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    isClickScrolling.current = true;
    setActiveId(id);

    target.scrollIntoView({ behavior: 'instant', block: 'start' });

    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  }, []);

  useEffect(() => {
    return () => clearTimeout(clickTimerRef.current);
  }, []);

  return { headings, activeId, scrollToHeading };
}
