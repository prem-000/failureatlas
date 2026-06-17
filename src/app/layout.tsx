// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { QueryProvider } from '@/components/providers/QueryProvider';
import '@/styles/globals.css';

// ✅ SEPARATE viewport export (fixes the warnings)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#131313',
};

// ✅ Remove viewport/themeColor from metadata
export const metadata: Metadata = {
  title: {
    default: 'Praxis | Practice. Reflect. Improve.',
    template: '%s | Praxis',
  },
  description: 'AI-powered competitive programming practice and growth intelligence platform',
  keywords: ['competitive programming', 'leetcode', 'codeforces', 'algorithm', 'debugging', 'AI', 'practice'],
  authors: [{ name: 'Praxis' }],
  // ❌ Remove: viewport: 'width=device-width, initial-scale=1',
  // ❌ Remove: themeColor: '#131313',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}