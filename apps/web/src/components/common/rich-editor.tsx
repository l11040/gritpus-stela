'use client';

import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandList,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorBubble,
  EditorBubbleItem,
  type EditorContentProps,
  handleCommandNavigation,
  createSuggestionItems,
  renderItems,
  type SuggestionItem,
  useEditor,
  Command,
  Placeholder,
  StarterKit,
  TaskList,
  TaskItem,
  TiptapUnderline,
  TiptapLink,
  UpdatedImage,
  TextStyle,
  Color,
  HighlightExtension,
  GlobalDragHandle,
  CharacterCount,
  CustomKeymap,
} from 'novel';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { MermaidExtension } from './editor-mermaid-block';
import { cn } from '@/lib/utils';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Code,
  Quote,
  Minus,
  ImageIcon,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  CodeIcon,
  Highlighter,
  Link,
  Palette,
  X,
  Table as TableIcon,
  GitBranch,
} from 'lucide-react';
import { useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

interface RichEditorProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  showCharacterCount?: boolean;
  inputFormat?: 'auto' | 'html' | 'markdown';
  outputFormat?: 'html' | 'markdown';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uploadImageAndInsert(file: File, view: any, pos: number) {
  if (!file.type.startsWith('image/') || file.size / 1024 / 1024 > 10) return;

  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch(`${API_BASE}/uploads/images`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) return;
    const data = await res.json();
    const node = view.state.schema.nodes.image.create({ src: data.url });
    const tr = view.state.tr.insert(pos, node);
    view.dispatch(tr);
  } catch {
    // 업로드 실패 시 무시
  }
}

const slashCommands: SuggestionItem[] = createSuggestionItems([
  {
    title: '제목 1',
    description: '큰 제목',
    icon: <Heading1 className="size-4" />,
    searchTerms: ['heading', 'h1', '제목'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: '제목 2',
    description: '중간 제목',
    icon: <Heading2 className="size-4" />,
    searchTerms: ['heading', 'h2', '제목'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: '제목 3',
    description: '작은 제목',
    icon: <Heading3 className="size-4" />,
    searchTerms: ['heading', 'h3', '제목'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: '글머리 기호',
    description: '순서 없는 목록',
    icon: <List className="size-4" />,
    searchTerms: ['bullet', 'list', '목록'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: '번호 매기기',
    description: '순서 있는 목록',
    icon: <ListOrdered className="size-4" />,
    searchTerms: ['numbered', 'list', '번호'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: '체크리스트',
    description: '할 일 체크 목록',
    icon: <ListChecks className="size-4" />,
    searchTerms: ['task', 'todo', 'check', '체크', '할일'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: '코드 블록',
    description: '코드 블록 삽입',
    icon: <Code className="size-4" />,
    searchTerms: ['code', '코드'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: '인용문',
    description: '인용 블록 삽입',
    icon: <Quote className="size-4" />,
    searchTerms: ['quote', 'blockquote', '인용'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: '구분선',
    description: '가로 구분선',
    icon: <Minus className="size-4" />,
    searchTerms: ['hr', 'divider', '구분선'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: '표',
    description: '3×3 표 삽입',
    icon: <TableIcon className="size-4" />,
    searchTerms: ['table', '표', '테이블'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: 'Mermaid 다이어그램',
    description: '플로우차트, 시퀀스 다이어그램 등',
    icon: <GitBranch className="size-4" />,
    searchTerms: ['mermaid', 'diagram', 'flow', 'chart', '다이어그램', '플로우'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: 'mermaidBlock',
        attrs: { code: 'graph TD\n    A[시작] --> B{판단}\n    B -->|Yes| C[완료]\n    B -->|No| D[재시도]' },
      }).run();
    },
  },
  {
    title: '이미지',
    description: '이미지 업로드',
    icon: <ImageIcon className="size-4" />,
    searchTerms: ['image', 'photo', '이미지', '사진'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        if (input.files?.length) {
          const file = input.files[0];
          const pos = editor.view.state.selection.from;
          uploadImageAndInsert(file, editor.view, pos);
        }
      };
      input.click();
    },
  },
]);

const MIN_IMAGE_WIDTH = 120;

const ResizableImage = UpdatedImage.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'editor-image-node';
      wrapper.contentEditable = 'false';

      const image = document.createElement('img');
      image.className = 'editor-image-node__img';
      image.draggable = false;
      image.src = node.attrs.src ?? '';
      image.alt = node.attrs.alt ?? '';
      wrapper.appendChild(image);

      const leftHandle = document.createElement('button');
      leftHandle.type = 'button';
      leftHandle.className = 'editor-image-node__handle editor-image-node__handle--left';
      leftHandle.setAttribute('aria-label', '이미지 너비 줄이기/늘리기');

      const rightHandle = document.createElement('button');
      rightHandle.type = 'button';
      rightHandle.className = 'editor-image-node__handle editor-image-node__handle--right';
      rightHandle.setAttribute('aria-label', '이미지 너비 줄이기/늘리기');

      wrapper.appendChild(leftHandle);
      wrapper.appendChild(rightHandle);

      const applyNodeAttrs = (nextNode: typeof node) => {
        image.src = nextNode.attrs.src ?? '';
        image.alt = nextNode.attrs.alt ?? '';
        const width = Number(nextNode.attrs.width);
        const height = Number(nextNode.attrs.height);
        if (Number.isFinite(width) && width > 0) {
          image.style.width = `${width}px`;
        } else {
          image.style.removeProperty('width');
        }
        if (Number.isFinite(height) && height > 0) {
          image.style.height = `${height}px`;
        } else {
          image.style.removeProperty('height');
        }
      };

      let currentNode = node;
      let isResizing = false;
      let cleanupResizeListeners: (() => void) | null = null;
      applyNodeAttrs(currentNode);

      const selectCurrentNode = () => {
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (typeof pos !== 'number') return;
        editor.commands.setNodeSelection(pos);
      };

      const commitSize = (width: number, height: number) => {
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (typeof pos !== 'number') return;
        editor.chain().focus().command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, {
            ...currentNode.attrs,
            width: Math.round(width),
            height: Math.round(height),
          });
          return true;
        }).run();
        editor.commands.setNodeSelection(pos);
      };

      const startResize = (event: PointerEvent, direction: 'left' | 'right') => {
        event.preventDefault();
        event.stopPropagation();
        selectCurrentNode();
        isResizing = true;

        const startX = event.clientX;
        const rect = image.getBoundingClientRect();
        const startWidth = rect.width;
        const startHeight = rect.height;
        const ratio = startHeight > 0 ? startWidth / startHeight : 1;
        const editorWidth = (editor.view.dom as HTMLElement).clientWidth || Number.POSITIVE_INFINITY;
        const maxWidth = Math.max(MIN_IMAGE_WIDTH, editorWidth - 8);
        const sign = direction === 'right' ? 1 : -1;

        const onPointerMove = (moveEvent: PointerEvent) => {
          const delta = (moveEvent.clientX - startX) * sign;
          const nextWidth = Math.min(maxWidth, Math.max(MIN_IMAGE_WIDTH, startWidth + delta));
          const nextHeight = ratio > 0 ? nextWidth / ratio : startHeight;
          image.style.width = `${nextWidth}px`;
          image.style.height = `${nextHeight}px`;
        };

        const onPointerUp = () => {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          cleanupResizeListeners = null;
          isResizing = false;
          const endRect = image.getBoundingClientRect();
          commitSize(endRect.width, endRect.height);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        cleanupResizeListeners = () => {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          cleanupResizeListeners = null;
          isResizing = false;
        };
      };

      const onLeftPointerDown = (event: PointerEvent) => startResize(event, 'left');
      const onRightPointerDown = (event: PointerEvent) => startResize(event, 'right');

      leftHandle.addEventListener('pointerdown', onLeftPointerDown);
      rightHandle.addEventListener('pointerdown', onRightPointerDown);
      wrapper.addEventListener('click', selectCurrentNode);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type !== currentNode.type) return false;
          currentNode = updatedNode;
          if (!isResizing) applyNodeAttrs(currentNode);
          return true;
        },
        stopEvent: (event) => {
          const target = event.target as HTMLElement | null;
          return !!target?.closest('.editor-image-node__handle');
        },
        destroy: () => {
          cleanupResizeListeners?.();
          leftHandle.removeEventListener('pointerdown', onLeftPointerDown);
          rightHandle.removeEventListener('pointerdown', onRightPointerDown);
          wrapper.removeEventListener('click', selectCurrentNode);
        },
      };
    };
  },
});

const HIGHLIGHT_COLORS = [
  { name: '노랑', color: '#fef08a' },
  { name: '초록', color: '#bbf7d0' },
  { name: '파랑', color: '#bfdbfe' },
  { name: '분홍', color: '#fecdd3' },
  { name: '보라', color: '#ddd6fe' },
];

const TEXT_COLORS = [
  { name: '기본', color: '' },
  { name: '빨강', color: '#ef4444' },
  { name: '주황', color: '#f97316' },
  { name: '초록', color: '#22c55e' },
  { name: '파랑', color: '#3b82f6' },
  { name: '보라', color: '#8b5cf6' },
  { name: '회색', color: '#6b7280' },
];

const extensions = [
  StarterKit.configure({
    bulletList: { HTMLAttributes: { class: 'list-disc' } },
    orderedList: { HTMLAttributes: { class: 'list-decimal' } },
    heading: { levels: [1, 2, 3, 4] },
    codeBlock: { HTMLAttributes: { class: 'rounded-md bg-muted px-4 py-3 font-mono text-sm' } },
    blockquote: {},
    horizontalRule: {},
    code: {},
  }),
  TaskList.configure({ HTMLAttributes: { class: 'not-prose pl-2' } }),
  TaskItem.configure({ HTMLAttributes: { class: 'flex items-start gap-2' }, nested: true }),
  TiptapUnderline,
  TiptapLink.configure({
    HTMLAttributes: { class: 'text-primary underline underline-offset-4 cursor-pointer' },
    openOnClick: false,
  }),
  ResizableImage.configure({ allowBase64: true }),
  TextStyle,
  Color,
  HighlightExtension.configure({ multicolor: true }),
  Table.configure({ resizable: true, HTMLAttributes: { class: 'editor-table' } }),
  TableRow,
  TableHeader,
  TableCell,
  MermaidExtension,
  GlobalDragHandle.configure({ dragHandleWidth: 24, scrollTreshold: 100 }),
  CharacterCount,
  CustomKeymap,
  Command.configure({
    suggestion: { items: () => slashCommands, render: renderItems },
  }),
];

function createExtensionsWithPlaceholder(placeholderText: string) {
  return [...extensions, Placeholder.configure({ placeholder: placeholderText })];
}

function LinkSelector() {
  const { editor } = useEditor();
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState('');

  if (!editor) return null;

  const applyLink = () => {
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
    setShowInput(false);
    setUrl('');
  };

  return (
    <div className="relative">
      <EditorBubbleItem
        onSelect={(ed) => {
          if (ed.isActive('link')) {
            ed.chain().focus().unsetLink().run();
          } else {
            setShowInput(!showInput);
          }
        }}
        className={cn('rounded p-1.5 hover:bg-accent', editor.isActive('link') && 'bg-accent')}
      >
        <Link className="size-3.5" />
      </EditorBubbleItem>
      {showInput && (
        <div className="absolute top-full left-0 z-50 mt-1 flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md">
          <input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); }}
            className="h-7 w-48 rounded border-none bg-transparent px-2 text-sm outline-none"
            autoFocus
          />
          <button onClick={applyLink} className="rounded px-2 py-1 text-xs hover:bg-accent">
            확인
          </button>
        </div>
      )}
    </div>
  );
}

function HighlightSelector() {
  const { editor } = useEditor();
  const [open, setOpen] = useState(false);

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorBubbleItem
        onSelect={() => setOpen(!open)}
        className={cn('rounded p-1.5 hover:bg-accent', editor.isActive('highlight') && 'bg-accent')}
      >
        <Highlighter className="size-3.5" />
      </EditorBubbleItem>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 flex gap-1 rounded-md border bg-popover p-1.5 shadow-md">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.color}
              title={c.name}
              className="h-5 w-5 rounded-sm border border-border"
              style={{ backgroundColor: c.color }}
              onClick={() => {
                editor.chain().focus().toggleHighlight({ color: c.color }).run();
                setOpen(false);
              }}
            />
          ))}
          <button
            title="제거"
            className="flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-background"
            onClick={() => {
              editor.chain().focus().unsetHighlight().run();
              setOpen(false);
            }}
          >
            <X className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function ColorSelector() {
  const { editor } = useEditor();
  const [open, setOpen] = useState(false);

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorBubbleItem
        onSelect={() => setOpen(!open)}
        className="rounded p-1.5 hover:bg-accent"
      >
        <Palette className="size-3.5" />
      </EditorBubbleItem>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 flex gap-1 rounded-md border bg-popover p-1.5 shadow-md">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.color || 'default'}
              title={c.name}
              className="flex h-5 w-5 items-center justify-center rounded-sm border border-border"
              style={{ backgroundColor: c.color || undefined }}
              onClick={() => {
                if (c.color) {
                  editor.chain().focus().setColor(c.color).run();
                } else {
                  editor.chain().focus().unsetColor().run();
                }
                setOpen(false);
              }}
            >
              {!c.color && <span className="text-[10px]">A</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterCountDisplay() {
  const { editor } = useEditor();
  if (!editor) return null;
  const count = editor.storage.characterCount?.characters() ?? 0;
  return (
    <div className="mt-1 text-right text-xs text-muted-foreground">
      {count}자
    </div>
  );
}

export function RichEditor({
  defaultValue = '',
  onChange,
  placeholder = '내용을 입력하세요. 슬래시(/)로 명령어를 사용할 수 있습니다.',
  className,
  editable = true,
  showCharacterCount = false,
  inputFormat = 'auto',
  outputFormat = 'html',
}: RichEditorProps) {
  const exts = createExtensionsWithPlaceholder(placeholder);

  const handleUpdate = useCallback(
    ({ editor }: { editor: { getHTML: () => string } }) => {
      const html = editor.getHTML();
      if (outputFormat === 'markdown') {
        onChange?.(htmlToMarkdown(html));
        return;
      }
      onChange?.(html);
    },
    [onChange, outputFormat],
  );

  return (
    <EditorRoot>
      <EditorContent
        extensions={exts}
        initialContent={defaultValue ? parseInitialContent(defaultValue, inputFormat) : undefined}
        editable={editable}
        onUpdate={handleUpdate}
        editorProps={{
          handleDOMEvents: {
            keydown: (_view, event) => handleCommandNavigation(event),
          },
          handlePaste: (view, event) => {
            const items = Array.from(event.clipboardData?.items ?? []);
            const image = items.find((item) => item.type.startsWith('image'));
            if (image) {
              event.preventDefault();
              const file = image.getAsFile();
              if (file) uploadImageAndInsert(file, view, view.state.selection.from);
              return true;
            }
            return false;
          },
          handleDrop: (view, event, _slice, moved) => {
            if (moved || !event.dataTransfer?.files?.length) return false;
            const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith('image'));
            if (file) {
              event.preventDefault();
              const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (coords) uploadImageAndInsert(file, view, coords.pos);
              return true;
            }
            return false;
          },
          attributes: {
            class: cn('focus:outline-none', editable && 'min-h-[120px]'),
          },
        }}
        className={cn(
          'rounded-md border border-input bg-background px-3 py-2',
          !editable && 'border-none px-0 py-0',
          className,
        )}
      >
        {editable && (
          <>
            <EditorCommand className="z-50 rounded-md border bg-popover px-1 py-2 shadow-md">
              <EditorCommandEmpty className="px-2 py-1.5 text-sm text-muted-foreground">
                결과 없음
              </EditorCommandEmpty>
              <EditorCommandList>
                {slashCommands.map((item) => (
                  <EditorCommandItem
                    key={item.title}
                    value={item.title}
                    onCommand={(val) => item.command?.(val)}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent aria-selected:bg-accent"
                  >
                    {item.icon}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </EditorCommandItem>
                ))}
              </EditorCommandList>
            </EditorCommand>

            <EditorBubble className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md">
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleBold().run()}
                className="rounded p-1.5 hover:bg-accent"
              >
                <Bold className="size-3.5" />
              </EditorBubbleItem>
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleItalic().run()}
                className="rounded p-1.5 hover:bg-accent"
              >
                <Italic className="size-3.5" />
              </EditorBubbleItem>
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleUnderline().run()}
                className="rounded p-1.5 hover:bg-accent"
              >
                <Underline className="size-3.5" />
              </EditorBubbleItem>
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleStrike().run()}
                className="rounded p-1.5 hover:bg-accent"
              >
                <Strikethrough className="size-3.5" />
              </EditorBubbleItem>
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleCode().run()}
                className="rounded p-1.5 hover:bg-accent"
              >
                <CodeIcon className="size-3.5" />
              </EditorBubbleItem>

              <div className="mx-0.5 h-4 w-px bg-border" />

              <LinkSelector />
              <HighlightSelector />
              <ColorSelector />
            </EditorBubble>
          </>
        )}
      </EditorContent>
      {showCharacterCount && editable && <CharacterCountDisplay />}
    </EditorRoot>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function inlineHtmlNodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').replace(/\u00a0/g, ' ');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const childText = inlineHtmlNodesToMarkdown(Array.from(element.childNodes));

  if (tag === 'br') return '\n';
  if (tag === 'strong' || tag === 'b') return `**${childText}**`;
  if (tag === 'em' || tag === 'i') return `*${childText}*`;
  if (tag === 's' || tag === 'strike' || tag === 'del') return `~~${childText}~~`;
  if (tag === 'code' && element.parentElement?.tagName.toLowerCase() !== 'pre') {
    return `\`${childText}\``;
  }
  if (tag === 'a') {
    const href = element.getAttribute('href') || '';
    return href ? `[${childText}](${href})` : childText;
  }
  if (tag === 'img') {
    const alt = element.getAttribute('alt') || '';
    const src = element.getAttribute('src') || '';
    return src ? `![${alt}](${src})` : '';
  }

  return childText;
}

function inlineHtmlNodesToMarkdown(nodes: ChildNode[]): string {
  return nodes.map((node) => inlineHtmlNodeToMarkdown(node)).join('');
}

function listElementToMarkdown(
  listElement: Element,
  listType: 'ul' | 'ol',
  depth: number,
): string[] {
  const lines: string[] = [];
  const items = Array.from(listElement.children).filter(
    (child) => child.tagName.toLowerCase() === 'li',
  );

  items.forEach((item, index) => {
    const marker = listType === 'ol' ? `${index + 1}.` : '-';
    const indent = '  '.repeat(depth);
    const childNodes = Array.from(item.childNodes);
    const nestedLists = childNodes.filter(
      (node): node is Element =>
        node.nodeType === Node.ELEMENT_NODE
        && ['ul', 'ol'].includes((node as Element).tagName.toLowerCase()),
    );
    const inlineNodes = childNodes.filter((node) => !nestedLists.includes(node as Element));
    const inlineText = inlineHtmlNodesToMarkdown(inlineNodes).trim();
    lines.push(`${indent}${marker} ${inlineText}`.trimEnd());

    nestedLists.forEach((nestedList) => {
      const nestedType = nestedList.tagName.toLowerCase() as 'ul' | 'ol';
      lines.push(...listElementToMarkdown(nestedList, nestedType, depth + 1));
    });
  });

  return lines;
}

function tableElementToMarkdownLines(table: Element): string[] {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return [];

  const matrix: string[][] = [];
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('th, td'));
    matrix.push(cells.map((cell) => inlineHtmlNodesToMarkdown(Array.from(cell.childNodes)).trim().replace(/\|/g, '\\|')));
  }

  const colCount = Math.max(...matrix.map((r) => r.length));
  const colWidths: number[] = Array.from({ length: colCount }, () => 3);
  for (const row of matrix) {
    for (let c = 0; c < colCount; c++) {
      colWidths[c] = Math.max(colWidths[c], (row[c] || '').length);
    }
  }

  const formatRow = (cells: string[]) =>
    '| ' + Array.from({ length: colCount }, (_, c) => (cells[c] || '').padEnd(colWidths[c])).join(' | ') + ' |';

  const lines: string[] = [];
  lines.push(formatRow(matrix[0] || []));
  lines.push('| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |');
  for (let r = 1; r < matrix.length; r++) {
    lines.push(formatRow(matrix[r]));
  }
  return lines;
}

function blockElementToMarkdownLines(element: Element): string[] {
  const tag = element.tagName.toLowerCase();

  // mermaidBlock 노드 처리
  if (tag === 'div' && element.getAttribute('data-type') === 'mermaid-block') {
    const code = element.getAttribute('data-code') || '';
    return ['```mermaid', code, '```'];
  }

  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
    const level = Number(tag.slice(1));
    const heading = inlineHtmlNodesToMarkdown(Array.from(element.childNodes)).trim();
    return heading ? [`${'#'.repeat(level)} ${heading}`] : [];
  }

  if (tag === 'p') {
    const paragraph = inlineHtmlNodesToMarkdown(Array.from(element.childNodes)).trim();
    return paragraph ? [paragraph] : [];
  }

  if (tag === 'blockquote') {
    const quoteLines = blockNodesToMarkdownLines(Array.from(element.childNodes));
    return quoteLines.map((line) => (line ? `> ${line}` : '>'));
  }

  if (tag === 'pre') {
    const codeElement = element.querySelector('code');
    const codeText = (codeElement?.textContent || element.textContent || '').replace(/\n+$/, '');
    return ['```', codeText, '```'];
  }

  if (tag === 'hr') {
    return ['---'];
  }

  if (tag === 'ul' || tag === 'ol') {
    return listElementToMarkdown(element, tag, 0);
  }

  if (tag === 'table') {
    return tableElementToMarkdownLines(element);
  }

  const inlineFallback = inlineHtmlNodesToMarkdown(Array.from(element.childNodes)).trim();
  if (inlineFallback) {
    return [inlineFallback];
  }

  return blockNodesToMarkdownLines(Array.from(element.childNodes));
}

function blockNodesToMarkdownLines(nodes: ChildNode[]): string[] {
  const chunks: string[][] = [];

  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').trim();
      if (text) chunks.push([text]);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const block = blockElementToMarkdownLines(node as Element)
      .map((line) => line.replace(/\s+$/g, ''));
    if (block.length > 0) {
      chunks.push(block);
    }
  });

  const lines: string[] = [];
  chunks.forEach((chunk, index) => {
    if (index > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
    lines.push(...chunk);
  });

  return lines;
}

function htmlToMarkdown(html: string): string {
  if (!html.trim()) return '';

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  const lines = blockNodesToMarkdownLines(Array.from(document.body.childNodes));
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function parseInlineMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

type MarkdownListType = 'ul' | 'ol';

type MarkdownListItem = {
  contentHtml: string;
  children: MarkdownListBlock[];
};

type MarkdownListBlock = {
  type: MarkdownListType;
  items: MarkdownListItem[];
};

function getIndentSize(value: string): number {
  return value.replaceAll('\t', '    ').length;
}

function parseMarkdownListLine(line: string): {
  indent: number;
  type: MarkdownListType;
  text: string;
} | null {
  const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
  if (!match) return null;
  return {
    indent: getIndentSize(match[1]),
    type: /^\d+\.$/.test(match[2]) ? 'ol' : 'ul',
    text: match[3],
  };
}

function parseMarkdownListBlock(
  lines: string[],
  startIndex: number,
  baseIndent: number,
  listType: MarkdownListType,
): { block: MarkdownListBlock; nextIndex: number } {
  const items: MarkdownListItem[] = [];
  let index = startIndex;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    const current = parseMarkdownListLine(lines[index]);
    if (!current || current.indent < baseIndent || current.type !== listType) {
      break;
    }
    if (current.indent > baseIndent) {
      break;
    }

    const item: MarkdownListItem = {
      contentHtml: parseInlineMarkdown(current.text.trim()),
      children: [],
    };

    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      const trimmedNext = nextLine.trim();
      if (!trimmedNext) {
        const nextNonEmptyIndex = findNextNonEmptyLineIndex(lines, index + 1);
        if (nextNonEmptyIndex < 0) {
          index += 1;
          break;
        }

        const lookahead = parseMarkdownListLine(lines[nextNonEmptyIndex]);
        if (lookahead && lookahead.indent > baseIndent) {
          index += 1;
          continue;
        }

        index += 1;
        break;
      }

      const nextList = parseMarkdownListLine(nextLine);
      if (nextList) {
        if (nextList.indent <= baseIndent) {
          break;
        }

        const nested = parseMarkdownListBlock(lines, index, nextList.indent, nextList.type);
        item.children.push(nested.block);
        index = nested.nextIndex;
        continue;
      }

      const continuationIndent = getIndentSize((nextLine.match(/^(\s*)/) || [''])[0]);
      if (continuationIndent > baseIndent) {
        item.contentHtml += `<br />${parseInlineMarkdown(trimmedNext)}`;
        index += 1;
        continue;
      }

      break;
    }

    items.push(item);
  }

  return {
    block: { type: listType, items },
    nextIndex: index,
  };
}

function findNextNonEmptyLineIndex(lines: string[], startIndex: number): number {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim()) {
      return index;
    }
  }
  return -1;
}

function renderMarkdownListBlock(block: MarkdownListBlock): string {
  const html: string[] = [`<${block.type}>`];

  block.items.forEach((item) => {
    html.push('<li>');
    html.push(item.contentHtml);
    item.children.forEach((nested) => {
      html.push(renderMarkdownListBlock(nested));
    });
    html.push('</li>');
  });

  html.push(`</${block.type}>`);
  return html.join('\n');
}

function parseMarkdownTableRow(line: string): string[] {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function parseMarkdownTable(tableLines: string[]): string {
  const headerCells = parseMarkdownTableRow(tableLines[0]);
  // 2번째 줄이 separator(--- 등)인지 확인
  const separatorIdx = tableLines.findIndex((l, i) => i > 0 && /^\|[\s:|-]+\|$/.test(l));
  const dataStartIdx = separatorIdx >= 0 ? separatorIdx + 1 : 1;

  const html: string[] = ['<table>'];
  html.push('<tr>');
  for (const cell of headerCells) {
    html.push(`<th>${parseInlineMarkdown(cell.replace(/\\\|/g, '|'))}</th>`);
  }
  html.push('</tr>');

  for (let i = dataStartIdx; i < tableLines.length; i++) {
    const cells = parseMarkdownTableRow(tableLines[i]);
    html.push('<tr>');
    for (const cell of cells) {
      html.push(`<td>${parseInlineMarkdown(cell.replace(/\\\|/g, '|'))}</td>`);
    }
    html.push('</tr>');
  }
  html.push('</table>');
  return html.join('');
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const blocks: string[] = [];
  let inCodeBlock = false;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        const lang = trimmed.slice(3).trim();
        if (lang === 'mermaid') {
          // mermaid 코드블록 → mermaidBlock 노드로 변환
          index += 1;
          const mermaidLines: string[] = [];
          while (index < lines.length && !lines[index].trim().startsWith('```')) {
            mermaidLines.push(lines[index]);
            index += 1;
          }
          if (index < lines.length) index += 1; // 닫는 ``` 건너뜀
          const mermaidCode = mermaidLines.join('\n');
          blocks.push(`<div data-type="mermaid-block" data-code="${escapeHtml(mermaidCode)}"></div>`);
          continue;
        }
        blocks.push('<pre><code>');
      } else {
        blocks.push('</code></pre>');
      }
      inCodeBlock = !inCodeBlock;
      index += 1;
      continue;
    }

    if (inCodeBlock) {
      blocks.push(`${escapeHtml(line)}\n`);
      index += 1;
      continue;
    }

    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${parseInlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push('<hr />');
      index += 1;
      continue;
    }

    // 마크다운 테이블 파싱
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (index < lines.length) {
        const tl = lines[index].trim();
        if (!tl.startsWith('|') || !tl.endsWith('|')) break;
        tableLines.push(tl);
        index += 1;
      }
      if (tableLines.length >= 2) {
        blocks.push(parseMarkdownTable(tableLines));
        continue;
      }
      // 테이블이 아닌 경우 index 되돌리고 아래로 진행
      index -= tableLines.length;
    }

    const listLine = parseMarkdownListLine(line);
    if (listLine) {
      const parsedList = parseMarkdownListBlock(lines, index, listLine.indent, listLine.type);
      blocks.push(renderMarkdownListBlock(parsedList.block));
      index = parsedList.nextIndex;
      continue;
    }

    // 연속된 > 줄을 하나의 blockquote로 합침 (lazy continuation 지원)
    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [];

      while (index < lines.length) {
        const cur = lines[index];
        if (/^\s*>/.test(cur)) {
          // > 로 시작하는 줄
          quoteLines.push(cur.replace(/^\s*>\s?/, ''));
          index += 1;
        } else if (cur.trim() !== '' && quoteLines.length > 0 && quoteLines[quoteLines.length - 1].trim() !== '') {
          // lazy continuation: > 없지만 빈 줄이 아니고, 직전이 빈 줄이 아닌 경우
          quoteLines.push(cur);
          index += 1;
        } else {
          break;
        }
      }

      const paragraphs: string[] = [];
      let current: string[] = [];
      for (const ql of quoteLines) {
        if (ql.trim() === '') {
          if (current.length > 0) {
            paragraphs.push(`<p>${current.map(parseInlineMarkdown).join(' ')}</p>`);
            current = [];
          }
        } else {
          current.push(ql);
        }
      }
      if (current.length > 0) {
        paragraphs.push(`<p>${current.map(parseInlineMarkdown).join(' ')}</p>`);
      }
      blocks.push(`<blockquote>${paragraphs.join('')}</blockquote>`);
      continue;
    }

    blocks.push(`<p>${parseInlineMarkdown(line)}</p>`);
    index += 1;
  }

  if (inCodeBlock) {
    blocks.push('</code></pre>');
  }

  return blocks.join('\n');
}

function parseInitialContent(
  value: string,
  inputFormat: RichEditorProps['inputFormat'] = 'auto',
): EditorContentProps['initialContent'] {
  if (!value || value.trim() === '') return undefined;

  if (inputFormat === 'html') {
    return value as unknown as EditorContentProps['initialContent'];
  }

  if (inputFormat === 'markdown') {
    return markdownToHtml(value) as unknown as EditorContentProps['initialContent'];
  }

  if (!/<[a-z][\s\S]*>/i.test(value)) {
    const paragraphs = value.split('\n\n').filter(Boolean);
    return {
      type: 'doc',
      content: paragraphs.map((p) => ({
        type: 'paragraph',
        content: p.split('\n').flatMap((line, i, arr) => {
          const nodes: { type: string; text?: string }[] = [{ type: 'text', text: line }];
          if (i < arr.length - 1) nodes.push({ type: 'hardBreak' });
          return nodes;
        }),
      })),
    };
  }
  return value as unknown as EditorContentProps['initialContent'];
}
