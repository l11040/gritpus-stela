'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  role: string;
  user: { name: string; email: string };
}

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  const loadMembers = useCallback(() => {
    fetcher<Member[]>({ url: `/projects/${projectId}/members`, method: 'GET' })
      .then(setMembers)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await fetcher({
        url: `/projects/${projectId}/members`,
        method: 'POST',
        data: { email },
      });
      setEmail('');
      loadMembers();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeletingProject(true);
    try {
      await fetcher({ url: `/projects/${projectId}`, method: 'DELETE' });
      toast.success('프로젝트가 삭제되었습니다.');
      router.push('/dashboard');
    } catch {
      toast.error('프로젝트 삭제에 실패했습니다.');
      setDeletingProject(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberId) return;
    setRemovingMember(true);
    try {
      await fetcher({
        url: `/projects/${projectId}/members/${removeMemberId}`,
        method: 'DELETE',
      });
      toast.success('멤버가 제거되었습니다.');
      loadMembers();
    } catch {
      toast.error('멤버 제거에 실패했습니다.');
    } finally {
      setRemovingMember(false);
      setRemoveMemberId(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Invite */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">멤버 초대</h2>
        <form onSubmit={addMember} className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="초대할 이메일"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
            <UserPlus className="size-3.5" />
            초대
          </Button>
        </form>
      </section>

      {/* Member list */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">멤버 목록</h2>
        <div className="space-y-1">
          {members.map((m) => (
            <div
              key={m.id}
              className="group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {m.user.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{m.user.name}</div>
                <div className="truncate text-xs text-muted-foreground">{m.user.email}</div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {m.role}
              </Badge>
              {m.role !== 'owner' && (
                <button
                  onClick={() => setRemoveMemberId(m.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-destructive">위험 구역</h2>
        <div className="rounded-md border border-destructive/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">프로젝트 삭제</p>
              <p className="text-xs text-muted-foreground">
                모든 보드, 카드, 회의록, 문서가 함께 삭제됩니다.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteProjectOpen(true)}
            >
              삭제
            </Button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={deleteProjectOpen}
        onOpenChange={setDeleteProjectOpen}
        title="프로젝트 삭제"
        description="이 프로젝트를 삭제하면 모든 보드, 카드, 회의록, 문서가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        onConfirm={handleDeleteProject}
        loading={deletingProject}
      />

      <ConfirmDialog
        open={!!removeMemberId}
        onOpenChange={(open) => !open && setRemoveMemberId(null)}
        title="멤버 제거"
        description="이 멤버를 프로젝트에서 제거하시겠습니까?"
        confirmLabel="제거"
        onConfirm={handleRemoveMember}
        loading={removingMember}
      />
    </div>
  );
}
