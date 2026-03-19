'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { PresentationMode } from '@/features/document-viewer/components/presentation-mode';
import type { MdDocument } from '@/features/document-viewer/types';

export default function PresentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  const router = useRouter();
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    fetcher<MdDocument>({
      url: `/md-documents/${documentId}`,
      method: 'GET',
    }).then((doc) => {
      setContent(doc.currentContent || '');
    });
  }, [documentId]);

  if (content === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-sm text-white/60">로딩 중...</div>
      </div>
    );
  }

  return (
    <PresentationMode
      content={content}
      onExit={() => router.push(`/docs/${documentId}`)}
    />
  );
}
