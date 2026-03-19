'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetcher } from '@/api/fetcher';
import type { MdDocument } from '../types';

export interface DocumentListParams {
  search?: string;
  shared?: 'true' | 'false';
  sort?: 'updated' | 'created' | 'title';
}

export function useDocumentList(params?: DocumentListParams) {
  const [documents, setDocuments] = useState<MdDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevKey = useRef('');

  const fetchDocuments = useCallback(async (p?: DocumentListParams) => {
    try {
      const query = new URLSearchParams();
      if (p?.search?.trim()) query.set('search', p.search.trim());
      if (p?.shared) query.set('shared', p.shared);
      if (p?.sort && p.sort !== 'updated') query.set('sort', p.sort);
      const qs = query.toString();
      const url = qs ? `/md-documents?${qs}` : '/md-documents';

      const data = await fetcher<MdDocument[]>({ url, method: 'GET' });
      setDocuments(data);
    } catch {
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const key = JSON.stringify(params ?? {});
    if (key === prevKey.current) return;
    prevKey.current = key;
    setIsLoading(true);
    fetchDocuments(params);
  }, [params, fetchDocuments]);

  const refetch = useCallback(() => fetchDocuments(params), [fetchDocuments, params]);

  return { documents, isLoading, refetch };
}
