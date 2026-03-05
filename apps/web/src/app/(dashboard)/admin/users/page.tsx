'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    fetcher<AdminUser[]>({ url: '/auth/admin/users', method: 'GET' })
      .then(setUsers)
      .catch(() => router.push('/dashboard'));
  }, [router]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    load();
  }, [user, router, load]);

  const setLoadingFor = (id: string, val: boolean) =>
    setLoading((prev) => ({ ...prev, [id]: val }));

  const handleApprove = async (userId: string, approved: boolean) => {
    setLoadingFor(userId, true);
    try {
      await fetcher({
        url: `/auth/admin/users/${userId}/approve`,
        method: 'PATCH',
        data: { approved },
      });
      load();
    } catch {
    } finally {
      setLoadingFor(userId, false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setLoadingFor(userId, true);
    try {
      await fetcher({
        url: `/auth/admin/users/${userId}/role`,
        method: 'PATCH',
        data: { role },
      });
      load();
    } catch {
    } finally {
      setLoadingFor(userId, false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return;
    setLoadingFor(userId, true);
    try {
      await fetcher({ url: `/auth/admin/users/${userId}`, method: 'DELETE' });
      load();
    } catch {
    } finally {
      setLoadingFor(userId, false);
    }
  };

  const pendingUsers = users.filter((u) => !u.isApproved);
  const approvedUsers = users.filter((u) => u.isApproved);

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-lg font-semibold">사용자 관리</h1>

      {/* Pending */}
      {pendingUsers.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-500" />
            <h2 className="text-sm font-medium">
              승인 대기 ({pendingUsers.length}명)
            </h2>
          </div>
          <div className="space-y-1">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30"
              >
                <div>
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.email} · {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleApprove(u.id, true)}
                    disabled={loading[u.id]}
                  >
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDelete(u.id)}
                    disabled={loading[u.id]}
                  >
                    거절
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Approved */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          전체 사용자 ({approvedUsers.length}명)
        </h2>
        <div className="space-y-1">
          {approvedUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {u.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <Badge
                  variant={u.role === 'admin' ? 'default' : 'secondary'}
                  className="text-[10px]"
                >
                  {u.role}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                {u.id !== user?.id ? (
                  <>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                      disabled={loading[u.id]}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="user">user</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => handleApprove(u.id, false)}
                      disabled={loading[u.id]}
                    >
                      승인 취소
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(u.id)}
                      disabled={loading[u.id]}
                    >
                      삭제
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">나</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
