'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">문서</h1>
        <div>
          <Input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="w-auto"
          />
        </div>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            아직 업로드된 문서가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <Card key={doc.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{doc.originalName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatSize(Number(doc.size))} · {doc.uploadedBy?.name || '알 수 없음'} · {new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => download(doc)}>
                다운로드
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
