'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { Sidebar } from '@/components/common/sidebar';
import { MobileNav } from '@/components/common/mobile-nav';
import { ParseProgressProvider } from '@/features/meeting/providers/parse-progress-provider';
import { ParseProgressTracker } from '@/features/meeting/components/parse-progress-tracker';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ParseProgressProvider>
      <div className="flex h-dvh">
        <div className="hidden md:flex">
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </div>
        <main className="flex flex-1 flex-col overflow-auto pb-[var(--mobile-nav-offset)] md:pb-0">
          {children}
        </main>
        <MobileNav />
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
