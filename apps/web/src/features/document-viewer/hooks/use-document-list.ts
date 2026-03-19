'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetcher } from '@/api/fetcher';
import type { MdDocument } from '../types';

export function useDocumentList() {
  const [documents, setDocuments] = useState<MdDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await fetcher<MdDocument[]>({
        url: '/md-documents',
        method: 'GET',
      });
      setDocuments(data);
    } catch {
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, isLoading, refetch: fetchDocuments };
}
