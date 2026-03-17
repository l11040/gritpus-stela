import { useState } from 'react';
import { fetcher } from '@/api/fetcher';
import { toast } from 'sonner';

export function useChangePassword() {
  const [loading, setLoading] = useState(false);

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setLoading(true);
    try {
      await fetcher({
        url: '/auth/me/password',
        method: 'PATCH',
        data: { currentPassword, newPassword },
      });
      toast.success('비밀번호가 변경되었습니다.');
      return true;
    } catch {
      toast.error('비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading };
}
