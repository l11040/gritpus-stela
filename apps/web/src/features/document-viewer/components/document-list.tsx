'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Plus, Share2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocumentList, type DocumentListParams } from '../hooks/use-document-list';
import { useDocumentUpload } from '../hooks/use-document-upload';

type ShareFilter = 'all' | 'shared' | 'private';
type SortKey = 'updated' | 'created' | 'title';

function useDebounce(value: string, ms = 300): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return debounced;
}

export function DocumentList() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [search, setSearch] = useState('');
  const [shareFilter, setShareFilter] = useState<ShareFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated');

  const debouncedSearch = useDebounce(search);

  const params = useMemo<DocumentListParams>(() => {
    const p: DocumentListParams = {};
    if (debouncedSearch.trim()) p.search = debouncedSearch.trim();
    if (shareFilter === 'shared') p.shared = 'true';
    else if (shareFilter === 'private') p.shared = 'false';
    if (sortKey !== 'updated') p.sort = sortKey;
    return p;
  }, [debouncedSearch, shareFilter, sortKey]);

  const { documents, isLoading, refetch } = useDocumentList(params);
  const { uploadDocument, isUploading } = useDocumentUpload();

  const handleFileSelect = useCallback(async (file: File) => {
    const title = file.name.replace(/\.md$/i, '');
    const doc = await uploadDocument(title, file);
    refetch();
    router.push(`/docs/${doc.id}`);
  }, [uploadDocument, refetch, router]);

  const handleNewDocument = useCallback(async () => {
    const doc = await uploadDocument('새 문서', '# 새 문서\n\n내용을 입력하세요.');
    refetch();
    router.push(`/docs/${doc.id}`);
  }, [uploadDocument, refetch, router]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.md') || file.type === 'text/markdown')) {
      await handleFileSelect(file);
    }
  }, [handleFileSelect]);

  return (
    <div
      className="space-y-5 px-6 pb-6 pt-5"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setIsDragOver(false); }}
      onDrop={handleDrop}
    >
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">문서</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            마크다운 문서를 업로드하고 프레젠테이션으로 변환하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="size-4" />
            업로드
          </Button>
          <Button onClick={handleNewDocument} disabled={isUploading}>
            <Plus className="size-4" />
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

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="문서 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Tabs value={shareFilter} onValueChange={(v) => setShareFilter(v as ShareFilter)}>
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="shared">공유</TabsTrigger>
            <TabsTrigger value="private">비공개</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">최근 수정순</SelectItem>
            <SelectItem value="created">생성일순</SelectItem>
            <SelectItem value="title">이름순</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="shrink-0">
          {documents.length}건
        </Badge>

        {isDragOver && (
          <span className="text-xs text-primary">파일을 놓으면 업로드됩니다</span>
        )}
      </div>

      {/* 리스트 */}
      <div
        className={`space-y-2 rounded-lg transition-colors ${
          isDragOver ? 'bg-primary/5 ring-2 ring-primary/20 ring-dashed' : ''
        }`}
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
            <FileText className="mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search || shareFilter !== 'all'
                ? '검색 결과가 없습니다.'
                : '아직 문서가 없습니다.'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || shareFilter !== 'all'
                ? '다른 키워드로 검색해 보세요.'
                : '마크다운 파일을 드래그하거나 새 문서를 만들어 보세요.'}
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/docs/${doc.id}`}
              className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {doc.title}
                  </span>
                  {doc.isShared ? (
                    <Share2 className="size-3 shrink-0 text-primary" />
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{doc.owner.name}</span>
                <span>·</span>
                <span>v{doc.currentVersion}</span>
                <span>·</span>
                <span>{new Date(doc.updatedAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
