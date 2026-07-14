'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const elementId = `mermaid-${Math.floor(Math.random() * 100000)}`;

    const renderDiagram = async () => {
      try {
        // Dynamically import mermaid to avoid SSR issues
        const { default: mermaid } = await import('mermaid');
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            background: '#0d0d0f',
            primaryColor: '#ff5f52',
            primaryTextColor: '#f4f4f5',
            lineColor: '#27272a',
          },
          securityLevel: 'loose',
        });

        // Clean the code string: replace escaped newlines/characters
        const cleanCode = code
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim();

        // Check if syntax is valid
        const isValid = await mermaid.parse(cleanCode);
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        const { svg: renderedSvg } = await mermaid.render(elementId, cleanCode);
        if (active) {
          setSvg(renderedSvg);
          setError(false);
        }
      } catch (err) {
        console.error('[Mermaid Rendering Error]:', err);
        if (active) {
          setError(true);
        }
      }
    };

    renderDiagram();

    return () => {
      active = false;
    };
  }, [code]);

  if (error) {
    return (
      <div
        style={{
          padding: '16px 20px',
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 12,
          fontSize: '12px',
          color: '#71717a',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
        }}
      >
        <span style={{ color: '#ef4444', fontWeight: 800 }}>⚠️ Visual flowchart rendering failed</span>
        <div style={{ marginTop: 8 }}>{code}</div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 120,
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: 12,
          color: '#52525b',
          fontSize: '12px',
        }}
      >
        Loading diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        overflowX: 'auto',
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 14,
        display: 'flex',
        justifyContent: 'center',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
