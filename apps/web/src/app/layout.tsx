import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gritpus Stela',
  description: '회의록 기반 프로젝트 관리 도구',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
