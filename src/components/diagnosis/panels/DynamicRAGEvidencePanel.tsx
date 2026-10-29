'use client';

import React from 'react';
import type { DynamicQueryDiagnosis } from '@/types/diagnosis-v2';
import { ExternalLink, Database, Globe, AlertCircle, Info, CheckCircle2, FolderGit2 } from 'lucide-react';

export interface DynamicRAGEvidencePanelProps {
  diagnosis: DynamicQueryDiagnosis;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: '#34d399',
  Medium: '#fbbf24',
  Hard: '#f87171',
};

const STATUS_COLORS: Record<string, string> = {
  Accepted: '#34d399',
  'Wrong Answer': '#f87171',
  'Time Limit Exceeded': '#fbbf24',
  'Memory Limit Exceeded': '#fbbf24',
  'Runtime Error': '#f43f5e',
  'Compile Error': '#f43f5e',
};

export const DynamicRAGEvidencePanel: React.FC<DynamicRAGEvidencePanelProps> = ({ diagnosis }) => {
  const hasHistorical = diagnosis.historicalEvidence && diagnosis.historicalEvidence.length > 0;
  const hasExternal = Boolean(diagnosis.externalEvidence && diagnosis.externalEvidence.length > 0);
  const hasWeb = diagnosis.webEvidence && diagnosis.webEvidence.length > 0;
  const historyState = diagnosis.historyState;

  return (
    <div className="p-6 flex flex-col gap-6 overflow-y-auto h-full text-xs">
      {/* ── Section 1: Personal Historical Evidence ────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#ff5f52]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f4f4f5]">
              Personal Historical Evidence
            </h3>
          </div>
          {hasHistorical && (
            <span className="text-[11px] font-mono text-[#a1a1aa] bg-[#1e1e24] px-2 py-0.5 rounded border border-[#2e2e38]">
              {diagnosis.historicalEvidence.length} matched case{diagnosis.historicalEvidence.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* State A: Matches Found */}
        {hasHistorical && (
          <div className="flex flex-col gap-3">
            {diagnosis.historicalEvidence.map((item) => {
              const diffColor = DIFFICULTY_COLORS[item.difficulty] || '#a1a1aa';
              const statusColor = STATUS_COLORS[item.status] || '#f87171';

              return (
                <div
                  key={item.id}
                  className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-col gap-2.5 transition-all hover:border-[#3f3f46]"
                >
                  {/* Problem & Metadata */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#f4f4f5] leading-snug">
                          {item.problemTitle}
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ color: diffColor, backgroundColor: `${diffColor}18` }}
                        >
                          {item.difficulty}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#71717a] font-mono">
                        {item.platform} · {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Relevance Score Badge */}
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-mono font-bold text-[#ff5f52]">
                        {item.relevanceScore}% match
                      </span>
                      <div className="w-16 h-1 bg-[#27272a] rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#ff5f52] to-[#ff8a80] rounded-full"
                          style={{ width: `${item.relevanceScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission Status & Verified Topic */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className="px-2 py-0.5 rounded font-mono font-semibold"
                      style={{ color: statusColor, backgroundColor: `${statusColor}18` }}
                    >
                      {item.status}
                    </span>
                    <span className="text-[#a1a1aa]">·</span>
                    <span className="text-[#d4d4d8] font-medium">{item.rootCauseOrPattern}</span>
                  </div>

                  {/* Explicit Explanation of Selection */}
                  <div className="p-3 bg-[#121215] border border-[#222228] rounded-lg text-xs leading-relaxed text-[#a1a1aa]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff5f52] block mb-1">
                      Why Selected:
                    </span>
                    {item.selectionReason}
                  </div>

                  {/* Code snippet if present */}
                  {item.codeSnippet && (
                    <div className="bg-[#101012] p-2.5 rounded border border-[#1f1f23] font-mono text-[11px] text-[#9ca3af] overflow-x-auto">
                      <pre className="m-0 whitespace-pre-wrap">{item.codeSnippet}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* State B: No History Available */}
        {!hasHistorical && historyState === 'no_history' && (
          <div className="p-6 bg-[#161618] border border-[#27272a] rounded-xl flex flex-col items-center justify-center text-center gap-2">
            <Info className="w-6 h-6 text-[#71717a]" />
            <span className="text-sm font-semibold text-[#f4f4f5]">No history available</span>
            <p className="text-xs text-[#a1a1aa] max-w-sm leading-relaxed">
              You haven't submitted any problems yet. Submissions captured via the extension or editor will appear here as diagnostic evidence.
            </p>
          </div>
        )}

        {/* State C: History Exists, But No Relevant Evidence Matched */}
        {!hasHistorical && (historyState === 'no_relevant_evidence' || (!hasHistorical && historyState !== 'no_history' && historyState !== 'not_requested')) && (
          <div className="p-6 bg-[#161618] border border-[#27272a] rounded-xl flex flex-col items-center justify-center text-center gap-2">
            <AlertCircle className="w-6 h-6 text-[#eab308]" />
            <span className="text-sm font-semibold text-[#f4f4f5]">
              No strong matching historical evidence found
            </span>
            <p className="text-xs text-[#a1a1aa] max-w-sm leading-relaxed">
              Your previous submissions were evaluated, but none showed strong verified relevance to this specific topic or constraint.
            </p>
          </div>
        )}

        {/* State D: General Concept Query without personal history requested */}
        {!hasHistorical && historyState === 'not_requested' && (
          <div className="p-5 bg-[#161618] border border-[#27272a] rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs text-[#a1a1aa] leading-relaxed">
              This was answered as a general technical query. Personal historical evidence was not required or attached to keep the answer focused.
            </span>
          </div>
        )}
      </div>

      {/* ── Section 2: External GitHub & CSV Knowledge Evidence ─────────────── */}
      {hasExternal && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#38bdf8]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#f4f4f5]">
                External GitHub & CSV Evidence
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded border border-[#38bdf8]/30">
              pgvector & normalized datasets ({diagnosis.externalEvidence!.length})
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {diagnosis.externalEvidence!.map((ext) => {
              const diffColor = DIFFICULTY_COLORS[ext.difficulty] || '#a1a1aa';

              return (
                <div
                  key={ext.id}
                  className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-col gap-2.5 transition-all hover:border-[#38bdf8]/50"
                >
                  {/* Title & Match Score */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#f4f4f5] leading-snug">
                          {ext.problemTitle}
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ color: diffColor, backgroundColor: `${diffColor}18` }}
                        >
                          {ext.difficulty}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#71717a] font-mono">
                        {ext.repository} · {ext.filePath}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs font-mono font-bold text-[#38bdf8]">
                        {ext.relevanceScore}% match
                      </span>
                      <span className="text-[9px] font-mono text-[#71717a] uppercase mt-0.5">
                        {ext.retrievalPath}
                      </span>
                    </div>
                  </div>

                  {/* Topics and Companies */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {ext.companies.map((comp, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/30 flex items-center gap-1"
                        title={ext.isCompanyVerified ? 'Verified official source' : 'Community-reported interview dataset tag'}
                      >
                        <span>{comp}</span>
                        <span className="text-[9px] opacity-75">
                          {ext.isCompanyVerified ? '✓' : '(Community)'}
                        </span>
                      </span>
                    ))}
                    {ext.topics.map((t, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded text-[10px] bg-[#1e1e24] text-[#a1a1aa] border border-[#2e2e38]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Snippet */}
                  <p className="text-xs text-[#d4d4d8] leading-relaxed line-clamp-3 m-0 bg-[#121214] p-2.5 rounded-lg border border-[#1f1f23] font-mono text-[11px]">
                    {ext.contentSnippet}
                  </p>

                  {/* Source Provenance Link */}
                  <div className="pt-2 border-t border-[#222228] flex items-center justify-between text-[11px]">
                    <span className="text-[#71717a] font-mono text-[10px]">
                      Provenance: {ext.repository}
                    </span>
                    <a
                      href={ext.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#38bdf8] font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>View Original Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 3: Validated Web Sources ───────────────────────────────────── */}
      {hasWeb && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#38bdf8]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#f4f4f5]">
                Validated External Technical Research
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded border border-[#38bdf8]/30">
              DuckDuckGo & Playwright
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {diagnosis.webEvidence.map((web) => (
              <a
                key={web.id}
                href={web.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#18181b] border border-[#27272a] hover:border-[#38bdf8]/50 rounded-xl p-3.5 flex flex-col gap-1.5 transition-all text-inherit no-underline group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-[#f4f4f5] group-hover:text-[#38bdf8] transition-colors leading-snug">
                    {web.title}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#38bdf8] shrink-0" />
                </div>
                <span className="text-[10px] font-mono text-[#38bdf8]">{web.domain}</span>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed line-clamp-2 m-0">
                  {web.extractedFact || web.snippet}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
