import React from 'react';

export default function WorkspaceLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d0d0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid #ff5f52',
            borderTopColor: 'transparent',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#52525b', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
          Loading Workspace...
        </p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
