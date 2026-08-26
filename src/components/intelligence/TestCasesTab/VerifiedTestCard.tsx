'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Zap, XCircle } from 'lucide-react';
import type { VerifiedTestCase } from '@/lib/intelligence/types';
import { formatOutput } from '@/lib/intelligence/execution/execution-normalizer';

interface VerifiedTestCardProps {
  testCase: VerifiedTestCase;
}

export const VerifiedTestCard: React.FC<VerifiedTestCardProps> = ({ testCase }) => {
  const isWrongAnswer = testCase.verdict === 'WRONG_ANSWER';
  const isTimeout = testCase.verdict === 'TIME_LIMIT_EXCEEDED';
  const isRuntimeError = testCase.verdict === 'RUNTIME_ERROR';
  const isDefect = isWrongAnswer || isTimeout || isRuntimeError || testCase.result === 'EXPOSED_ISSUE';

  return (
    <div
      className={`border rounded-xl p-4 transition-all ${
        isDefect
          ? 'bg-[#181116] border-rose-500/30 shadow-lg shadow-rose-950/20'
          : 'bg-[#12141a] border-[#232733]'
      }`}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-sky-400">{testCase.id}</span>
          <span className="text-xs text-[#8b949e]">•</span>
          <span className="text-xs font-semibold text-[#e6edf3]">{testCase.objective}</span>
          {testCase.minimalProof?.isMinimized && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Minimal Proof ({testCase.minimalProof.reductionSteps} steps)
            </span>
          )}
        </div>

        <div>
          {isWrongAnswer && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold tracking-wide uppercase">
              <AlertTriangle className="w-3.5 h-3.5" /> Wrong Answer
            </span>
          )}
          {isTimeout && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold tracking-wide uppercase">
              <Clock className="w-3.5 h-3.5" /> Time Limit Exceeded
            </span>
          )}
          {isRuntimeError && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold tracking-wide uppercase">
              <XCircle className="w-3.5 h-3.5" /> Runtime Error
            </span>
          )}
          {!isDefect && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold tracking-wide uppercase">
              <CheckCircle2 className="w-3.5 h-3.5" /> Passed
            </span>
          )}
        </div>
      </div>

      {/* Input / Expected / Output Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0b0c10] border border-[#232733] rounded-lg p-3 text-xs font-mono">
        <div>
          <div className="text-[10px] uppercase font-bold text-[#8b949e] mb-1">Input</div>
          <div className="text-[#e6edf3] break-all">{testCase.normalizedInput}</div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Expected Output (Oracle)</div>
          <div className="text-emerald-300 break-all">{formatOutput(testCase.expectedOutput)}</div>
        </div>

        <div>
          <div className={`text-[10px] uppercase font-bold mb-1 ${isDefect ? 'text-rose-400' : 'text-[#8b949e]'}`}>
            Your Output
          </div>
          <div className={`break-all ${isDefect ? 'text-rose-300 font-bold' : 'text-[#e6edf3]'}`}>
            {formatOutput(testCase.userOutput)}
          </div>
        </div>
      </div>

      {/* Evidence Connection Snippet */}
      {testCase.evidenceConnection && (
        <div className="mt-3 pt-2 border-t border-[#232733]/60 flex items-center justify-between text-[11px] text-[#8b949e]">
          <div>
            <span className="font-semibold text-sky-400">Targeted Logic: </span>
            <span className="font-mono text-[#e6edf3]">Line {testCase.evidenceConnection.lineStart}: {testCase.evidenceConnection.snippet}</span>
          </div>
          <div className="text-[10px]">{testCase.executionTimeMs}ms execution</div>
        </div>
      )}
    </div>
  );
};
