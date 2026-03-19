'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

function PresentationGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-900">
        <div className="text-white/60">로딩 중...</div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PresentationGuard>{children}</PresentationGuard>
    </AuthProvider>
  );
}
