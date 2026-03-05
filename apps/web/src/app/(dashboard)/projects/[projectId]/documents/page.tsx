'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: { name: string } | null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    fetcher<Document[]>({ url: `/projects/${projectId}/documents`, method: 'GET' })
      .then(setDocs)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('gst_access_token');
    await fetch(`${BASE_URL}/projects/${projectId}/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    setUploading(false);
    load();
    e.target.value = '';
  };

  const download = (doc: Document) => {
    const token = localStorage.getItem('gst_access_token');
    window.open(
      `${BASE_URL}/projects/${projectId}/documents/${doc.id}/download?token=${token}`,
      '_blank',
    );
  };

  const handleDelete = async () => {
    if (!deleteDocId) return;
    setDeleting(true);
    try {
      await fetcher({
        url: `/projects/${projectId}/documents/${deleteDocId}`,
        method: 'DELETE',
      });
      toast.success('문서가 삭제되었습니다.');
      load();
    } catch {
      toast.error('문서 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
      setDeleteDocId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="size-3.5" />
          {uploading ? '업로드 중...' : '파일 업로드'}
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
          <FileText className="mb-2 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">아직 업로드된 문서가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-1">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{doc.originalName}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatSize(Number(doc.size))} · {doc.uploadedBy?.name || '알 수 없음'} · {new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => download(doc)}
                  className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Download className="size-4" />
                </button>
                <button
                  onClick={() => setDeleteDocId(doc.id)}
                  className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteDocId}
        onOpenChange={(open) => !open && setDeleteDocId(null)}
        title="문서 삭제"
        description="이 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
