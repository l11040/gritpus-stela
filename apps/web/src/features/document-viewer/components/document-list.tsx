'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentList } from '../hooks/use-document-list';
import { useDocumentUpload } from '../hooks/use-document-upload';

export function DocumentList() {
  const { documents, isLoading, refetch } = useDocumentList();
  const { uploadDocument, isUploading } = useDocumentUpload();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    const title = file.name.replace(/\.md$/i, '');
    const doc = await uploadDocument(title, file);
    refetch();
    router.push(`/docs/${doc.id}`);
  };

  const handleNewDocument = async () => {
    const doc = await uploadDocument('새 문서', '# 새 문서\n\n내용을 입력하세요.');
    refetch();
    router.push(`/docs/${doc.id}`);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.md') || file.type === 'text/markdown')) {
      await handleFileSelect(file);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">문서</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="size-3.5" />
            업로드
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleNewDocument}
            disabled={isUploading}
          >
            <Plus className="size-3.5" />
            새 문서
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
      </div>

      <div
        className={`min-h-[200px] rounded-lg border-2 border-dashed transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-transparent'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              아직 문서가 없습니다.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              마크다운 파일을 드래그하거나 새 문서를 만들어 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.id}`}
                className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <FileText className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {doc.title}
                    </span>
                    {doc.isShared ? (
                      <Share2 className="size-3 text-primary" />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{doc.owner.name}</span>
                    <span>·</span>
                    <span>v{doc.currentVersion}</span>
                    <span>·</span>
                    <span>
                      {new Date(doc.updatedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
