'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { useDocumentDetail } from '../hooks/use-document-detail';
import { useDocumentSummary } from '../hooks/use-document-summary';
import { useTableOfContents } from '../hooks/use-table-of-contents';
import { usePdfExport } from '../hooks/use-pdf-export';
import { useSlidesGenerate } from '../hooks/use-slides-generate';
import { MarkdownRenderer } from './markdown-renderer';
import { DocumentToolbar } from './document-toolbar';
import { DocumentSidebar } from './document-sidebar';
import { SummaryPanel } from './summary-panel';
import { RichEditor } from '@/components/common/rich-editor';
import type { MdDocumentSummary, SlidesJson } from '../types';

interface DocumentDetailProps {
  documentId: string;
}

export function DocumentDetail({ documentId }: DocumentDetailProps) {
  const { user } = useAuth();
  const router = useRouter();
  const {
    document,
    isLoading,
    updateDocument,
    deleteDocument,
    toggleSharing,
  } = useDocumentDetail(documentId);
  const { activeId, headings, scrollToHeading } = useTableOfContents(document?.currentContent);
  const summary = useDocumentSummary(documentId);
  const { exportPdf, isExporting } = usePdfExport();
  const slidesGen = useSlidesGenerate(documentId);
  const [showSummary, setShowSummary] = useState(false);
  const [pendingAiPresent, setPendingAiPresent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const editContentRef = useRef(document?.currentContent || '');

  const handleEditorChange = useCallback((value: string) => {
    editContentRef.current = value;
  }, []);

  // 캐시된 슬라이드를 slides state에 세팅
  useEffect(() => {
    if (document?.slidesJson) {
      const cached = document.slidesJson as SlidesJson;
      if (cached.slides?.length > 1 && !slidesGen.slides) {
        slidesGen.setSlides(cached);
      }
    }
  }, [document?.slidesJson, slidesGen]);

  // 백그라운드 생성 완료 시 → toast + 대기 중이면 자동 이동
  useEffect(() => {
    if (slidesGen.slides && pendingAiPresent) {
      setPendingAiPresent(false);
      toast.dismiss('slides-generating');
      toast.success('AI 슬라이드가 준비되었습니다!');
      router.push(`/docs/${documentId}/present?mode=ai`);
    }
  }, [slidesGen.slides, pendingAiPresent, documentId, router]);

  // 생성 실패 시 toast
  useEffect(() => {
    if (slidesGen.error && pendingAiPresent) {
      setPendingAiPresent(false);
      toast.dismiss('slides-generating');
      toast.error('슬라이드 생성에 실패했습니다.', { description: slidesGen.error });
    }
  }, [slidesGen.error, pendingAiPresent]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">
          문서를 찾을 수 없습니다.
        </p>
      </div>
    );
  }

  const isOwner = user?.id === document.ownerId;
  const hasCachedSlides = !!(slidesGen.slides && slidesGen.slides.slides?.length > 1);

  const handleDelete = async () => {
    if (!confirm('정말 이 문서를 삭제하시겠습니까?')) return;
    await deleteDocument();
    router.push('/docs');
  };

  const handleToggleSharing = async () => {
    await toggleSharing(!document.isShared);
  };

  const handlePresentMarkdown = () => {
    router.push(`/docs/${documentId}/present?mode=markdown`);
  };

  const handlePresentAi = () => {
    // 이미 생성된 슬라이드가 있으면 바로 이동
    if (hasCachedSlides) {
      router.push(`/docs/${documentId}/present?mode=ai`);
      return;
    }

    // 이미 생성 중이면 대기만 설정
    if (slidesGen.isGenerating) {
      setPendingAiPresent(true);
      toast.info('슬라이드 생성이 진행 중입니다. 완료되면 자동으로 이동합니다.');
      return;
    }

    // 백그라운드 생성 시작
    setPendingAiPresent(true);
    slidesGen.generate();
    toast.loading('AI가 슬라이드를 구성하고 있습니다...', {
      id: 'slides-generating',
      description: '완료되면 자동으로 프레젠테이션이 시작됩니다.',
    });
  };

  const handleShowSummary = () => {
    setShowSummary(true);
    if (!document.summaryJson && !summary.isProcessing && !summary.isFailed) {
      summary.startSummary();
    }
  };

  const handleRename = async (newTitle: string) => {
    await updateDocument({ title: newTitle });
  };

  const handleToggleEdit = async () => {
    if (isEditing) {
      // 편집 → 보기: 저장
      const content = editContentRef.current;
      if (content !== document.currentContent) {
        await updateDocument({ content });
        toast.success('문서가 저장되었습니다.');
      }
      setIsEditing(false);
    } else {
      // 보기 → 편집
      editContentRef.current = document.currentContent || '';
      setIsEditing(true);
    }
  };

  const handleRegenerateSlides = () => {
    slidesGen.setSlides(null);
    slidesGen.generate();
    toast.loading('AI가 슬라이드를 다시 구성하고 있습니다...', {
      id: 'slides-generating',
      description: '완료되면 프레젠테이션 메뉴에서 확인할 수 있습니다.',
    });
  };

  const handleExportPdf = (type: 'document' | 'presentation' | 'slides') => {
    exportPdf(documentId, document.title, type);
  };

  return (
    <>
      <DocumentToolbar
        title={document.title}
        isShared={!!document.isShared}
        isOwner={isOwner}
        isEditing={isEditing}
        onToggleEdit={handleToggleEdit}
        onToggleSharing={handleToggleSharing}
        onDelete={handleDelete}
        onRename={handleRename}
        onPresentMarkdown={handlePresentMarkdown}
        onPresentAi={handlePresentAi}
        onRegenerateSlides={handleRegenerateSlides}
        onShowSummary={handleShowSummary}
        onExportPdf={handleExportPdf}
        isSummarizing={summary.isProcessing}
        isExportingPdf={isExporting}
        isGeneratingSlides={slidesGen.isGenerating}
        hasCachedSlides={hasCachedSlides}
      />
      <div className="flex">
        <div className="min-w-0 flex-1 p-6">
          <div className="mx-auto max-w-4xl">
            {isEditing ? (
              <RichEditor
                key={`edit-${document.currentVersion}`}
                defaultValue={document.currentContent || ''}
                onChange={handleEditorChange}
                inputFormat="markdown"
                outputFormat="markdown"
                placeholder="마크다운 내용을 입력하세요..."
                className="min-h-[60vh] border-none px-0 py-0"
              />
            ) : document.currentContent ? (
              <MarkdownRenderer content={document.currentContent} />
            ) : (
              <p className="text-sm text-muted-foreground">내용이 없습니다.</p>
            )}
          </div>
        </div>
        <DocumentSidebar
          headings={headings}
          activeId={activeId}
          onHeadingClick={scrollToHeading}
        />
      </div>

      <SummaryPanel
        summary={
          (document.summaryJson as MdDocumentSummary | null) || null
        }
        isProcessing={summary.isProcessing}
        isFailed={summary.isFailed}
        currentMessage={summary.currentStep?.message || null}
        onStartSummary={() => summary.startSummary()}
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
      />

    </>
  );
}
