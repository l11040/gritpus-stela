'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import mermaid from 'mermaid';
import { PannableSvg } from '@/features/document-viewer/components/pannable-svg';

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

function MermaidPreview({ code }: { code: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const idRef = useRef(`ed-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  useEffect(() => {
    if (!code.trim()) {
      setSvg('');
      setError('');
      return;
    }

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
      <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
        <div className="mb-1 font-mono text-xs text-red-500">Mermaid Error</div>
        <pre className="whitespace-pre-wrap text-xs text-red-600 dark:text-red-400">{error}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
        Mermaid 코드를 입력하세요
      </div>
    );
  }

  return (
    <PannableSvg svg={svg} className="min-h-[120px]" />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MermaidNodeView({ node, updateAttributes }: { node: any; updateAttributes: (attrs: Record<string, unknown>) => void }) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const code = (node.attrs.code as string) || '';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateAttributes({ code: e.target.value });
    },
    [updateAttributes],
  );

  // 코드 탭으로 전환 시 textarea에 포커스
  useEffect(() => {
    if (tab === 'code' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [tab]);

  // textarea 높이 자동 조절
  useEffect(() => {
    if (tab === 'code' && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = `${Math.max(120, el.scrollHeight)}px`;
    }
  }, [tab, code]);

  return (
    <NodeViewWrapper className="mermaid-editor-block my-4">
      <div className="rounded-lg border border-border overflow-hidden">
        {/* 탭 헤더 */}
        <div className="flex items-center border-b border-border bg-muted/40">
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === 'preview'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            미리보기
          </button>
          <button
            type="button"
            onClick={() => setTab('code')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === 'code'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            코드
          </button>
          <span className="ml-auto mr-3 text-[10px] text-muted-foreground">mermaid</span>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-3">
          {tab === 'preview' ? (
            <MermaidPreview code={code} />
          ) : (
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleCodeChange}
              spellCheck={false}
              className="w-full resize-none rounded-md bg-muted/30 p-3 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              placeholder={`graph TD\n    A[시작] --> B[끝]`}
            />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const MermaidExtension = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      code: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid-block"]',
        getAttrs: (dom) => ({
          code: (dom as HTMLElement).getAttribute('data-code') || '',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mermaid-block',
        'data-code': node.attrs.code,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },
});
