'use client';

import { useRef, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useDocumentDetail } from '../hooks/use-document-detail';
import { useDocumentSummary } from '../hooks/use-document-summary';
import { useTableOfContents } from '../hooks/use-table-of-contents';
import { extractHeadings } from '../lib/markdown-utils';
import { MarkdownRenderer } from './markdown-renderer';
import { DocumentToolbar } from './document-toolbar';
import { DocumentSidebar } from './document-sidebar';
import { SummaryPanel } from './summary-panel';
import { VersionHistory } from './version-history';
import type { MdDocumentSummary } from '../types';

interface DocumentDetailProps {
  documentId: string;
}

export function DocumentDetail({ documentId }: DocumentDetailProps) {
  const { user } = useAuth();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    document,
    isLoading,
    refetch,
    deleteDocument,
    toggleSharing,
  } = useDocumentDetail(documentId);
  const { activeId } = useTableOfContents(contentRef);
  const summary = useDocumentSummary(documentId);
  const [showVersions, setShowVersions] = useState(false);

  const headings = useMemo(
    () =>
      document?.currentContent
        ? extractHeadings(document.currentContent)
        : [],
    [document?.currentContent],
  );

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

  const handleDelete = async () => {
    if (!confirm('정말 이 문서를 삭제하시겠습니까?')) return;
    await deleteDocument();
    router.push('/docs');
  };

  const handleToggleSharing = async () => {
    await toggleSharing(!document.isShared);
  };

  const handlePresent = () => {
    router.push(`/docs/${documentId}/present`);
  };

  const handleSummarize = () => {
    summary.startSummary();
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="flex h-full flex-col">
      <DocumentToolbar
        title={document.title}
        isShared={!!document.isShared}
        isOwner={isOwner}
        onToggleSharing={handleToggleSharing}
        onDelete={handleDelete}
        onPresent={handlePresent}
        onSummarize={handleSummarize}
        onShowVersions={() => setShowVersions(true)}
        onExportPdf={handleExportPdf}
        isSummarizing={summary.isProcessing}
      />
      <div className="flex flex-1 gap-6 overflow-y-auto p-6">
        <div ref={contentRef} className="min-w-0 flex-1">
          <SummaryPanel
            summary={
              (document.summaryJson as MdDocumentSummary | null) || null
            }
            isProcessing={summary.isProcessing}
            isFailed={summary.isFailed}
            currentMessage={summary.currentStep?.message || null}
            onStartSummary={handleSummarize}
          />
          {(document.summaryJson || summary.isProcessing || summary.isFailed) && (
            <div className="my-6 h-px bg-border" />
          )}
          {document.currentContent ? (
            <MarkdownRenderer content={document.currentContent} />
          ) : (
            <p className="text-sm text-muted-foreground">내용이 없습니다.</p>
          )}
        </div>
        <DocumentSidebar headings={headings} activeId={activeId} />
      </div>

      <VersionHistory
        documentId={documentId}
        isOpen={showVersions}
        onClose={() => setShowVersions(false)}
        onRestore={refetch}
      />
    </div>
  );
}
