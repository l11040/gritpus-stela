import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RouteTransitionProvider } from '@/providers/route-transition-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gritpus Stela',
  description: '회의록 기반 프로젝트 관리 도구',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        <TooltipProvider delayDuration={300}>
          <RouteTransitionProvider>
            {children}
          </RouteTransitionProvider>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
