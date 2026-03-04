'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">사용자 관리</h1>

      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              승인 대기 ({pendingUsers.length}명)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950"
              >
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString('ko-KR')} 가입
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(u.id, true)}
                    disabled={loading[u.id]}
                  >
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(u.id)}
                    disabled={loading[u.id]}
                  >
                    거절
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            전체 사용자 ({approvedUsers.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvedUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                </div>
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                  {u.role}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {u.id !== user?.id && (
                  <>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                      disabled={loading[u.id]}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="user">user</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(u.id, false)}
                      disabled={loading[u.id]}
                    >
                      승인 취소
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(u.id)}
                      disabled={loading[u.id]}
                    >
                      삭제
                    </Button>
                  </>
                )}
                {u.id === user?.id && (
                  <span className="text-xs text-muted-foreground">나</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
