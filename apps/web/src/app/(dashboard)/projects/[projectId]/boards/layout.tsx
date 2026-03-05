'use client';

import { useState } from 'react';
import { useParams, useSelectedLayoutSegment, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProject } from '@/features/project/hooks/use-project';
import { CreateBoardDialog } from '@/features/project/components/create-board-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { fetcher } from '@/api/fetcher';
import { Plus, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

export default function BoardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { projectId } = useParams<{ projectId: string }>();
  const segment = useSelectedLayoutSegment();
  const router = useRouter();
  const { project, refetch } = useProject(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null);
  const [deletingBoard, setDeletingBoard] = useState(false);

  const boards = project?.boards || [];

  const handleDeleteBoard = async () => {
    if (!deleteBoardId) return;
    setDeletingBoard(true);
    try {
      await fetcher({
        url: `/projects/${projectId}/boards/${deleteBoardId}`,
        method: 'DELETE',
      });
      toast.success('보드가 삭제되었습니다.');
      refetch();
      if (segment === deleteBoardId) {
        const remaining = boards.filter((b) => b.id !== deleteBoardId);
        if (remaining.length > 0) {
          router.push(`/projects/${projectId}/boards/${remaining[0].id}`);
        } else {
          router.push(`/projects/${projectId}/boards`);
        }
      }
    } catch {
      toast.error('보드 삭제에 실패했습니다.');
    } finally {
      setDeletingBoard(false);
      setDeleteBoardId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Board sub-tabs */}
      {boards.length > 0 && (
        <div className="mb-4 flex items-center gap-1 overflow-x-auto">
          {boards.map((board) => {
            const isActive = segment === board.id;
            return (
              <div key={board.id} className="group relative flex shrink-0 items-center">
                <Link
                  href={`/projects/${projectId}/boards/${board.id}`}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 pr-7 text-sm transition-all duration-150',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {board.name}
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute right-1 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteBoardId(board.id)}
                    >
                      보드 삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
          <button
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>

      <CreateBoardDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={refetch}
      />

      <ConfirmDialog
        open={!!deleteBoardId}
        onOpenChange={(open) => !open && setDeleteBoardId(null)}
        title="보드 삭제"
        description="이 보드와 모든 카드가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        onConfirm={handleDeleteBoard}
        loading={deletingBoard}
      />
    </div>
  );
}
