import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gritpus Stela',
  description: 'Gritpus Stela Web Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
