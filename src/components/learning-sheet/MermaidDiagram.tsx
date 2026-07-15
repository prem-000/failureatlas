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
      let cleanCode = '';
      let codeToRender = '';
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
        cleanCode = code
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim();

        // 1. First Parse Attempt
        codeToRender = cleanCode;
        let isValid = false;
        let parseError: any = null;

        try {
          await mermaid.parse(codeToRender);
          isValid = true;
        } catch (e: any) {
          parseError = e;
          isValid = false;
        }

        // 2. Retry Sanitization if first attempt fails
        if (!isValid) {
          try {
            // Import and run sanitizeMermaid
            const { sanitizeMermaid } = await import('@/lib/learning-sheet/mermaidSanitizer');
            codeToRender = sanitizeMermaid(cleanCode);
            await mermaid.parse(codeToRender);
            isValid = true;
          } catch (err2: any) {
            parseError = err2;
            isValid = false;
          }
        }

        if (!isValid) {
          // Log complete debugging information
          console.error("Mermaid Parse Error");
          console.error({
            original: code,
            sanitized: codeToRender,
            error: parseError?.message || parseError,
            stack: parseError instanceof Error ? parseError.stack : undefined
          });

          if (active) {
            setError(true);
          }
          return;
        }

        const { svg: renderedSvg } = await mermaid.render(elementId, codeToRender);
        if (active) {
          setSvg(renderedSvg);
          setError(false);
        }
      } catch (err: any) {
        console.error('[Mermaid Rendering Critical Exception]:', err);
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
          background: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 14,
          fontSize: '13px',
          color: '#a1a1aa',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontWeight: 800, color: '#e4e4e7', fontSize: '14px' }}>Diagram unavailable</span>
        <span style={{ color: '#71717a' }}>The AI-generated diagram could not be rendered.</span>
        <span style={{ color: '#71717a', fontSize: '12px' }}>The explanation below contains the complete learning content.</span>
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
