'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  fullscreen?: boolean; // graph page needs full viewport height
  hideSidebar?: boolean;
}

export function AppShell({ children, fullscreen = false, hideSidebar = false }: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; image?: string | null } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { router.push('/login'); }
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#131313',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflowX: 'clip',
        maxWidth: '100vw',
        position: 'relative',
      }}
    >
      {/* Sidebar — pill rail on desktop, bottom tab bar on mobile */}
      {!hideSidebar && <Sidebar user={user || undefined} onSignOut={handleLogout} />}

      {/* Main content
          Desktop: offset right of the 72px sidebar rail + 16px gap = pl-[100px]
          Mobile:  no left padding, but add bottom padding for the tab bar (72px + safe area)
      */}
      <main
        className={
          hideSidebar
            ? ''
            : 'md:pl-[100px] pb-[calc(64px+env(safe-area-inset-bottom,0px)+12px)] md:pb-0'
        }
        style={{
          flex: 1,
          minWidth: 0, /* prevent flex children from overflowing */
          width: '100%',
          maxWidth: '100%',
          overflowX: 'clip',
          ...(fullscreen ? { display: 'flex', flexDirection: 'column' } : {}),
        }}
      >
        {children}
      </main>
    </div>
  );
}
