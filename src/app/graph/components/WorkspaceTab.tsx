'use client';

import { useState, useEffect } from 'react';
import { BookOpen, AlertTriangle, Clock, Bookmark, FileText, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { useGraphWeaknesses, useGraphFailures } from '@/hooks/usePhase3Queries';

// ─── Types ───────────────────────────────────────────────────────────────────
type WorkspaceSection = 'notes' | 'cheatsheets' | 'journal' | 'bookmarks';

interface NoteEntry {
  id: string;
  title: string;
  content: string;
  tag: string;
  createdAt: string;
}

// ─── Cheat Sheet Data ─────────────────────────────────────────────────────────
import { useDynamicTopics, useDynamicCheatSheet } from '@/hooks/usePhase3Queries';
import { Loader2 } from 'lucide-react';

const DEFAULT_TOPICS = ['Binary Search', 'Sliding Window', 'Dynamic Programming', 'Graphs'];

function getTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Code block with copy ─────────────────────────────────────────────────────
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: '10px', color: '#52525b', fontWeight: 700 }}>Python</span>
        <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: copied ? '#22c55e' : '#52525b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', fontWeight: 700 }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '12px 14px', fontSize: '11px', lineHeight: 1.6, color: '#a1a1aa', fontFamily: "'Fira Code', 'Consolas', monospace", background: 'rgba(0,0,0,0.4)', overflowX: 'auto' }}>
        {code}
      </pre>
    </div>
  );
}

// ─── Main Workspace Tab ───────────────────────────────────────────────────────
export function WorkspaceTab() {
  const [section, setSection] = useState<WorkspaceSection>('notes');
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTag, setNoteTag] = useState('general');
  const [selectedSheet, setSelectedSheet] = useState<string>('Binary Search');
  const [expandedMistake, setExpandedMistake] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  const { data: weaknesses } = useGraphWeaknesses(10);
  const { data: failures } = useGraphFailures(50, 60);
  const { data: dynamicTopics } = useDynamicTopics();
  const { data: sheet, isLoading: sheetLoading } = useDynamicCheatSheet(selectedSheet);

  const topicOptions = dynamicTopics ? dynamicTopics.map(t => t.label) : DEFAULT_TOPICS;

  useEffect(() => {
    if (topicOptions.length > 0 && selectedSheet === 'Binary Search' && !DEFAULT_TOPICS.includes('Binary Search')) {
      setSelectedSheet(topicOptions[0]);
    }
  }, [topicOptions, selectedSheet]);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fa_notes');
      if (saved) setNotes(JSON.parse(saved));
      const savedBM = localStorage.getItem('fa_bookmarks');
      if (savedBM) setBookmarks(JSON.parse(savedBM));
    } catch {}
  }, []);

  const saveNote = () => {
    if (!noteTitle.trim()) return;
    const entry: NoteEntry = {
      id: crypto.randomUUID(),
      title: noteTitle,
      content: noteContent,
      tag: noteTag,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...notes];
    setNotes(updated);
    localStorage.setItem('fa_notes', JSON.stringify(updated));
    setNoteTitle(''); setNoteContent('');
    setSelectedNote(entry);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem('fa_notes', JSON.stringify(updated));
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  // AI-generated note from weakness data
  const generateAINote = () => {
    const top = weaknesses?.[0];
    const topFailure = failures?.[0];
    if (!top) return;
    const title = `AI Note: ${top.name}`;
    const content = `## Most Frequent Growth Area
**${top.name}**
PageRank: ${top.pageRankScore.toFixed(3)} · Occurrences: ${top.frequency}

## Description
${top.description}

## Most Recent Session
${topFailure ? `**${topFailure.problemTitle}** (${topFailure.difficulty}) — ${topFailure.status}` : 'No recent sessions'}

## Learning Insight
${topFailure?.rootCause || 'Unknown'}

## Recommended Action
Practice problems targeting ${top.name.toLowerCase()} to reduce PageRank score.`;

    const entry: NoteEntry = {
      id: crypto.randomUUID(),
      title,
      content,
      tag: 'ai-generated',
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...notes];
    setNotes(updated);
    localStorage.setItem('fa_notes', JSON.stringify(updated));
    setSelectedNote(entry);
    setSection('notes');
  };

  // Mistake Journal auto-generate
  const journalEntries = (failures || []).slice(0, 20).map(f => ({
    date: new Date(f.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    problem: f.problemTitle,
    difficulty: f.difficulty,
    status: f.status,
    rootCause: f.rootCause,
    timeAgo: getTimeAgo(f.timestamp),
  }));

  const DIFF_COLORS: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };

  return (
    <div className="ws-root" style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      <style>{`
        .ws-nav { width: 180px; border-right: 1px solid rgba(255,255,255,0.05); background: rgba(10,10,12,0.9); display: flex; flex-direction: column; flex-shrink: 0; padding: 16px 10px; gap: 4px; }
        .ws-nav-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px; border: none; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 150ms; text-align: left; width: 100%; }
        .ws-nav-item.active { background: rgba(255,95,82,0.1); color: #ff5f52; }
        .ws-nav-item:not(.active) { color: #52525b; }
        .ws-nav-item:not(.active):hover { color: #a1a1aa; background: rgba(255,255,255,0.04); }
        .ws-content { flex: 1; overflow-y: auto; padding: 20px; }
        .note-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 150ms; margin-bottom: 8px; }
        .note-card:hover, .note-card.selected { background: rgba(255,95,82,0.06); border-color: rgba(255,95,82,0.2); }
        .input-field { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 9px; padding: 9px 12px; color: #e4e4e7; font-size: 12px; outline: none; font-family: inherit; transition: border-color 150ms; resize: vertical; }
        .input-field:focus { border-color: rgba(255,95,82,0.4); }
        .save-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 9px; border: none; background: linear-gradient(135deg, #ff5f52, #d32f2f); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
        .cs-chip { padding: 5px 12px; border-radius: 8px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 150ms; white-space: nowrap; }
        .cs-chip-active { background: rgba(59,130,246,0.15); color: #93c5fd; border: 1px solid rgba(59,130,246,0.3); }
        .cs-chip-inactive { background: rgba(255,255,255,0.03); color: #52525b; border: 1px solid rgba(255,255,255,0.05); }
        .cs-chip-inactive:hover { color: #a1a1aa; background: rgba(255,255,255,0.05); }
        .journal-entry { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .journal-date { font-size: '11px'; font-weight: 700; color: '#71717a'; min-width: 50px; }
        @media (max-width: 767px) {
          .ws-root {
            flex-direction: column !important;
          }
          .ws-nav {
            width: 100% !important;
            height: auto !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.05) !important;
            padding: 8px 12px !important;
            gap: 8px !important;
            scrollbar-width: none !important;
            ms-overflow-style: none !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .ws-nav::-webkit-scrollbar {
            display: none !important;
          }
          .ws-nav-header {
            display: none !important;
          }
          .ws-nav-item {
            width: auto !important;
            flex-shrink: 0 !important;
            padding: 6px 12px !important;
            min-height: 44px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .ws-nav-ai-btn {
            margin-top: 0 !important;
            margin-left: auto !important;
            flex-shrink: 0 !important;
            min-height: 44px !important;
          }
          .ws-content {
            padding: 12px !important;
          }
          .notes-layout {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .notes-list-pane {
            width: 100% !important;
            max-height: 200px !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.05) !important;
            flex-shrink: 0 !important;
          }
          .cs-chip-container {
            flex-wrap: nowrap !important;
            scrollbar-width: none !important;
            ms-overflow-style: none !important;
          }
          .cs-chip-container::-webkit-scrollbar {
            display: none !important;
          }
          .cs-chip {
            min-height: 36px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .input-field {
            font-size: 16px !important;
          }
        }
      `}</style>
 
      {/* Sidebar nav */}
      <nav className="ws-nav">
        <div className="ws-nav-header" style={{ fontSize: '10px', color: '#3f3f46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 12px', marginBottom: 4 }}>Workspace</div>
        {[
          { id: 'notes' as WorkspaceSection, label: 'AI Notes', icon: FileText },
          { id: 'cheatsheets' as WorkspaceSection, label: 'Cheat Sheets', icon: BookOpen },
          { id: 'journal' as WorkspaceSection, label: 'Practice Journal', icon: Clock },
          { id: 'bookmarks' as WorkspaceSection, label: 'Bookmarks', icon: Bookmark },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`ws-nav-item${section === id ? ' active' : ''}`}
            onClick={() => setSection(id)}
          >
            <Icon size={14} strokeWidth={section === id ? 2.2 : 1.8} />
            {label}
          </button>
        ))}
 
        {/* AI generate note */}
        {weaknesses && weaknesses.length > 0 && (
          <button
            onClick={generateAINote}
            className="ws-nav-ai-btn"
            style={{
              marginTop: 'auto',
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
              borderRadius: 9, border: '1px solid rgba(168,85,247,0.25)',
              background: 'rgba(168,85,247,0.08)', color: '#d8b4fe',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            ✨ Generate AI Note
          </button>
        )}
      </nav>
 
      {/* ── NOTES ─────────────────────────────────────────────────────────── */}
      {section === 'notes' && (
        <div className="notes-layout" style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
          {/* Note list */}
          <div className="custom-scrollbar notes-list-pane" style={{ width: 220, borderRight: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto', padding: 12 }}>
            <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              {notes.length} Note{notes.length !== 1 ? 's' : ''}
            </div>
            {notes.length === 0 && (
              <div style={{ color: '#3f3f46', fontSize: 12, textAlign: 'center', marginTop: 40 }}>No notes yet</div>
            )}
            {notes.map(n => (
              <div
                key={n.id}
                className={`note-card${selectedNote?.id === n.id ? ' selected' : ''}`}
                onClick={() => setSelectedNote(n)}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', color: n.tag === 'ai-generated' ? '#a855f7' : '#52525b', fontWeight: 600 }}>#{n.tag}</span>
                  <span style={{ fontSize: '10px', color: '#3f3f46' }}>{getTimeAgo(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Note editor / viewer */}
          <div className="ws-content custom-scrollbar">
            {selectedNote ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f5', margin: '0 0 4px' }}>{selectedNote.title}</h2>
                    <span style={{ fontSize: '10px', color: '#52525b' }}>#{selectedNote.tag} · {getTimeAgo(selectedNote.createdAt)}</span>
                  </div>
                  <button onClick={() => deleteNote(selectedNote.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#f87171', fontSize: '11px', fontWeight: 700, padding: '5px 10px', cursor: 'pointer' }}>Delete</button>
                </div>
                <pre style={{ fontFamily: 'inherit', fontSize: '13px', color: '#a1a1aa', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedNote.content}
                </pre>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f4f4f5', marginBottom: 16 }}>New Note</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className="input-field" placeholder="Note title..." value={noteTitle} onChange={e => setNoteTitle(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '9px 12px', color: '#e4e4e7', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                  <select className="input-field" value={noteTag} onChange={e => setNoteTag(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '9px 12px', color: '#e4e4e7', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="general">general</option>
                    <option value="growth-area">growth area</option>
                    <option value="problem">problem</option>
                    <option value="revision">revision</option>
                    <option value="insight">insight</option>
                  </select>
                  <textarea className="input-field" placeholder="Write your note..." value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={10} />
                  <button className="save-btn" onClick={saveNote}>Save Note</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHEAT SHEETS ──────────────────────────────────────────────────── */}
      {section === 'cheatsheets' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Topic chips */}
          <div className="cs-chip-container" style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, overflowX: 'auto', flexWrap: 'wrap' }}>
            {topicOptions.map(t => (
              <button key={t} className={`cs-chip${t === selectedSheet ? ' cs-chip-active' : ' cs-chip-inactive'}`} onClick={() => setSelectedSheet(t)}>{t}</button>
            ))}
          </div>

          {sheetLoading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={32} style={{ color: '#ff5f52', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
              <div style={{ color: '#d4d4d8', fontSize: 16, fontWeight: 700 }}>Generating Cheat Sheet</div>
              <div style={{ color: '#71717a', fontSize: 12, marginTop: 8 }}>Tailoring insights to your growth areas...</div>
            </div>
          ) : sheet ? (
            <div className="ws-content custom-scrollbar">
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#f4f4f5', marginBottom: 6 }}>{selectedSheet}</h2>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <span style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', color: '#86efac', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(34,197,94,0.2)' }}>⏱ {sheet.complexity?.time || 'O(?)'}</span>
                <span style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: '#93c5fd', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(59,130,246,0.2)' }}>💾 {sheet.complexity?.space || 'O(?)'}</span>
              </div>

              {/* Template */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Template</div>
                <CodeBlock code={sheet.template || '# No template generated'} />
              </div>

              {/* Key Insights */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Key Insights</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(sheet.keyInsights || []).map((insight: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                      <span style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.5 }}>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Mistakes */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Targeted Common Mistakes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(sheet.mistakes || []).map((m: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                      <AlertTriangle size={12} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: '12px', color: '#fca5a5', lineHeight: 1.5 }}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 13 }}>
                Failed to generate cheat sheet
             </div>
          )}
        </div>
      )}

      {/* ── MISTAKE JOURNAL ────────────────────────────────────────────────── */}
      {section === 'journal' && (
        <div className="ws-content custom-scrollbar">
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f5', marginBottom: 4 }}>Practice Journal</h2>
          <p style={{ fontSize: '12px', color: '#71717a', marginBottom: 20 }}>Auto-generated from your practice history.</p>
          {journalEntries.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#52525b', fontSize: 13, marginTop: 40 }}>No practice history yet. Submit some solutions first.</div>
          ) : (
            <div>
              {journalEntries.map((e, i) => (
                <div key={i} className="journal-entry">
                  <div style={{ minWidth: 55, fontSize: '11px', fontWeight: 700, color: '#52525b', paddingTop: 2 }}>{e.date}</div>
                  <div style={{ width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#f4f4f5' }}>{e.problem}</span>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: DIFF_COLORS[e.difficulty] || '#71717a', background: `${DIFF_COLORS[e.difficulty] || '#71717a'}15`, border: `1px solid ${DIFF_COLORS[e.difficulty] || '#71717a'}30`, padding: '2px 7px', borderRadius: 6 }}>{e.difficulty}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 700 }}>{e.status}</span>
                      {e.rootCause !== 'Unknown Root Cause' && (
                        <>
                          <span style={{ width: 1, height: 10, background: '#27272a' }} />
                          <span style={{ fontSize: '11px', color: '#71717a' }}>{e.rootCause}</span>
                        </>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#3f3f46' }}>{e.timeAgo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BOOKMARKS ─────────────────────────────────────────────────────── */}
      {section === 'bookmarks' && (
        <div className="ws-content custom-scrollbar">
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f5', marginBottom: 4 }}>Bookmarks</h2>
          <p style={{ fontSize: '12px', color: '#71717a', marginBottom: 20 }}>Problems and resources you've saved.</p>
          {bookmarks.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#52525b', fontSize: 13, marginTop: 40 }}>
              <Bookmark size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
              <p>No bookmarks yet.<br />Click the bookmark icon on any problem drawer to save it here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bookmarks.map(b => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Bookmark size={13} style={{ color: '#f59e0b' }} />
                  <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#d4d4d8' }}>{b}</span>
                  <a href={`https://leetcode.com/problems/${b}/`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Open ↗</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
