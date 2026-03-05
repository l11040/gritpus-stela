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
  Command,
  Placeholder,
  StarterKit,
} from 'novel';
import { cn } from '@/lib/utils';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
  Bold,
  Italic,
  Strikethrough,
  CodeIcon,
} from 'lucide-react';

interface RichEditorProps {
  defaultValue?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
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
]);

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
  Command.configure({
    suggestion: {
      items: () => slashCommands,
      render: renderItems,
    },
  }),
];

function createExtensions(placeholderText: string) {
  return [
    ...extensions,
    Placeholder.configure({ placeholder: placeholderText }),
  ];
}

export function RichEditor({
  defaultValue = '',
  onChange,
  placeholder = '내용을 입력하세요. 슬래시(/)로 명령어를 사용할 수 있습니다.',
  className,
  editable = true,
}: RichEditorProps) {
  const editorExtensions = createExtensions(placeholder);

  return (
    <EditorRoot>
      <EditorContent
        extensions={editorExtensions}
        initialContent={defaultValue ? parseInitialContent(defaultValue) : undefined}
        editable={editable}
        onUpdate={({ editor }) => {
          onChange?.(editor.getHTML());
        }}
        editorProps={{
          handleDOMEvents: {
            keydown: (_view, event) => handleCommandNavigation(event),
          },
          attributes: {
            class: cn(
              'prose-sm focus:outline-none',
              editable && 'min-h-[120px]',
            ),
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
            </EditorBubble>
          </>
        )}
      </EditorContent>
    </EditorRoot>
  );
}

function parseInitialContent(html: string): EditorContentProps['initialContent'] {
  if (!html || html.trim() === '') return undefined;
  // If it looks like plain text (no HTML tags), wrap in paragraph
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
  // HTML content — let tiptap parse it
  return html as unknown as EditorContentProps['initialContent'];
}
