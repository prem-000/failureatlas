import React, { useState } from 'react';
import type { DynamicQueryDiagnosis } from '@/types/diagnosis-v2';
import { getAuthToken } from '@/lib/api/client';
import {
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Lightbulb,
  Zap,
  GraduationCap,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { DynamicGraphPanel } from './DynamicGraphPanel';

export interface DynamicExplanationPanelProps {
  diagnosis: DynamicQueryDiagnosis;
}

export const DynamicExplanationPanel: React.FC<DynamicExplanationPanelProps> = ({ diagnosis }) => {
  const [feedbackSent, setFeedbackSent] = useState<'helpful' | 'unhelpful' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFeedback = async (helpful: boolean) => {
    if (feedbackSent || submitting) return;
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      await fetch('/api/diagnosis/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          diagnosisId: `diag_${Date.now()}`,
          query: diagnosis.query,
          helpful,
          usefulEvidence: diagnosis.historicalEvidence?.map((h) => h.id) || [],
        }),
      });
      setFeedbackSent(helpful ? 'helpful' : 'unhelpful');
    } catch {
      // non-fatal
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-5 overflow-y-auto h-full text-xs">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#ff5f52] shadow-[0_0_8px_#ff5f52]" />
          <h2 className="text-base font-bold text-[#f4f4f5] tracking-tight">{diagnosis.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {diagnosis.inferredSkill && (
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 border"
              style={{
                backgroundColor: diagnosis.inferredSkill.isProvisional ? '#27272a' : '#1e1b4b',
                color: diagnosis.inferredSkill.isProvisional ? '#a1a1aa' : '#818cf8',
                borderColor: diagnosis.inferredSkill.isProvisional ? '#3f3f46' : '#6366f1',
              }}
              title={diagnosis.inferredSkill.rationale}
            >
              <GraduationCap className="w-3 h-3" />
              <span>{diagnosis.inferredSkill.level}</span>
            </span>
          )}
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] uppercase border border-[#3f3f46]">
            {diagnosis.route.replace('_', ' ')}
          </span>
          <span className="text-[11px] font-mono font-bold text-[#ff5f52] px-2 py-0.5 rounded bg-[#ff5f52]/10 border border-[#ff5f52]/30">
            {diagnosis.confidence}% Confidence
          </span>
        </div>
      </div>

      {/* Key Concepts Tags */}
      {diagnosis.keyConcepts?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider mr-1">Concepts:</span>
          {diagnosis.keyConcepts.map((concept, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-full bg-[#1e1e24] border border-[#2e2e38] text-[11px] text-[#d4d4d8]"
            >
              {concept}
            </span>
          ))}
        </div>
      )}

      {/* Main AI Explanation Paragraph (8-10 lines, ~90-140 words) */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#ff5f52] mb-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[#ff5f52]" />
          <span>Core Technical Explanation</span>
        </div>
        <p className="text-sm text-[#e4e4e7] leading-[1.75] whitespace-pre-line font-normal">
          {diagnosis.explanation}
        </p>
      </div>

      {/* Complexity Analysis Card */}
      {diagnosis.complexityAnalysis && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] flex items-center gap-1.5">
            <span>Complexity Justification</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-[#0f172a] border border-[#1e293b] text-xs font-mono font-bold text-[#38bdf8]">
              Time: {diagnosis.complexityAnalysis.time}
            </span>
            <span className="px-2.5 py-1 rounded bg-[#0f172a] border border-[#1e293b] text-xs font-mono font-bold text-[#38bdf8]">
              Space: {diagnosis.complexityAnalysis.space}
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] leading-relaxed mt-1">
            {diagnosis.complexityAnalysis.explanation}
          </p>
        </div>
      )}

      {/* Plausible Edge Cases / Test Cases */}
      {diagnosis.suggestedTestCases && diagnosis.suggestedTestCases.length > 0 && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-col gap-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#eab308] flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-[#eab308]" />
            <span>Plausible Edge Test Cases (Derived from Constraints)</span>
          </div>
          <div className="flex flex-col gap-2">
            {diagnosis.suggestedTestCases.map((tc, idx) => (
              <div key={idx} className="p-3 bg-[#131316] border border-[#222228] rounded-lg">
                <div className="font-mono text-[11px] text-[#f4f4f5] mb-1 font-semibold">{tc.input}</div>
                <div className="flex items-baseline gap-2 text-[11px]">
                  <span className="text-[#a1a1aa]">Expected:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{tc.expected}</span>
                </div>
                <p className="text-[11px] text-[#71717a] mt-1.5 leading-normal">{tc.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corrective Guidance */}
      {diagnosis.correctiveGuidance && (
        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Actionable Rule</span>
            <p className="text-xs leading-relaxed text-[#d1fae5]">{diagnosis.correctiveGuidance}</p>
          </div>
        </div>
      )}

      {/* Dynamic Diagram / Algorithm Flowchart */}
      {diagnosis.diagram && (
        <div className="flex flex-col gap-2">
          <DynamicGraphPanel diagram={diagnosis.diagram} />
        </div>
      )}

      {/* Practice Recommendations from Verified DSA Knowledge */}
      {diagnosis.practiceRecommendations && diagnosis.practiceRecommendations.length > 0 && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-col gap-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Targeted Practice Recommendations</span>
          </div>
          <div className="flex flex-col gap-2">
            {diagnosis.practiceRecommendations.map((rec, idx) => (
              <a
                key={idx}
                href={rec.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-[#131316] border border-[#222228] hover:border-[#38bdf8]/50 rounded-lg flex items-center justify-between text-inherit no-underline transition-all group"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#f4f4f5] group-hover:text-[#38bdf8] transition-colors">
                      {rec.problemTitle}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-[#27272a] text-[#a1a1aa]">
                      {rec.difficulty}
                    </span>
                    {rec.company && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/30">
                        {rec.company}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#71717a]">{rec.reason}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#38bdf8] shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Uncertainty Notice if retrieval was limited or community reported */}
      {diagnosis.uncertaintyNotice && (
        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Grounding Transparency</span>
            <p className="text-[11px] leading-relaxed text-[#fef3c7]">{diagnosis.uncertaintyNotice}</p>
          </div>
        </div>
      )}

      {/* Web Evidence Indicator */}
      {diagnosis.webEvidence && diagnosis.webEvidence.length > 0 && (
        <div className="p-3 bg-[#131316] border border-[#27272a] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="text-[11px] text-[#a1a1aa]">
              Validated against {diagnosis.webEvidence.length} external authoritative source{diagnosis.webEvidence.length > 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-[10px] text-[#71717a] font-mono">
            {diagnosis.webEvidence.map((w) => w.domain).slice(0, 2).join(', ')}
          </span>
        </div>
      )}

      {/* Grounding & Verification Metadata */}
      <div className="pt-2 border-t border-[#1f1f23] flex items-center justify-between text-[#71717a]">
        <div className="flex items-center gap-1.5 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {diagnosis.validationMetadata?.correctionsApplied && diagnosis.validationMetadata.correctionsApplied > 0
              ? `Self-Corrected (${diagnosis.validationMetadata.correctionsApplied} iterations)`
              : 'Grounded & Factually Verified'}
          </span>
        </div>

        {/* Feedback buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] mr-1">Was this helpful?</span>
          <button
            onClick={() => handleFeedback(true)}
            disabled={submitting || !!feedbackSent}
            className={`p-1.5 rounded hover:bg-[#27272a] transition-colors border border-transparent ${
              feedbackSent === 'helpful' ? 'text-emerald-400 border-emerald-800' : 'text-[#a1a1aa]'
            }`}
            title="Helpful"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleFeedback(false)}
            disabled={submitting || !!feedbackSent}
            className={`p-1.5 rounded hover:bg-[#27272a] transition-colors border border-transparent ${
              feedbackSent === 'unhelpful' ? 'text-rose-400 border-rose-800' : 'text-[#a1a1aa]'
            }`}
            title="Not helpful / needs improvement"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
