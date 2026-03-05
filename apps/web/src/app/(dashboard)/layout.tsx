'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { Sidebar } from '@/components/common/sidebar';
import { ParseProgressProvider } from '@/features/meeting/providers/parse-progress-provider';
import { ParseProgressTracker } from '@/features/meeting/components/parse-progress-tracker';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ParseProgressProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-auto">
          <div className="flex min-h-0 flex-1 flex-col px-8 pt-6">
            {children}
          </div>
        </main>
      </div>
      <ParseProgressTracker />
    </ParseProgressProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}
