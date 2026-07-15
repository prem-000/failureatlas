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
        let codeToRender = cleanCode;
        let isValid = false;
        try {
          await mermaid.parse(codeToRender);
          isValid = true;
        } catch (e) {
          // Attempt automatic repair
          try {
            const { repairMermaid } = await import('@/lib/learning-sheet/repair');
            codeToRender = repairMermaid(codeToRender);
            await mermaid.parse(codeToRender);
            isValid = true;
          } catch (err2) {
            isValid = false;
          }
        }

        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        const { svg: renderedSvg } = await mermaid.render(elementId, codeToRender);
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
          padding: '24px 20px',
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 12,
          fontSize: '13px',
          color: '#71717a',
          textAlign: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <span>Unable to generate workflow.</span>
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
