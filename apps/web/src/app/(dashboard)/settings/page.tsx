'use client';

import { ChangePasswordForm } from '@/features/settings/components/change-password-form';

export default function SettingsPage() {
  return (
    <div className="max-w-md space-y-8 px-6 pt-4 pb-6">
      <h1 className="text-lg font-semibold">설정</h1>

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          비밀번호 변경
        </h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
