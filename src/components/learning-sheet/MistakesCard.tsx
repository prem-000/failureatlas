import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface MistakesCardProps {
  mistakes: string[];
  personalizedMistakes?: string[];
}

export function MistakesCard({ mistakes, personalizedMistakes }: MistakesCardProps) {
  const hasPersonalized = personalizedMistakes && personalizedMistakes.length > 0;
  const hasCommon = mistakes && mistakes.length > 0;

  if (!hasCommon && !hasPersonalized) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* ⚠️ Personalized mistakes (Mistakes YOU Make) */}
      {hasPersonalized && (
        <div
          style={{
            background: 'rgba(255,95,82,0.02)',
            border: '1px solid rgba(255,95,82,0.15)',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(255,95,82,0.1)',
                color: '#ff5f52',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={16} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚠️ Mistakes You Make
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {personalizedMistakes.map((mistake, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 14px',
                  background: 'rgba(255,95,82,0.05)',
                  border: '1px solid rgba(255,95,82,0.08)',
                  borderRadius: 10,
                }}
              >
                <span style={{ color: '#ff5f52', fontWeight: 800, fontSize: '13px', lineHeight: 1.2, marginTop: 1 }}>
                  •
                </span>
                <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#fca5a5', margin: 0 }}>
                  {mistake}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚠️ Common Mistakes */}
      {hasCommon && (
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(251,191,36,0.1)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={15} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#e4e4e7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Common Pitfalls
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mistakes.map((mistake, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.03)',
                  borderRadius: 10,
                }}
              >
                <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '13px', lineHeight: 1.2, marginTop: 1 }}>
                  •
                </span>
                <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#d4d4d8', margin: 0 }}>
                  {mistake}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
