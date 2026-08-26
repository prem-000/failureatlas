'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Target,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type { PraxisReport } from '@/lib/intelligence/types';
import type { AnalysisCategory } from '@/lib/intelligence/analysis/evidence-engine';
import { SubmissionAnalysisCard } from './Header/SubmissionAnalysisCard';
import { OverallHealthCard } from './Header/OverallHealthCard';
import { OverviewTab } from './OverviewTab';
import { EvidenceTab } from './EvidenceTab/EvidenceTab';
import { TestCasesTab } from './TestCasesTab/TestCasesTab';
import { InsightsTab } from './InsightsTab/InsightsTab';

export type IntelligenceTab = 'overview' | 'evidence' | 'test_cases' | 'insights';

interface FailureIntelligenceViewProps {
  submissionId: string;
  problemSlug: string;
  problemTitle?: string;
  initialReport?: PraxisReport | null;
  status?: string;
}

export const FailureIntelligenceView: React.FC<FailureIntelligenceViewProps> = ({
  submissionId,
  problemSlug,
  problemTitle = 'Problem Analysis',
  initialReport = null,
  status = 'Wrong Answer',
}) => {
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('overview');
  const [selectedCategory, setSelectedCategory] = useState<AnalysisCategory | null>(null);
  const [report, setReport] = useState<PraxisReport | null>(initialReport);
  const [loading, setLoading] = useState<boolean>(!initialReport);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/behavior-insights/generate-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          problemSlug,
          submissionId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to generate Failure Intelligence Report');
      }

      setReport(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown analysis error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialReport) {
      fetchAnalysis();
    }
  }, [submissionId, problemSlug]);

  const handleSelectCategory = (category: AnalysisCategory) => {
    setSelectedCategory(category);
    setActiveTab('evidence');
  };

  if (loading) {
    return (
      <div className="bg-[#0e1117] border border-[#232733] rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        <div className="text-sm font-semibold text-[#e6edf3]">
          Running Failure Intelligence Pipeline...
        </div>
        <p className="text-xs text-[#8b949e] max-w-md">
          Resolving Canonical Problem Contract, executing deterministic pattern detectors, and verifying candidate inputs against the independent reference oracle.
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-[#0e1117] border border-rose-500/30 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <div className="text-sm font-bold text-[#e6edf3]">
          Failure Intelligence Analysis Unavailable
        </div>
        <p className="text-xs text-[#8b949e]">{error || 'Could not load analysis report.'}</p>
        <button
          onClick={fetchAnalysis}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0e1117] border border-[#232733] rounded-2xl p-6 space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <SubmissionAnalysisCard report={report} status={status} />
        <OverallHealthCard score={report.overallHealthScore} />
      </div>

      {/* 2. Clean Single-Level Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#232733] pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('overview');
              setSelectedCategory(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'overview'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'evidence'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            Evidence ({report.evidence.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('test_cases');
              setSelectedCategory(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'test_cases'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]'
            }`}
          >
            <Target className="w-4 h-4" />
            Test Cases ({report.testCases.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('insights');
              setSelectedCategory(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'insights'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Insights
          </button>
        </div>

        <button
          onClick={fetchAnalysis}
          className="text-[#8b949e] hover:text-[#e6edf3] p-2 rounded-lg hover:bg-[#161b22] transition-colors"
          title="Re-run analysis"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Tab Contents */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab report={report} onSelectCategory={handleSelectCategory} />
        )}

        {activeTab === 'evidence' && (
          <EvidenceTab report={report} selectedCategory={selectedCategory} />
        )}

        {activeTab === 'test_cases' && <TestCasesTab report={report} />}

        {activeTab === 'insights' && <InsightsTab report={report} />}
      </div>
    </div>
  );
};
