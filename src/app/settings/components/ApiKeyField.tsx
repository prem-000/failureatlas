import React, { useState } from 'react';

interface ApiKeyFieldProps {
  apiKey: string | null;
  onRegenerate: () => void;
}

export function ApiKeyField({ apiKey, onRegenerate }: ApiKeyFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const copy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateClick = () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }
    setConfirming(false);
    setRegenerating(true);
    onRegenerate();
    setTimeout(() => setRegenerating(false), 2000);
  };

  const masked = apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(24)}` : 'No API key generated';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1,
            background: '#111111',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            padding: '10px 14px',
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#a1a1aa',
            letterSpacing: '0.05em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {revealed ? apiKey || 'None' : masked}
        </div>
        <button
          onClick={() => setRevealed(r => !r)}
          title={revealed ? 'Hide key' : 'Reveal key'}
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 7,
            padding: '9px 14px',
            color: '#71717a',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {revealed ? '🙈' : '👁'}
        </button>
        <button
          onClick={copy}
          disabled={!apiKey}
          style={{
            background: copied ? '#052e16' : '#1a1a1a',
            border: `1px solid ${copied ? '#166534' : '#2a2a2a'}`,
            borderRadius: 7,
            padding: '9px 14px',
            color: copied ? '#22c55e' : '#71717a',
            cursor: copied ? 'default' : 'pointer',
            fontSize: 12,
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleRegenerateClick}
          disabled={regenerating}
          style={{
            background: confirming ? '#450a0a' : '#1a1a1a',
            border: `1px solid ${confirming ? '#991b1b' : '#2a2a2a'}`,
            borderRadius: 7,
            padding: '8px 16px',
            color: confirming ? '#ef4444' : '#71717a',
            cursor: regenerating ? 'default' : 'pointer',
            fontSize: 12,
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          {regenerating ? '⟳ Regenerating…' : confirming ? '⚠ Click again to confirm' : '↺ Regenerate Key'}
        </button>
        {confirming && (
          <span style={{ fontSize: 11, color: '#ef4444' }}>
            Your current key will stop working immediately.
          </span>
        )}
      </div>
    </div>
  );
}
