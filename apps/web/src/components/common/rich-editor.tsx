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
} from 'lucide-react';
import { useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

interface RichEditorProps {
  defaultValue?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  showCharacterCount?: boolean;
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
    bulletList: { HTMLAttributes: { class: 'list-disc pl-6' } },
    orderedList: { HTMLAttributes: { class: 'list-decimal pl-6' } },
    heading: { levels: [1, 2, 3] },
    codeBlock: { HTMLAttributes: { class: 'rounded-md bg-muted px-4 py-3 font-mono text-sm' } },
    blockquote: { HTMLAttributes: { class: 'border-l-2 border-border pl-4 italic text-muted-foreground' } },
    horizontalRule: { HTMLAttributes: { class: 'my-4 border-border' } },
    code: { HTMLAttributes: { class: 'rounded bg-muted px-1.5 py-0.5 font-mono text-sm' } },
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
}: RichEditorProps) {
  const exts = createExtensionsWithPlaceholder(placeholder);

  const handleUpdate = useCallback(
    ({ editor }: { editor: { getHTML: () => string } }) => {
      onChange?.(editor.getHTML());
    },
    [onChange],
  );

  return (
    <EditorRoot>
      <EditorContent
        extensions={exts}
        initialContent={defaultValue ? parseInitialContent(defaultValue) : undefined}
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
            class: cn('prose-sm focus:outline-none', editable && 'min-h-[120px]'),
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

function parseInitialContent(html: string): EditorContentProps['initialContent'] {
  if (!html || html.trim() === '') return undefined;
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    const paragraphs = html.split('\n\n').filter(Boolean);
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
  return html as unknown as EditorContentProps['initialContent'];
}
