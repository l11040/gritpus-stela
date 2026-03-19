'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let idCounter = 0;

function initMermaid() {
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

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const idRef = useRef(`mermaid-${++idCounter}`);

  useEffect(() => {
    initMermaid();

    const renderChart = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(
          idRef.current,
          chart,
        );
        setSvg(renderedSvg);
        setError('');
      } catch (err) {
        setError(String(err));
        setSvg('');
      }
    };

    renderChart();
  }, [chart]);

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
    <div className="my-4 flex justify-center">
      <div
        ref={containerRef}
        className="mermaid-container max-w-full overflow-x-auto rounded-lg border border-border bg-muted/30 p-4"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
