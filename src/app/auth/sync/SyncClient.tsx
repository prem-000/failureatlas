'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SyncClientProps {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
}

export default function SyncClient({ token, user }: SyncClientProps) {
  const router = useRouter();

  useEffect(() => {
    // Save to localStorage just like the manual login does
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Redirect to dashboard
    router.replace('/dashboard');
  }, [token, user, router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#131313',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid #2a2a2a',
        borderTopColor: '#ff5f52',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ color: '#52525b', fontSize: 14 }}>Authenticating...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
