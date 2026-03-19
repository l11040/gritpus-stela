'use client';

import { useEffect, useRef, useState, useId, memo } from 'react';
import mermaid from 'mermaid';
import { PannableSvg } from './pannable-svg';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: "'Pretendard', sans-serif",
  });
}

interface MermaidBlockProps {
  chart: string;
}

export const MermaidBlock = memo(function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const reactId = useId();
  const idRef = useRef(`mermaid-${reactId.replace(/:/g, '')}`);
  const renderedChartRef = useRef<string>('');

  useEffect(() => {
    // 같은 chart가 이미 렌더된 경우 스킵
    if (chart === renderedChartRef.current && svg) return;

    ensureInit();

    let cancelled = false;

    const renderChart = async () => {
      try {
        // mermaid.render는 같은 ID를 재사용하면 에러가 날 수 있으므로 임시 ID 사용
        const tempId = `${idRef.current}-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(tempId, chart);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError('');
          renderedChartRef.current = chart;
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setSvg('');
        }
      }
    };

    renderChart();

    return () => {
      cancelled = true;
    };
  }, [chart]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <div className="mb-2 font-mono text-xs text-red-500">
          Mermaid Error
        </div>
        <pre className="whitespace-pre-wrap text-xs text-red-600 dark:text-red-400">
          {error}
        </pre>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            원본 코드
          </summary>
          <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-lg border border-border">
      <PannableSvg svg={svg} className="mermaid-container min-h-[200px]" />
    </div>
  );
});
