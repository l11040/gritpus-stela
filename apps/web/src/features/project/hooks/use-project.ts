'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetcher } from '@/api/fetcher';
import type { Project } from '../types';

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    fetcher<Project>({ url: `/projects/${projectId}`, method: 'GET' })
      .then(setProject)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return { project, isLoading, refetch: load };
}
