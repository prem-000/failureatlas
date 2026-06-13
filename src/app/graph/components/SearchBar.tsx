'use client';

import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <Search
        size={13}
        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#52525b', pointerEvents: 'none' }}
      />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          padding: '7px 32px 7px 30px',
          color: '#e4e4e7',
          fontSize: '12px',
          outline: 'none',
          width: 200,
          transition: 'border-color 150ms, background 150ms',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'rgba(255,95,82,0.4)';
          e.target.style.background = 'rgba(255,255,255,0.06)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'rgba(255,255,255,0.07)';
          e.target.style.background = 'rgba(255,255,255,0.04)';
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center',
          }}
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
