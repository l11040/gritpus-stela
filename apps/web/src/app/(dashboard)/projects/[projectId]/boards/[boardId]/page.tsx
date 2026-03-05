'use client';

import { useParams } from 'next/navigation';
import { BoardView } from '@/features/board/components/board-view';

export default function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>();
  return <BoardView projectId={projectId} boardId={boardId} />;
}
