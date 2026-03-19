'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { PannableSvg } from './pannable-svg';
import type { AiSlideItem, AiSlideElement } from '../types';

let mermaidReady = false;
function ensureMermaid() {
  if (mermaidReady) return;
  mermaidReady = true;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: "'Pretendard', sans-serif",
  });
}

function SlideMermaid({ code }: { code: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const idRef = useRef(`slide-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  useEffect(() => {
    if (!code.trim()) return;
    ensureMermaid();
    let cancelled = false;

    (async () => {
      try {
        const tempId = `${idRef.current}-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(tempId, code);
        if (!cancelled) {
          setSvg(rendered);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setSvg('');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-500">
        Mermaid 렌더링 실패
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="my-5 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
      <PannableSvg svg={svg} className="min-h-[200px] [&_svg]:w-full [&_svg]:h-auto" />
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  // **bold** and `code`
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function InlineText({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(text) }} />;
}

function ElementRenderer({ element }: { element: AiSlideElement }) {
  const [kind, data] = element;

  switch (kind) {
    case 'p':
      return (
        <p className="mb-3 text-base leading-relaxed text-slate-800">
          <InlineText text={data as string} />
        </p>
      );

    case 'h3':
      return (
        <h3 className="mb-3 mt-6 text-lg font-semibold text-blue-900 first:mt-0">
          <InlineText text={data as string} />
        </h3>
      );

    case 'code':
      return (
        <pre className="my-4 overflow-x-auto rounded-lg bg-slate-800 p-5 text-sm leading-relaxed text-slate-200">
          <code>{data as string}</code>
        </pre>
      );

    case 'highlight-box':
      return (
        <div className="my-4 rounded-r-lg border-l-4 border-blue-600 bg-blue-50 px-5 py-4 text-sm leading-relaxed">
          <InlineText text={data as string} />
        </div>
      );

    case 'warning-box':
      return (
        <div className="my-4 rounded-r-lg border-l-4 border-amber-500 bg-amber-50 px-5 py-4 text-sm leading-relaxed">
          <InlineText text={data as string} />
        </div>
      );

    case 'list': {
      const listData = data as { items: string[]; ordered?: boolean };
      const Tag = listData.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`my-3 space-y-1.5 pl-6 text-sm leading-relaxed text-slate-800 ${listData.ordered ? 'list-decimal' : 'list-disc'}`}>
          {listData.items.map((item, i) => (
            <li key={i} className="pl-1"><InlineText text={item} /></li>
          ))}
        </Tag>
      );
    }

    case 'ul':
    case 'ol': {
      const items = data as string[];
      const Tag = kind === 'ol' ? 'ol' : 'ul';
      return (
        <Tag className={`my-3 space-y-1.5 pl-6 text-sm leading-relaxed text-slate-800 ${kind === 'ol' ? 'list-decimal' : 'list-disc'}`}>
          {items.map((item, i) => (
            <li key={i} className="pl-1"><InlineText text={item} /></li>
          ))}
        </Tag>
      );
    }

    case 'table': {
      const t = data as { headers: string[]; rows: string[][]; compact?: boolean };
      return (
        <div className="my-4 overflow-x-auto rounded-lg">
          <table className={`w-full border border-border text-sm ${t.compact ? '' : ''}`}>
            <thead>
              <tr>
                {t.headers.map((h, i) => (
                  <th
                    key={i}
                    className={`bg-blue-600 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white ${
                      i === 0 ? 'rounded-tl-lg' : ''
                    } ${i === t.headers.length - 1 ? 'rounded-tr-lg' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row, ri) => (
                <tr key={ri} className="transition-colors hover:bg-blue-50">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`border-b border-slate-200 px-4 ${t.compact ? 'py-2' : 'py-3'} ${
                        ri % 2 === 1 ? 'bg-slate-50' : ''
                      }`}
                    >
                      <InlineText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'flow': {
      const f = data as { steps: string[]; highlight?: number };
      return (
        <div className="my-4 flex flex-wrap items-center gap-0">
          {f.steps.map((step, i) =>
            step === '→' ? (
              <span key={i} className="mx-2 text-lg text-slate-400">→</span>
            ) : (
              <span
                key={i}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${
                  f.highlight === i
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-900'
                }`}
              >
                {step}
              </span>
            ),
          )}
        </div>
      );
    }

    case 'card-grid': {
      const g = data as { cols: number; cards: { title: string; body: string }[] };
      return (
        <div
          className={`my-4 grid gap-4 ${
            g.cols === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {g.cards.map((card, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="mb-2 text-sm font-semibold text-blue-600">{card.title}</h4>
              <p className="text-sm leading-relaxed text-slate-500">
                <InlineText text={card.body} />
              </p>
            </div>
          ))}
        </div>
      );
    }

    case 'cols': {
      const c = data as { columns: AiSlideElement[][] };
      return (
        <div
          className={`my-4 grid gap-5 ${
            c.columns.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {c.columns.map((col, ci) => (
            <div key={ci} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              {col.map((el, ei) => (
                <ElementRenderer key={ei} element={el} />
              ))}
            </div>
          ))}
        </div>
      );
    }

    case 'badges': {
      const badges = data as { text: string; color: string }[];
      const colorMap: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-emerald-100 text-emerald-800',
        yellow: 'bg-amber-100 text-amber-800',
        red: 'bg-red-100 text-red-800',
        gray: 'bg-slate-100 text-slate-600',
      };
      return (
        <div className="my-3 flex flex-wrap gap-2">
          {badges.map((b, i) => (
            <span
              key={i}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                colorMap[b.color] || colorMap.blue
              }`}
            >
              {b.text}
            </span>
          ))}
        </div>
      );
    }

    case 'status-flow': {
      const items = data as (string | { text: string; color: string })[];
      const sColorMap: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-emerald-100 text-emerald-800',
        yellow: 'bg-amber-100 text-amber-800',
        red: 'bg-red-100 text-red-800',
        gray: 'bg-slate-100 text-slate-600',
        purple: 'bg-violet-100 text-violet-800',
        orange: 'bg-orange-100 text-orange-800',
      };
      return (
        <div className="my-3 flex flex-wrap items-center gap-1.5">
          {items.map((item, i) =>
            typeof item === 'string' ? (
              <span key={i} className="text-sm text-slate-400">{item}</span>
            ) : (
              <span
                key={i}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold ${
                  sColorMap[item.color] || sColorMap.blue
                }`}
              >
                {item.text}
              </span>
            ),
          )}
        </div>
      );
    }

    case 'mermaid':
      return <SlideMermaid code={data as string} />;

    case 'html':
      return <div className="my-3" dangerouslySetInnerHTML={{ __html: data as string }} />;

    default:
      return null;
  }
}

// ─── Slide Type Renderers ───

function TitleSlide({ slide }: { slide: AiSlideItem & { type: 'title' } }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 text-center text-white">
      <h1 className="mb-4 text-5xl font-bold leading-tight">{slide.title}</h1>
      {slide.subtitle && (
        <p className="text-xl text-white/80">{slide.subtitle}</p>
      )}
    </div>
  );
}

function TocSlide({
  slide,
  onGoToSlide,
}: {
  slide: AiSlideItem & { type: 'toc' };
  onGoToSlide: (n: number) => void;
}) {
  return (
    <div className="flex h-full flex-col bg-white p-16">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
        AGENDA
      </p>
      <h2 className="mb-8 text-3xl font-bold text-slate-800">목차</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {slide.cards.map((card, i) => (
          <button
            key={i}
            onClick={() => onGoToSlide(card.slide)}
            className="flex gap-3 rounded-xl border border-slate-200 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              {card.num}
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-800">{card.title}</div>
              {card.desc && (
                <div className="mt-1 text-xs text-slate-400">{card.desc}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionSlide({ slide }: { slide: AiSlideItem & { type: 'section' } }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 text-center text-white">
      <div className="mb-[-20px] text-7xl font-bold text-white/15">{slide.num}</div>
      <h2 className="text-4xl font-bold">{slide.title}</h2>
      {slide.subtitle && (
        <p className="mt-4 text-lg text-white/50">{slide.subtitle}</p>
      )}
    </div>
  );
}

function ContentSlide({ slide }: { slide: AiSlideItem & { type: 'content' } }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-20 py-16">
        <h2 className="mb-2 text-3xl font-bold text-slate-800">{slide.title}</h2>
        {slide.subtitle && (
          <p className="mb-10 text-lg text-slate-500">{slide.subtitle}</p>
        )}
        {!slide.subtitle && <div className="mb-8" />}
        {slide.elements?.map((el, i) => (
          <ElementRenderer key={i} element={el} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Renderer ───

interface AiSlideRendererProps {
  slide: AiSlideItem;
  isActive: boolean;
  onGoToSlide: (n: number) => void;
}

export function AiSlideRenderer({ slide, isActive, onGoToSlide }: AiSlideRendererProps) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0">
      {slide.type === 'title' && <TitleSlide slide={slide} />}
      {slide.type === 'toc' && <TocSlide slide={slide} onGoToSlide={onGoToSlide} />}
      {slide.type === 'section' && <SectionSlide slide={slide} />}
      {slide.type === 'content' && <ContentSlide slide={slide} />}
    </div>
  );
}
