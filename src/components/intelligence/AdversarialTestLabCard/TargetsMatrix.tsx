'use client';

import React from 'react';
import type { AdversarialTestCase } from '@/types';

interface TargetsMatrixProps {
  cases: AdversarialTestCase[];
  colors?: any;
}

const DEFAULT_TARGET_CONCEPTS = [
  'Boundary comparison',
  'Pointer update',
  'Duplicate handling',
  'Early exit',
  'Midpoint calculation',
  'Overflow guard',
  'Empty input guard',
  'State transition',
];

export function TargetsMatrix({ cases, colors }: TargetsMatrixProps) {
  if (!cases || cases.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#71717a', fontSize: 13 }}>
        No test cases available to compute targets matrix.
      </div>
    );
  }

  // Extract all concept columns dynamically from test targets + default set
  const allConceptSet = new Set<string>(DEFAULT_TARGET_CONCEPTS);
  cases.forEach(c => {
    (c.targets || []).forEach(t => {
      const clean = t.replace(/^✓\s*/, '').trim();
      if (clean.length > 0) {
        allConceptSet.add(clean);
      }
    });
  });

  const conceptColumns = Array.from(allConceptSet).slice(0, 7); // keep max 7 columns for fit

  // Calculate coverage for each concept column
  const conceptCoverageMap = new Map<string, number>();
  conceptColumns.forEach(concept => {
    let count = 0;
    cases.forEach(c => {
      const caseTargets = (c.targets || []).map(t => t.replace(/^✓\s*/, '').toLowerCase().trim());
      const categoryText = (c.category || '').toLowerCase();
      const purposeText = (c.purpose || '').toLowerCase();
      const concLower = concept.toLowerCase();

      if (
        caseTargets.some(t => t.includes(concLower) || concLower.includes(t)) ||
        categoryText.includes(concLower) ||
        purposeText.includes(concLower)
      ) {
        count++;
      }
    });
    conceptCoverageMap.set(concept, count);
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: '#070a13',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.02em' }}>
            🎯 IMPLEMENTATION TARGETS MATRIX
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(0, 240, 255, 0.1)',
              color: '#00f0ff',
              border: '1px solid rgba(0, 240, 255, 0.25)',
            }}
          >
            STRUCTURAL VERIFICATION
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
          {cases.length} Cases × {conceptColumns.length} Concepts
        </span>
      </div>

      {/* Responsive Matrix Table Container */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            fontFamily: 'sans-serif',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ background: '#0d1321', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <th style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 700, minWidth: 160 }}>
                TEST CASE / CATEGORY
              </th>
              {conceptColumns.map(col => (
                <th
                  key={col}
                  style={{
                    padding: '12px 10px',
                    color: '#e2e8f0',
                    fontWeight: 700,
                    textAlign: 'center',
                    fontSize: 11,
                    minWidth: 110,
                    textTransform: 'capitalize',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c, idx) => {
              const caseTargets = (c.targets || []).map(t => t.replace(/^✓\s*/, '').toLowerCase().trim());
              const categoryText = (c.category || '').toLowerCase();
              const purposeText = (c.purpose || '').toLowerCase();

              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: idx % 2 === 0 ? 'rgba(13, 19, 33, 0.4)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                        Case #{idx + 1} ({c.category || 'Boundary'})
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.failureMode || c.purpose || 'Targeted Judge Case'}
                      </span>
                    </div>
                  </td>

                  {conceptColumns.map(col => {
                    const concLower = col.toLowerCase();
                    const isExercised =
                      caseTargets.some(t => t.includes(concLower) || concLower.includes(t)) ||
                      categoryText.includes(concLower) ||
                      purposeText.includes(concLower);

                    return (
                      <td key={col} style={{ padding: '10px', textAlign: 'center' }}>
                        {isExercised ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              fontWeight: 800,
                              fontSize: 13,
                              boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)',
                            }}
                            title={`Exercised by Case #${idx + 1}`}
                          >
                            ✓
                          </span>
                        ) : (
                          <span style={{ color: '#334155', fontWeight: 600, fontSize: 14 }}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
