'use client';

import { useParams } from 'next/navigation';
import { BoardView } from '@/features/board/components/board-view';

export default function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>();
  return (
    <div className="-mx-8 -mb-6 flex min-h-0 flex-1 flex-col overflow-hidden">
      <BoardView projectId={projectId} boardId={boardId} />
    </div>
  );
}
