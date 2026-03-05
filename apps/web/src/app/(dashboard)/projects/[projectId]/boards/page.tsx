'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProject } from '@/features/project/hooks/use-project';
import { Kanban } from 'lucide-react';

export default function BoardsIndexPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { project, isLoading } = useProject(projectId);
  const firstBoardId = project?.boards?.[0]?.id;

  useEffect(() => {
    if (!firstBoardId) return;
    router.replace(`/projects/${projectId}/boards/${firstBoardId}`);
  }, [firstBoardId, projectId, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Kanban className="mb-2 size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          보드를 불러오는 중입니다
        </p>
      </div>
    );
  }

  if (project?.boards?.length === 0 || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Kanban className="mb-2 size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          보드를 선택하거나 새로 만드세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Kanban className="mb-2 size-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">
        보드로 이동 중입니다
      </p>
    </div>
  );
}
