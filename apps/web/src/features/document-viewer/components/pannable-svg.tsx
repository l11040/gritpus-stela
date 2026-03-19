'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import panzoom, { type PanZoom } from 'panzoom';

interface PannableSvgProps {
  svg: string;
  className?: string;
}

export function PannableSvg({ svg, className }: PannableSvgProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const pzRef = useRef<PanZoom | null>(null);
  const [zoom, setZoom] = useState(1);
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);

  // activeRef를 동기적으로 유지
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!innerRef.current) return;

    const instance = panzoom(innerRef.current, {
      maxZoom: 5,
      minZoom: 0.3,
      smoothScroll: false,
      zoomDoubleClickSpeed: 1,
      beforeWheel: () => {
        // true를 반환하면 줌 차단
        return !activeRef.current;
      },
      beforeMouseDown: () => {
        // true를 반환하면 패닝 차단
        return !activeRef.current;
      },
    });

    pzRef.current = instance;

    instance.on('zoom', () => {
      const t = instance.getTransform();
      setZoom(t.scale);
    });

    return () => {
      instance.dispose();
      pzRef.current = null;
    };
  }, [svg]);

  const handleReset = useCallback(() => {
    if (!pzRef.current) return;
    pzRef.current.moveTo(0, 0);
    pzRef.current.zoomAbs(0, 0, 1);
    setZoom(1);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!pzRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    pzRef.current.smoothZoom(rect.width / 2, rect.height / 2, 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!pzRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    pzRef.current.smoothZoom(rect.width / 2, rect.height / 2, 0.7);
  }, []);

  const handleToggle = useCallback(() => {
    setActive((prev) => {
      if (prev) {
        // 비활성화 시 리셋
        if (pzRef.current) {
          pzRef.current.moveTo(0, 0);
          pzRef.current.zoomAbs(0, 0, 1);
          setZoom(1);
        }
      }
      return !prev;
    });
  }, []);

  return (
    <div className={`group/pz relative ${className ?? ''}`}>
      <div
        ref={containerRef}
        className={`overflow-hidden ${active ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ touchAction: active ? 'none' : 'auto' }}
      >
        <div
          ref={innerRef}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {/* 컨트롤 */}
      <div className="absolute right-1.5 top-1.5 flex items-center opacity-0 transition-opacity group-hover/pz:opacity-100">
        {!active ? (
          <button
            type="button"
            onClick={handleToggle}
            className="rounded-md bg-foreground/5 px-2.5 py-1 text-xs text-muted-foreground/60 backdrop-blur-sm transition-colors hover:bg-foreground/10 hover:text-muted-foreground"
          >
            확대
          </button>
        ) : (
          <div className="flex items-center gap-0.5 rounded-md bg-foreground/5 backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-2 py-1 text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              −
            </button>
            <span className="min-w-8 text-center text-xs tabular-nums text-muted-foreground/50">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-2 py-1 text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="border-l border-foreground/5 px-2 py-1 text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
              title="리셋"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
