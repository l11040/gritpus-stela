'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProject } from '@/features/project/hooks/use-project';
import { CreateBoardDialog } from '@/features/project/components/create-board-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Kanban } from 'lucide-react';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading, refetch } = useProject(projectId);
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6 px-6 pt-5">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-8 px-6 pt-5 pb-6">
      {/* Boards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">보드</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => setBoardDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            새 보드
          </Button>
        </div>
        {project.boards?.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
            <Kanban className="mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">아직 보드가 없습니다</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => setBoardDialogOpen(true)}
            >
              보드 만들기
            </Button>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {project.boards?.map((board) => (
              <Link
                key={board.id}
                href={`/projects/${projectId}/boards/${board.id}`}
                className="group flex items-center gap-3 rounded-md border px-4 py-3 transition-all duration-150 hover:bg-muted/40"
              >
                <Kanban className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{board.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Members */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">멤버</h2>
        <div className="space-y-1">
          {project.members?.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {m.user.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{m.user.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.user.email}
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {m.role}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <CreateBoardDialog
        projectId={projectId}
        open={boardDialogOpen}
        onOpenChange={setBoardDialogOpen}
        onCreated={refetch}
      />
    </div>
  );
}
