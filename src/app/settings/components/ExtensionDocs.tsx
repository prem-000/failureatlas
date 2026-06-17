'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Search, CheckCircle2, Circle, Download, ExternalLink, 
  ChevronRight, AlertCircle, Info, Lock, Key, Shield, ShieldAlert,
  Terminal, Puzzle, LayoutGrid, CheckSquare, Settings2, Code, Zap,
  Check, Copy, ChevronDown, ChevronUp
} from 'lucide-react';

const SECTIONS = [
  { id: 'overview', title: 'Overview' },
  { id: 'download', title: 'Download Extension' },
  { id: 'install', title: 'Install Extension' },
  { id: 'connect', title: 'Connect to Praxis' },
  { id: 'verify', title: 'Verify Installation' },
  { id: 'troubleshooting', title: 'Troubleshooting' },
  { id: 'faq', title: 'FAQ' },
  { id: 'security', title: 'Security & Permissions' },
  { id: 'updates', title: 'Updates & Versioning' }
];

function DocSection({ id, title, children, hidden }: { id: string, title: string, children: React.ReactNode, hidden?: boolean }) {
  if (hidden) return null;
  return (
    <section id={id} style={{ marginBottom: 60, scrollMarginTop: 100 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f4f4f5', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '1px solid #1f1f1f', paddingBottom: 12 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {children}
      </div>
    </section>
  );
}

function Callout({ type = 'info', title, children }: { type?: 'info' | 'warning' | 'success', title: string, children: React.ReactNode }) {
  const colors = {
    info: { bg: '#082f49', border: '#0284c7', text: '#38bdf8', icon: <Info size={18} /> },
    warning: { bg: '#422006', border: '#ea580c', text: '#fdba74', icon: <AlertCircle size={18} /> },
    success: { bg: '#052e16', border: '#16a34a', text: '#4ade80', icon: <CheckCircle2 size={18} /> }
  };
  const theme = colors[type];

  return (
    <div style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 16 }}>
      <div style={{ color: theme.text, marginTop: 2 }}>{theme.icon}</div>
      <div>
        <div style={{ fontWeight: 600, color: theme.text, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#e4e4e7', lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

function ImageCard({ src, caption }: { src: string, caption: string }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <div 
        onClick={() => setZoomed(true)}
        style={{ 
          background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden', 
          cursor: 'zoom-in', transition: 'border-color 0.2s' 
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3f3f46'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1f1f1f'}
      >
        <div style={{ padding: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={caption} style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }} />
        </div>
        <div style={{ padding: '12px 16px', background: '#161616', borderTop: '1px solid #1f1f1f', fontSize: 13, color: '#a1a1aa', textAlign: 'center' }}>
          {caption}
        </div>
      </div>

      {zoomed && (
        <div 
          onClick={() => setZoomed(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', 
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 40
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={caption} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
      <button 
        onClick={copy}
        style={{ position: 'absolute', top: 8, right: 8, background: '#1f1f1f', border: 'none', borderRadius: 6, padding: '6px 8px', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
      >
        {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre style={{ padding: '16px 20px', margin: 0, fontSize: 13, color: '#f4f4f5', fontFamily: 'monospace', overflowX: 'auto' }}>
        {code}
      </pre>
    </div>
  );
}

function Accordion({ title, children }: { title: string, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden', background: '#111111' }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', color: '#f4f4f5', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
      >
        {title}
        {open ? <ChevronUp size={18} color="#71717a" /> : <ChevronDown size={18} color="#71717a" />}
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px 20px', fontSize: 14, color: '#a1a1aa', lineHeight: 1.6, borderTop: '1px solid #1f1f1f', paddingTop: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function ExtensionDocs() {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [progress, setProgress] = useState({
    downloaded: false,
    loaded: false,
    pinned: false,
    connected: false,
    verified: false
  });

  useEffect(() => {
    const saved = localStorage.getItem('fa_ext_progress');
    if (saved) {
      try { setProgress(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('fa_ext_progress', JSON.stringify(progress));
  }, [progress]);

  const toggleProgress = (key: keyof typeof progress) => {
    setProgress(p => ({ ...p, [key]: !p[key] }));
  };

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalSteps = Object.keys(progress).length;

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, { rootMargin: '-100px 0px -60% 0px' });

    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const isMatch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const hasMatches = (sectionId: string) => {
    if (!searchQuery) return true;
    if (isMatch(SECTIONS.find(s => s.id === sectionId)?.title || '')) return true;
    
    // Simple content matching
    const contentMap: Record<string, string> = {
      'overview': 'Praxis Extension captures LeetCode submissions attempt history practice patterns evidence collection learning path updates metadata',
      'download': 'Download Extension ZIP Current Version Manifest V3 Chrome Compatible',
      'install': 'chrome://extensions Developer Mode Load Unpacked pin Praxis extension',
      'connect': 'API Access Copy Extension API Key Connect',
      'verify': 'Verify Installation leetcode.com Submission received Diagnosis generation available',
      'troubleshooting': 'NOT AUTH API key missing detecting syncing invalid Permission',
      'faq': 'stored contests Firefox Edge disable tracking',
      'security': 'activeTab scripting webNavigation HTTPS',
      'updates': 'Release Date Manifest Version Check For Updates'
    };
    
    return isMatch(contentMap[sectionId] || '');
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .ext-docs-container { flex-direction: column !important; gap: 20px !important; }
          .ext-docs-sidebar { width: 100% !important; position: static !important; height: auto !important; max-height: 400px; padding-bottom: 10px !important; border-bottom: 1px solid #1f1f1f; }
        }
      `}</style>
      <div className="ext-docs-container" style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        {/* ─── Left Sidebar ─── */}
        <div className="ext-docs-sidebar" style={{ width: 280, flexShrink: 0, position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 24, height: 'calc(100vh - 120px)', overflowY: 'auto', paddingBottom: 40 }}>
        
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#71717a" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input 
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', background: '#111111', border: '1px solid #1f1f1f', borderRadius: 8, padding: '10px 14px 10px 36px', color: '#f4f4f5', fontSize: 13, outline: 'none' }}
          />
        </div>

        {/* Progress Tracker */}
        <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>Onboarding Progress</span>
            <span style={{ color: completedCount === totalSteps ? '#4ade80' : '#f4f4f5' }}>{completedCount}/{totalSteps}</span>
          </div>
          
          <div style={{ height: 4, background: '#1f1f1f', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(completedCount/totalSteps)*100}%`, background: completedCount === totalSteps ? '#22c55e' : '#ff5f52', transition: 'width 0.4s ease, background 0.4s ease' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'downloaded', label: 'Download Extension' },
              { id: 'loaded', label: 'Load Unpacked' },
              { id: 'pinned', label: 'Pin Extension' },
              { id: 'connected', label: 'Connect Account' },
              { id: 'verified', label: 'Verify Installation' }
            ].map(step => (
              <div 
                key={step.id} 
                onClick={() => toggleProgress(step.id as keyof typeof progress)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: progress[step.id as keyof typeof progress] ? '#71717a' : '#e4e4e7' }}
              >
                {progress[step.id as keyof typeof progress] ? <CheckCircle2 size={16} color="#4ade80" /> : <Circle size={16} color="#3f3f46" />}
                <span style={{ textDecoration: progress[step.id as keyof typeof progress] ? 'line-through' : 'none' }}>{step.label}</span>
              </div>
            ))}
          </div>

          {completedCount === totalSteps && (
            <div style={{ marginTop: 16, padding: '10px 12px', background: '#052e16', border: '1px solid #16a34a', borderRadius: 8, fontSize: 12, color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={14} /> Extension Successfully Configured
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                textAlign: 'left', background: activeSection === s.id ? '#1a1a1a' : 'transparent', border: 'none',
                padding: '8px 12px', borderRadius: 6, fontSize: 14, color: activeSection === s.id ? '#f4f4f5' : '#71717a',
                fontWeight: activeSection === s.id ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s',
                display: hasMatches(s.id) ? 'block' : 'none'
              }}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Right Content ─── */}
      <div style={{ flex: 1, paddingBottom: 100 }}>
        
        <DocSection id="overview" title="Overview" hidden={!hasMatches('overview')}>
          <p style={{ fontSize: 16, color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
            The Praxis Chrome Extension acts as a bridge between your browser and your Praxis account. It monitors your coding sessions and securely syncs your submissions.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 12 }}>
            {[
              { icon: <Code size={20} color="#3b82f6" />, title: 'Automatic Capture', desc: 'Captures LeetCode submissions and attempt history automatically.' },
              { icon: <ShieldAlert size={20} color="#ef4444" />, title: 'Learning Intelligence', desc: 'Extracts exact compile errors, test cases, and logic flaws.' },
              { icon: <LayoutGrid size={20} color="#a855f7" />, title: 'Graph Synchronization', desc: 'Updates your personalized knowledge graph in real-time.' },
              { icon: <Terminal size={20} color="#10b981" />, title: 'Personalized Diagnosis', desc: 'Prepares data for AI-driven learning insight analysis.' }
            ].map((f, i) => (
              <div key={i} style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 20 }}>
                <div style={{ marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#f4f4f5', marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#71717a', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection id="download" title="Download Extension" hidden={!hasMatches('download')}>
          <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Download size={28} color="#f4f4f5" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5', marginBottom: 8 }}>Praxis Extension</h3>
            <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 24, maxWidth: 300 }}>
              Download the latest Praxis Extension package to get started.
            </p>
            <a 
              href="/extension/failureatlas-extension-v1.0.0.zip" 
              download
              onClick={() => toggleProgress('downloaded')}
              style={{ background: '#f4f4f5', color: '#09090b', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Download size={18} />
              Download Extension ZIP
            </a>
            
            <div style={{ display: 'flex', gap: 24, marginTop: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Version</span>
                <span style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500 }}>v1.0.0</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manifest</span>
                <span style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500 }}>V3</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compatibility</span>
                <span style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500 }}>Chrome / Edge</span>
              </div>
            </div>
          </div>
        </DocSection>

        <DocSection id="install" title="Install Extension" hidden={!hasMatches('install')}>
          <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24 }}>Follow these steps to install the unpacked extension in Chrome.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ width: 32, height: 32, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#f4f4f5', flexShrink: 0 }}>1</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, color: '#f4f4f5', marginBottom: 6 }}>Open Extensions Page</h4>
                  <p style={{ fontSize: 14, color: '#a1a1aa', margin: 0 }}>Open a new tab and navigate to the Chrome extensions page.</p>
                </div>
                <CodeBlock code="chrome://extensions" />
                <ImageCard src="/extension/pics/1st.png" caption="Navigate to chrome://extensions" />
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ width: 32, height: 32, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#f4f4f5', flexShrink: 0 }}>2</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, color: '#f4f4f5', marginBottom: 6 }}>Enable Developer Mode</h4>
                  <p style={{ fontSize: 14, color: '#a1a1aa', margin: 0 }}>Toggle the <strong>Developer mode</strong> switch in the top right corner.</p>
                </div>
                <ImageCard src="/extension/pics/2nd.png" caption="Enable Developer mode toggle" />
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ width: 32, height: 32, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#f4f4f5', flexShrink: 0 }}>3</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, color: '#f4f4f5', marginBottom: 6 }}>Load Unpacked</h4>
                  <p style={{ fontSize: 14, color: '#a1a1aa', margin: 0 }}>Click the <strong>Load unpacked</strong> button that appears in the top left.</p>
                </div>
                <ImageCard src="/extension/pics/3rd.png" caption="Click Load unpacked button" />
                <button onClick={() => toggleProgress('loaded')} style={{ alignSelf: 'flex-start', background: progress.loaded ? '#052e16' : '#1a1a1a', border: `1px solid ${progress.loaded ? '#16a34a' : '#2a2a2a'}`, color: progress.loaded ? '#4ade80' : '#a1a1aa', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckSquare size={16} /> Mark as complete
                </button>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ width: 32, height: 32, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#f4f4f5', flexShrink: 0 }}>4</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, color: '#f4f4f5', marginBottom: 6 }}>Select Extension Folder</h4>
                  <p style={{ fontSize: 14, color: '#a1a1aa', margin: 0 }}>Select the extracted folder you downloaded in the first step. The extension card should now appear.</p>
                </div>

              </div>
            </div>

            {/* Step 5 */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ width: 32, height: 32, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#f4f4f5', flexShrink: 0 }}>5</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, color: '#f4f4f5', marginBottom: 6 }}>Pin the Extension</h4>
                  <p style={{ fontSize: 14, color: '#a1a1aa', margin: 0 }}>Click the puzzle icon in your browser toolbar and pin the Praxis extension for easy access.</p>
                </div>

                <button onClick={() => toggleProgress('pinned')} style={{ alignSelf: 'flex-start', background: progress.pinned ? '#052e16' : '#1a1a1a', border: `1px solid ${progress.pinned ? '#16a34a' : '#2a2a2a'}`, color: progress.pinned ? '#4ade80' : '#a1a1aa', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckSquare size={16} /> Mark as complete
                </button>
              </div>
            </div>

          </div>
        </DocSection>

        <DocSection id="connect" title="Connect to Praxis" hidden={!hasMatches('connect')}>
          <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24 }}>Link the extension to your Praxis account using your API key.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 20 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f5', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={18} color="#f59e0b" /> 1. Get your API Key
              </h4>
              <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16 }}>Go to the <strong>API Access</strong> tab in your settings and copy your Extension API Key.</p>
              <CodeBlock code="fa_ex_7a9f8b2c4d..." />
            </div>

            <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 20 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f5', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Puzzle size={18} color="#3b82f6" /> 2. Connect Extension
              </h4>
              <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16 }}>Click the Praxis icon in your browser toolbar, paste your API key, and click Connect.</p>

            </div>

            <Callout type="success" title="Connected successfully">
              Once connected, LeetCode submissions will now sync automatically in the background.
            </Callout>

            <button onClick={() => toggleProgress('connected')} style={{ background: progress.connected ? '#052e16' : '#1a1a1a', border: `1px solid ${progress.connected ? '#16a34a' : '#2a2a2a'}`, color: progress.connected ? '#4ade80' : '#a1a1aa', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
              <CheckSquare size={18} /> {progress.connected ? 'Connection Confirmed' : 'Mark as connected'}
            </button>
          </div>
        </DocSection>

        <DocSection id="verify" title="Verify Installation" hidden={!hasMatches('verify')}>
          <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24 }}>Ensure everything is working correctly by making a test submission.</p>

          <div style={{ border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden', background: '#111111' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f1f1f' }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f5', margin: 0 }}>Verification Checklist</h4>
            </div>
            <div style={{ padding: '12px 24px' }}>
              {[
                'Visit leetcode.com and open any problem.',
                'Open the Praxis extension popup.',
                'Verify the status says "Connected" and "Monitoring active".',
                'Submit code on LeetCode (even if it fails).',
                'Confirm the extension shows "Submission received".',
                'Check your Praxis dashboard for the new submission.'
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: i === 5 ? 'none' : '1px solid #1a1a1a' }}>
                  <div style={{ color: '#3b82f6', marginTop: 2 }}><Circle size={16} /></div>
                  <span style={{ fontSize: 14, color: '#e4e4e7' }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', background: '#161616', borderTop: '1px solid #1f1f1f' }}>
              <button onClick={() => toggleProgress('verified')} style={{ background: progress.verified ? '#052e16' : '#f4f4f5', border: `1px solid ${progress.verified ? '#16a34a' : 'transparent'}`, color: progress.verified ? '#4ade80' : '#09090b', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {progress.verified ? <CheckCircle2 size={18} /> : <CheckSquare size={18} />}
                {progress.verified ? 'Verification Complete' : 'Verify Installation'}
              </button>
            </div>
          </div>
        </DocSection>

        <DocSection id="troubleshooting" title="Troubleshooting" hidden={!hasMatches('troubleshooting')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Accordion title="Extension says NOT AUTH">
              <p><strong>Cause:</strong> The API key is missing or invalid in the extension.</p>
              <p style={{ marginBottom: 0 }}><strong>Fix:</strong> Generate a new API key in the API Access tab, open the extension popup, and click Disconnect, then paste the new key.</p>
            </Accordion>
            
            <Accordion title="Extension not detecting LeetCode">
              <p><strong>Cause:</strong> Extension might be disabled or not have permission to read leetcode.com.</p>
              <p style={{ marginBottom: 0 }}><strong>Fix:</strong> Go to chrome://extensions, ensure the toggle is ON, and try reloading the page. Right-click the extension icon and ensure it can read data on leetcode.com.</p>
            </Accordion>

            <Accordion title="Submission not syncing">
              <p><strong>Cause:</strong> The Praxis backend might be unavailable or network issues occurred.</p>
              <p style={{ marginBottom: 0 }}><strong>Fix:</strong> Check if you can access the Praxis dashboard. If the server is up, try reloading the extension in chrome://extensions.</p>
            </Accordion>

            <Accordion title="API key invalid">
              <p><strong>Cause:</strong> You may have regenerated your key, causing the old one inside the extension to expire.</p>
              <p style={{ marginBottom: 0 }}><strong>Fix:</strong> Generate a new key and update it in the extension popup.</p>
            </Accordion>
            
            <Accordion title="Permission issue">
              <p><strong>Cause:</strong> LeetCode access was denied during installation.</p>
              <p style={{ marginBottom: 0 }}><strong>Fix:</strong> Open extension details in Chrome and ensure "Site access" is granted for leetcode.com.</p>
            </Accordion>
          </div>
        </DocSection>

        <DocSection id="faq" title="FAQ" hidden={!hasMatches('faq')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Accordion title="Is my code stored securely?">
              Yes. We only store the data strictly required for learning analysis (e.g., compile errors, your code snippet, and the problem ID). Credentials and session cookies are never accessed.
            </Accordion>
            <Accordion title="Does it work on LeetCode contests?">
              Yes, the extension is fully compatible with LeetCode contests and will track your practice sessions in real-time.
            </Accordion>
            <Accordion title="Can I disable tracking temporarily?">
              Yes. You can click the extension icon and click "Disconnect" to pause tracking at any time, or toggle it off in chrome://extensions.
            </Accordion>
            <Accordion title="Does it support Microsoft Edge?">
              Yes. Since Microsoft Edge is built on Chromium, you can install the extension exactly the same way using Developer Mode.
            </Accordion>
            <Accordion title="Does it support Firefox or Safari?">
              Not currently. We are planning a Manifest V2/V3 compliant version for Firefox in the future.
            </Accordion>
          </div>
        </DocSection>

        <DocSection id="security" title="Security & Permissions" hidden={!hasMatches('security')}>
          <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24 }}>We value transparency. Here is exactly why we request certain permissions.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 16 }}>
            <Callout type="info" title="storage">
              Required to securely store your API key locally in the browser so you don't have to enter it every time.
            </Callout>
            <Callout type="info" title="activeTab & scripting">
              Required to detect when you are on a LeetCode problem page and to inject the script that listens for the "Submit" button click.
            </Callout>
            <Callout type="info" title="webNavigation">
              Required to re-initialize the monitoring script when LeetCode performs a client-side navigation (SPA routing) without a full page reload.
            </Callout>
          </div>

          <div style={{ marginTop: 24, padding: 20, background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12 }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f5', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} color="#4ade80" /> Data Privacy Guarantee
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#a1a1aa', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>All communication with Praxis is encrypted via HTTPS.</li>
              <li>We never collect passwords, cookies, or session tokens.</li>
              <li>Your API key is only used for authentication and is sent securely in headers.</li>
              <li>Only submissions made to LeetCode are tracked. No other browsing history is accessed.</li>
            </ul>
          </div>
        </DocSection>

        <DocSection id="updates" title="Updates & Versioning" hidden={!hasMatches('updates')}>
          <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: 18, fontWeight: 600, color: '#f4f4f5', marginBottom: 6 }}>Current Version</h4>
              <div style={{ display: 'flex', gap: 16, fontSize: 14, color: '#a1a1aa' }}>
                <span>v1.0.0</span>
                <span>•</span>
                <span>Released: Oct 2024</span>
                <span>•</span>
                <span>Manifest V3</span>
              </div>
            </div>
            <button style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e4e4e7', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>
              Check For Updates
            </button>
          </div>

          <div style={{ marginTop: 20, border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#161616', padding: '16px 20px', borderBottom: '1px solid #1f1f1f' }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: '#f4f4f5', margin: 0 }}>Release Notes: v1.0.0</h4>
            </div>
            <div style={{ padding: '20px', background: '#111111' }}>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#a1a1aa', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li>Initial release of the Praxis Extension.</li>
                <li>Support for LeetCode submission tracking.</li>
                <li>Secure API Key authentication.</li>
                <li>Manifest V3 compliance.</li>
              </ul>
            </div>
          </div>
        </DocSection>

      </div>
    </div>
    </>
  );
}
