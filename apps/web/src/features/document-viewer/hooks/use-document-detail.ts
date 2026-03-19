'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetcher } from '@/api/fetcher';
import type { MdDocument } from '../types';

export function useDocumentDetail(documentId: string) {
  const [document, setDocument] = useState<MdDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocument = useCallback(async () => {
    try {
      const data = await fetcher<MdDocument>({
        url: `/md-documents/${documentId}`,
        method: 'GET',
      });
      setDocument(data);
    } catch {
      setDocument(null);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const updateDocument = useCallback(
    async (body: { title?: string; content?: string; changeNote?: string }) => {
      const data = await fetcher<MdDocument>({
        url: `/md-documents/${documentId}`,
        method: 'PATCH',
        data: body,
      });
      setDocument(data);
      return data;
    },
    [documentId],
  );

  const deleteDocument = useCallback(async () => {
    await fetcher({ url: `/md-documents/${documentId}`, method: 'DELETE' });
  }, [documentId]);

  const toggleSharing = useCallback(
    async (isShared: boolean) => {
      const data = await fetcher<MdDocument>({
        url: `/md-documents/${documentId}/sharing`,
        method: 'PATCH',
        data: { isShared },
      });
      setDocument(data);
      return data;
    },
    [documentId],
  );

  return {
    document,
    isLoading,
    refetch: fetchDocument,
    updateDocument,
    deleteDocument,
    toggleSharing,
  };
}
