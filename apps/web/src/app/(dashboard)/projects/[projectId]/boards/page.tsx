'use client';

import { useParams } from 'next/navigation';
import { useProject } from '@/features/project/hooks/use-project';
import { Kanban } from 'lucide-react';

export default function BoardsIndexPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project } = useProject(projectId);

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
        아래에서 보드를 선택하세요
      </p>
    </div>
  );
}
