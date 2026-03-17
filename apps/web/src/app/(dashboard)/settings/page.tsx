'use client';

import { useAuth } from '@/providers/auth-provider';
import { ChangePasswordForm } from '@/features/settings/components/change-password-form';
import { AdminUserManagement } from '@/features/settings/components/admin-user-management';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl space-y-8 px-6 pt-4 pb-6">
      <h1 className="text-lg font-semibold">설정</h1>

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          비밀번호 변경
        </h2>
        <div className="max-w-md">
          <ChangePasswordForm />
        </div>
      </section>

      {user?.role === 'admin' && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            사용자 관리
          </h2>
          <AdminUserManagement />
        </section>
      )}
    </div>
  );
}
