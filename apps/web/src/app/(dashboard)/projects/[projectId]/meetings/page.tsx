'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Plus, FileText, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  createdBy: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  uploaded: '업로드됨',
  parsing: '파싱 중',
  parsed: '파싱 완료',
  confirmed: '확인 완료',
  failed: '실패',
};

export default function MeetingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    fetcher<Meeting[]>({ url: `/projects/${projectId}/meetings`, method: 'GET' })
      .then(setMeetings)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteMeetingId) return;
    setDeleting(true);
    try {
      await fetcher({
        url: `/projects/${projectId}/meetings/${deleteMeetingId}`,
        method: 'DELETE',
      });
      toast.success('회의록이 삭제되었습니다.');
      load();
    } catch {
      toast.error('회의록 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
      setDeleteMeetingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link href={`/projects/${projectId}/meetings/new`}>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
            <Plus className="size-3.5" />
            새 회의록
          </Button>
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
          <FileText className="mb-2 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">아직 회의록이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-1">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="group flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <Link
                href={`/projects/${projectId}/meetings/${m.id}`}
                className="flex-1 min-w-0"
              >
                <span className="text-sm font-medium">{m.title}</span>
              </Link>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {STATUS_LABELS[m.status] || m.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.createdAt).toLocaleDateString('ko-KR')}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteMeetingId(m.id)}
                    >
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteMeetingId}
        onOpenChange={(open) => !open && setDeleteMeetingId(null)}
        title="회의록 삭제"
        description="이 회의록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
