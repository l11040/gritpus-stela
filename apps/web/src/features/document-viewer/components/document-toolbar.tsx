'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Trash2,
  Presentation,
  Sparkles,
  RefreshCw,
  Download,
  MoreHorizontal,
  Loader2,
  FileText,
  ChevronDown,
  Pencil,
  Check,
  X,
  Eye,
  SquarePen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DocumentToolbarProps {
  title: string;
  isShared: boolean;
  isOwner: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleSharing: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => Promise<void>;
  onPresentMarkdown: () => void;
  onPresentAi: () => void;
  onShowSummary: () => void;
  onRegenerateSlides: () => void;
  onExportPdf: (type: 'document' | 'presentation' | 'slides') => void;
  isSummarizing: boolean;
  isExportingPdf?: boolean;
  isGeneratingSlides?: boolean;
  hasCachedSlides?: boolean;
}

export function DocumentToolbar({
  title,
  isShared,
  isOwner,
  isEditing,
  onToggleEdit,
  onToggleSharing,
  onDelete,
  onRename,
  onPresentMarkdown,
  onPresentAi,
  onShowSummary,
  onRegenerateSlides,
  onExportPdf,
  isSummarizing,
  isExportingPdf,
  isGeneratingSlides,
  hasCachedSlides,
}: DocumentToolbarProps) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const handleSubmit = async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      await onRename(trimmed);
    }
    setIsRenaming(false);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-3">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push('/docs')}
        >
          <ArrowLeft className="size-4" />
        </Button>

        {isRenaming ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSubmit}
              className="h-8 rounded-md border border-border bg-background px-2 text-lg font-semibold text-foreground outline-none focus:border-primary"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={handleSubmit}>
              <Check className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onMouseDown={handleCancel}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => { setEditValue(title); setIsRenaming(true); }}
            className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60"
          >
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}

        {isShared ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            공유됨
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {/* 편집/보기 토글 */}
        <Button
          variant={isEditing ? 'default' : 'ghost'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onToggleEdit}
        >
          {isEditing ? (
            <>
              <Eye className="size-3.5" />
              보기
            </>
          ) : (
            <>
              <SquarePen className="size-3.5" />
              편집
            </>
          )}
        </Button>

        {/* 프레젠테이션 드롭다운 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Presentation className="size-3.5" />
              프레젠테이션
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onPresentMarkdown}>
              <FileText className="mr-2 size-4" />
              마크다운 기반
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPresentAi} disabled={isGeneratingSlides}>
              {isGeneratingSlides ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              AI 구성
              {hasCachedSlides && !isGeneratingSlides && (
                <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">준비됨</span>
              )}
              {isGeneratingSlides && (
                <span className="ml-auto text-[10px] text-muted-foreground">생성 중...</span>
              )}
            </DropdownMenuItem>
            {hasCachedSlides && !isGeneratingSlides && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onRegenerateSlides}>
                  <RefreshCw className="mr-2 size-4" />
                  AI 슬라이드 다시 생성
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 더보기 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onShowSummary}>
              {isSummarizing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              AI 분석
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={isExportingPdf}>
                {isExportingPdf ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                PDF 내보내기
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuItem onClick={() => onExportPdf('document')}>
                  <FileText className="mr-2 size-4" />
                  문서
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportPdf('presentation')}>
                  <Presentation className="mr-2 size-4" />
                  마크다운 PPT
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onExportPdf('slides')}
                  disabled={!hasCachedSlides}
                >
                  <Sparkles className="mr-2 size-4" />
                  AI PPT
                  {!hasCachedSlides && (
                    <span className="ml-auto text-[10px] text-muted-foreground">미생성</span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {isOwner && (
              <>
                <DropdownMenuItem onClick={onToggleSharing}>
                  <Share2 className="mr-2 size-4" />
                  {isShared ? '공유 해제' : '공유 설정'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  삭제
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
