'use client';

import { use } from 'react';
import { DocumentDetail } from '@/features/document-viewer/components/document-detail';

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  return <DocumentDetail documentId={documentId} />;
}
