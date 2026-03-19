'use client';

import { useState, useCallback } from 'react';
import { fetcher } from '@/api/fetcher';
import type { MdDocumentVersion } from '../types';

export function useDocumentVersions(documentId: string) {
  const [versions, setVersions] = useState<MdDocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetcher<MdDocumentVersion[]>({
        url: `/md-documents/${documentId}/versions`,
        method: 'GET',
      });
      setVersions(data);
    } catch {
      setVersions([]);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  const restoreVersion = useCallback(
    async (version: number) => {
      await fetcher({
        url: `/md-documents/${documentId}/versions/${version}/restore`,
        method: 'POST',
      });
    },
    [documentId],
  );

  return { versions, isLoading, fetchVersions, restoreVersion };
}
