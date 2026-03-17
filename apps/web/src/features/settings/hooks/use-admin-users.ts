import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
}

export function useAdminUsers() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [resetPasswordTarget, setResetPasswordTarget] = useState<AdminUser | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  const isAdmin = user?.role === 'admin';

  const load = useCallback(() => {
    fetcher<AdminUser[]>({ url: '/auth/admin/users', method: 'GET' })
      .then(setUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

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

  const handleResetPassword = async () => {
    if (!resetPasswordTarget) return;
    setResettingPassword(true);
    try {
      await fetcher({
        url: `/auth/admin/users/${resetPasswordTarget.id}/reset-password`,
        method: 'POST',
      });
      toast.success(`${resetPasswordTarget.name}의 비밀번호가 초기화되었습니다.`);
      setResetPasswordTarget(null);
    } catch {
      toast.error('비밀번호 초기화에 실패했습니다.');
    } finally {
      setResettingPassword(false);
    }
  };

  const pendingUsers = users.filter((u) => !u.isApproved);
  const approvedUsers = users.filter((u) => u.isApproved);

  return {
    isAdmin,
    currentUserId: user?.id,
    pendingUsers,
    approvedUsers,
    loading,
    resetPasswordTarget,
    resettingPassword,
    setResetPasswordTarget,
    handleApprove,
    handleRoleChange,
    handleDelete,
    handleResetPassword,
  };
}
