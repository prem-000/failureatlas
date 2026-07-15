'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

export default function PrintPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#ffffff', color: '#111' }}>
        <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite', color: '#ff5f52', marginBottom: 12 }} />
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading print view...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <PrintPageContent />
    </Suspense>
  );
}

function PrintPageContent() {
  const searchParams = useSearchParams();
  const exportId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<any[]>([]);

  useEffect(() => {
    if (!exportId) {
      setError('Export ID is missing. Please close this window and try again.');
      setLoading(false);
      return;
    }

    apiFetch<{ success: boolean; payload: any[] }>(`/api/practice-queue/export?id=${exportId}`)
      .then((res) => {
        if (res.success && res.payload) {
          setProblems(res.payload);
        } else {
          setError('Failed to load the compiled practice revision pack data.');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error occurred while loading print payload.');
        setLoading(false);
      });
  }, [exportId]);

  // Trigger print after rendering is complete
  useEffect(() => {
    if (!loading && problems.length > 0 && !error) {
      const timer = setTimeout(() => {
        window.print();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, problems, error]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#ffffff', color: '#111' }}>
        <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite', color: '#ff5f52', marginBottom: 12 }} />
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Assembling Practice Revision Pack...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || problems.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, background: '#ffffff', color: '#111' }}>
        <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: 16 }} />
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: 8 }}>Export Error</h3>
        <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: 400 }}>
          {error || 'No problems found in the export payload.'}
        </p>
      </div>
    );
  }

  return (
    <div className="print-container">
      <style>{`
        /* --- Screen Styling --- */
        body {
          background-color: #f4f4f5;
          color: #18181b;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .print-container {
          max-width: 800px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .print-header-banner {
          background: #ffffff;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .print-sheet {
          background: #ffffff;
          border: 1px solid #e4e4e7;
          border-radius: 16px;
          padding: 40px;
          margin-bottom: 40px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          position: relative;
        }
        .sheet-title {
          font-size: 24px;
          font-weight: 800;
          color: #111;
          margin: 0 0 12px 0;
          line-height: 1.2;
        }
        .meta-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: #71717a;
          margin-bottom: 24px;
        }
        .meta-badge {
          font-weight: 800;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
          background: #f4f4f5;
          border: 1px solid #e4e4e7;
        }
        .section-block {
          border-top: 1px solid #e4e4e7;
          padding-top: 20px;
          margin-top: 24px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 800;
          color: #111;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 12px 0;
        }
        .notes-content {
          font-size: 13px;
          color: #3f3f46;
          line-height: 1.6;
          white-space: pre-wrap;
          font-style: italic;
        }
        .code-content {
          font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
          font-size: 12px;
          background: #fafafa;
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          white-space: pre-wrap;
          color: #27272a;
          margin: 0;
        }
        .editorial-content {
          font-size: 13px;
          color: #3f3f46;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .qr-section {
          position: absolute;
          top: 40px;
          right: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .qr-label {
          font-size: 9px;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
        }
        .blank-lines div {
          border-bottom: 1px dotted #a1a1aa;
          height: 32px;
        }

        /* --- Print Styling --- */
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 12pt;
          }
          .print-header-banner {
            display: none !important;
          }
          .print-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-sheet {
            border: none !important;
            border-bottom: 1px solid #e4e4e7 !important;
            border-radius: 0 !important;
            padding: 20px 0 !important;
            margin-bottom: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
          }
          .print-sheet:last-child {
            border-bottom: none !important;
            page-break-after: avoid !important;
          }
          .code-content {
            background: #ffffff !important;
            border: 1px solid #000000 !important;
            color: #000000 !important;
          }
          .blank-lines div {
            border-bottom: 1px dotted #000000 !important;
          }
        }
      `}</style>

      {/* Screen banner showing actions */}
      <div className="print-header-banner">
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Praxis Revision Pack Print</h1>
          <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>
            Click the print button if your browser's print dialog did not open automatically.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            background: '#ff5f52',
            border: 'none',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      {/* Revision pages */}
      {problems.map((p, idx) => (
        <article key={p.id} className="print-sheet">
          
          {/* QR Code Container */}
          <div className="qr-section">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(p.problemUrl)}`}
              alt="Scan to open"
              width="80"
              height="80"
            />
            <span className="qr-label">Scan to Open</span>
          </div>

          <div style={{ paddingRight: '120px' }}>
            <h2 className="sheet-title">{idx + 1}. {p.title}</h2>
            
            <div className="meta-row">
              <span className="meta-badge">{p.platform}</span>
              <span className="meta-badge" style={{ color: p.difficulty === 'Hard' ? '#ef4444' : p.difficulty === 'Medium' ? '#f59e0b' : '#22c55e' }}>
                {p.difficulty}
              </span>
              {p.tags.slice(0, 4).map((tag: string) => (
                <span key={tag} style={{ margin: '0 2px' }}>#{tag}</span>
              ))}
            </div>
          </div>

          {/* Personal Notes */}
          {p.personalNotes && (
            <div className="section-block">
              <h3 className="section-title">Personal Notes</h3>
              <div className="notes-content">{p.personalNotes}</div>
            </div>
          )}

          {/* AI Cheatsheet */}
          {p.cheatsheet && (
            <div className="section-block">
              <h3 className="section-title">AI Revision Cheatsheet</h3>
              <div className="editorial-content">
                <strong>Target Concept:</strong> {p.cheatsheet.conceptSummary || p.cheatsheet.overview || 'Standard spaced repetition check.'}
                {p.cheatsheet.coreLogic && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Core Steps:</strong>
                    <p style={{ margin: '4px 0 0 0' }}>{p.cheatsheet.coreLogic}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Editorial Analysis */}
          {p.editorial && (
            <div className="section-block">
              <h3 className="section-title">AI Failure Analysis</h3>
              <div className="editorial-content" style={{ whiteSpace: 'pre-wrap' }}>
                {p.editorial}
              </div>
            </div>
          )}

          {/* Previous Solution */}
          {p.previousSolution && (
            <div className="section-block" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="section-title">Previous Accepted Solution</h3>
              <pre className="code-content">{p.previousSolution}</pre>
            </div>
          )}

          {/* Blank Writing Space */}
          {p.includeBlankSpace && (
            <div className="section-block" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="section-title">Dotted Scratch Space</h3>
              <div className="blank-lines">
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
              </div>
            </div>
          )}

        </article>
      ))}
    </div>
  );
}
