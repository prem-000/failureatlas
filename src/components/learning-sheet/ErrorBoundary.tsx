import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children:     ReactNode;
  fallback?:    ReactNode;
  /** The visualization type for display in the error UI (e.g. "flowchart", "excalidraw") */
  diagramType?: string;
  /** Optional callback to allow the user to trigger a regeneration. */
  onRegenerate?: () => void;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error:    null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Visualization Error Boundary]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { error, diagramType, onRegenerate } = { ...this.props, ...this.state };

      return (
        <div
          style={{
            padding: '20px 22px',
            background: 'rgba(239,68,68,0.04)',
            border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: 14,
            fontSize: '13px',
            color: '#a1a1aa',
            fontFamily: 'sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: '100%',
          }}
        >
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx={12} cy={12} r={10} />
              <line x1={12} y1={8} x2={12} y2={12} />
              <line x1={12} y1={16} x2={12.01} y2={16} />
            </svg>
            <span style={{ fontWeight: 800, color: '#e4e4e7', fontSize: '14px' }}>
              Visualization failed to render
            </span>
          </div>

          {/* Reason */}
          {(error as Error | null)?.message && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reason
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#fca5a5',
                  background: 'rgba(239,68,68,0.06)',
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  wordBreak: 'break-word',
                }}
              >
                {(error as Error).message}
              </span>
            </div>
          )}

          {/* Diagram Type */}
          {diagramType && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Diagram Type
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#d4d4d8',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '4px 10px',
                  borderRadius: 8,
                  display: 'inline-block',
                  width: 'fit-content',
                }}
              >
                {diagramType}
              </span>
            </div>
          )}

          {/* Suggestion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Suggestion
            </span>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
              The generated visualization exceeded browser rendering limits.
              The explanation below contains the complete learning content.
            </span>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                style={{
                  marginTop: 4,
                  padding: '7px 14px',
                  background: 'rgba(255,95,82,0.1)',
                  border: '1px solid rgba(255,95,82,0.3)',
                  borderRadius: 8,
                  color: '#ff8a80',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  width: 'fit-content',
                }}
              >
                ↺ Regenerate visualization
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
