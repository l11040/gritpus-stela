'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { CodeBlock } from './code-block';
import { MermaidBlock } from './mermaid-block';
import { Callout, isCalloutType } from './callout';
import { ImageZoom } from './image-zoom';
import type { Components } from 'react-markdown';
import { memo, type ReactNode } from 'react';
import '../styles/markdown.css';

interface MarkdownRendererProps {
  content: string;
}

function makeHeadingId(text: string, counts: Map<string, number>): string {
  let id = text
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-');
  const count = counts.get(id) || 0;
  counts.set(id, count + 1);
  if (count > 0) {
    id = `${id}-${count}`;
  }
  return id;
}

function HeadingAnchor({
  id,
  level,
  children,
}: {
  id: string;
  level: number;
  children: ReactNode;
}) {
  const anchor = (
    <a
      href={`#${id}`}
      className="heading-anchor absolute -left-6 top-0 text-muted-foreground opacity-0 transition-opacity no-underline hover:text-primary group-hover:opacity-100"
      aria-hidden="true"
    >
      #
    </a>
  );

  const cls = 'group relative';

  switch (level) {
    case 1:
      return (
        <h1 id={id} className={cls}>
          {anchor}
          {children}
        </h1>
      );
    case 2:
      return (
        <h2 id={id} className={cls}>
          {anchor}
          {children}
        </h2>
      );
    case 3:
      return (
        <h3 id={id} className={cls}>
          {anchor}
          {children}
        </h3>
      );
    case 4:
      return (
        <h4 id={id} className={cls}>
          {anchor}
          {children}
        </h4>
      );
    default:
      return (
        <h3 id={id} className={cls}>
          {anchor}
          {children}
        </h3>
      );
  }
}

const ASCII_CHARS =
  /[─│┌┐└┘├┤┬┴┼╭╮╯╰║═╔╗╚╝╠╣╦╩╬┃━┏┓┗┛┣┫┳┻╋▲▼◀▶●○□■△▽◁▷☐☑☒→←↑↓↔↕⇒⇐⇑⇓|+\-\\\/]/;

function isAsciiArt(text: string): boolean {
  const lines = text.split('\n');
  if (lines.length < 3) return false;
  const artLines = lines.filter((l) => ASCII_CHARS.test(l));
  return artLines.length / lines.length > 0.4;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // 매 렌더마다 새 counts Map을 생성하여 ID가 렌더 횟수에 의존하지 않도록 함
  const idCounts = new Map<string, number>();

  const components: Components = {
    h1: ({ children }) => (
      <HeadingAnchor id={makeHeadingId(String(children), idCounts)} level={1}>
        {children}
      </HeadingAnchor>
    ),
    h2: ({ children }) => (
      <HeadingAnchor id={makeHeadingId(String(children), idCounts)} level={2}>
        {children}
      </HeadingAnchor>
    ),
    h3: ({ children }) => (
      <HeadingAnchor id={makeHeadingId(String(children), idCounts)} level={3}>
        {children}
      </HeadingAnchor>
    ),
    h4: ({ children }) => (
      <HeadingAnchor id={makeHeadingId(String(children), idCounts)} level={4}>
        {children}
      </HeadingAnchor>
    ),
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeStr = String(children).replace(/\n$/, '');

      if (match && match[1] === 'mermaid') {
        return <MermaidBlock chart={codeStr} />;
      }

      if (match) {
        const lang = match[1];
        return <CodeBlock language={lang}>{codeStr}</CodeBlock>;
      }

      if (!match && codeStr.includes('\n') && isAsciiArt(codeStr)) {
        return (
          <div className="ascii-art-block my-4 overflow-x-auto rounded-lg border border-border bg-muted p-4">
            <pre className="whitespace-pre font-mono text-sm leading-tight text-foreground">
              {codeStr}
            </pre>
          </div>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => <>{children}</>,
    blockquote: ({ children }) => {
      const childArray = Array.isArray(children) ? children : [children];

      let firstText = '';
      const walkChildren = (nodes: ReactNode[]): void => {
        for (const node of nodes) {
          if (typeof node === 'string') {
            firstText += node;
          } else if (node && typeof node === 'object' && 'props' in node) {
            const props = node.props as { children?: ReactNode };
            if (props.children) {
              if (Array.isArray(props.children)) {
                walkChildren(props.children);
              } else if (typeof props.children === 'string') {
                firstText += props.children;
              }
            }
          }
          if (firstText.length > 30) break;
        }
      };
      walkChildren(childArray);

      const calloutMatch = firstText.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i,
      );
      if (calloutMatch) {
        const calloutType = isCalloutType(calloutMatch[1]);
        if (calloutType) {
          return <Callout type={calloutType}>{children}</Callout>;
        }
      }

      return <blockquote>{children}</blockquote>;
    },
    table: ({ children, ...props }) => (
      <div className="my-4 overflow-hidden rounded-lg border border-border">
        <table {...props}>{children}</table>
      </div>
    ),
    img: ({ src, alt }) => <ImageZoom src={src as string} alt={alt} />,
  };

  return (
    <div className="md-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
