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
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#131313', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      {!hideSidebar && <Sidebar user={user || undefined} onSignOut={handleLogout} />}

      {/* Main content */}
      <main
        className={hideSidebar ? "" : "pl-[100px]"}
        style={{
          flex: 1,
          ...(fullscreen ? { display: 'flex', flexDirection: 'column' } : {}),
        }}
      >
        {children}
      </main>
    </div>
  );
}

