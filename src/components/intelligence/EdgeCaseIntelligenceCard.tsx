'use client';

import type { EdgeCaseItem } from '@/types';
import { Check, AlertTriangle } from 'lucide-react';

interface Props {
  edgeCases: EdgeCaseItem[];
}

function ConfidenceCircle({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.75 ? '#22c55e' : value >= 0.55 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0,
      }} />
      <span style={{ fontSize: 10, color, fontWeight: 600 }}>{pct}%</span>
    </div>
  );
}

export function EdgeCaseIntelligenceCard({ edgeCases }: Props) {
  const covered = edgeCases.filter(e => e.status === 'Covered');
  const atRisk = edgeCases.filter(e => e.status === 'At Risk');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{
          flex: 1, background: '#052e16', border: '1px solid #166534',
          borderRadius: 9, padding: '10px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>{covered.length}</div>
          <div style={{ fontSize: 10, color: '#4ade80' }}>Covered</div>
        </div>
        <div style={{
          flex: 1, background: '#450a0a', border: '1px solid #991b1b',
          borderRadius: 9, padding: '10px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{atRisk.length}</div>
          <div style={{ fontSize: 10, color: '#fca5a5' }}>At Risk</div>
        </div>
      </div>

      {/* Edge case items */}
      {edgeCases.map((ec, i) => {
        const isCovered = ec.status === 'Covered';
        const accentColor = isCovered ? '#22c55e' : '#ef4444';
        const bgColor = isCovered ? '#052e1615' : '#450a0a15';
        const borderColor = isCovered ? '#166534' : '#991b1b';

        return (
          <div key={i} style={{
            background: bgColor, border: `1px solid ${borderColor}`,
            borderRadius: 10, padding: '12px 14px',
            borderLeft: `3px solid ${accentColor}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7', marginBottom: 2 }}>
                  {ec.input}
                </div>
                <div style={{ fontSize: 10, color: '#71717a', fontStyle: 'italic' }}>{ec.whyImportant}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, marginLeft: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: isCovered ? '#052e16' : '#450a0a',
                  color: accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {isCovered ? <Check size={10} /> : <AlertTriangle size={10} />}
                  {isCovered ? 'Covered' : 'At Risk'}
                </span>
                <ConfidenceCircle value={ec.confidence} />
              </div>
            </div>
            {/* Reason */}
            <div style={{ fontSize: 11, color: isCovered ? '#4ade80' : '#fca5a5', lineHeight: 1.4 }}>
              {ec.reason}
            </div>
          </div>
        );
      })}
    </div>
  );
}
