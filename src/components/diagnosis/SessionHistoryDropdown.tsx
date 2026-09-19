'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DiagnosisEntry } from '@/types/diagnosis-v2';
import { ChevronDown, Map, Bug, ClipboardList, Clock, Target, Check, XCircle } from 'lucide-react';

export interface SessionHistoryDropdownProps {
  entries: DiagnosisEntry[];
  activeId: string | null;
  onSelectEntry: (id: string) => void;
}

function getEntryDetails(entry: DiagnosisEntry): {
  icon: React.ReactNode;
  headline: string;
} {
  if (entry.error || !entry.result) {
    return {
      icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
      headline: `Failed · ${entry.error?.stage || 'error'} · ${entry.query}`,
    };
  }

  const { result } = entry;
  switch (result.kind) {
    case 'plan':
      return {
        icon: <Map className="w-3.5 h-3.5 text-[#a855f7]" />,
        headline: `7-day plan · ${result.focus.name}`,
      };
    case 'code_review':
      return {
        icon: <Bug className="w-3.5 h-3.5 text-[#ff5f52]" />,
        headline: `Bug found · line ${result.location.line} · ${result.rootCause.name}`,
      };
    case 'submission_review':
      return {
        icon: <Target className="w-3.5 h-3.5 text-[#ff5f52]" />,
        headline: `Submission · line ${result.location.line} · ${result.problem.title}`,
      };
    case 'submission_accepted':
      return {
        icon: <Check className="w-3.5 h-3.5 text-emerald-500" />,
        headline: `Passed · ${result.problem.title}`,
      };
    case 'no_submission':
      return {
        icon: <Target className="w-3.5 h-3.5 text-[#71717a]" />,
        headline: `No submissions captured`,
      };
    case 'explain':
      return {
        icon: <ClipboardList className="w-3.5 h-3.5 text-[#f59e0b]" />,
        headline: `Pattern breakdown · ${result.topic}`,
      };
    case 'history':
      return {
        icon: <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />,
        headline: `History · ${result.count} occurrences`,
      };
    default:
      return {
        icon: <ClipboardList className="w-3.5 h-3.5 text-[#71717a]" />,
        headline: 'Diagnosis analysis',
      };
  }
}

export const SessionHistoryDropdown: React.FC<SessionHistoryDropdownProps> = ({
  entries,
  activeId,
  onSelectEntry,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!entries || entries.length === 0) return null;

  return (
    <div ref={dropdownRef} className="relative inline-block text-left z-30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1f1f23] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] text-xs font-medium border border-[#2e2e33] transition-colors cursor-pointer"
      >
        <span className="text-[11px]">This session · {entries.length}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-80 rounded-lg border border-[#2e2e33] bg-[#18181b] shadow-xl py-1 text-xs overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#71717a] border-b border-[#222226]">
            Session Diagnoses ({entries.length})
          </div>
          <div className="max-h-64 overflow-y-auto">
            {entries.slice().reverse().map((entry) => {
              const isActive = entry.id === activeId;
              const { icon, headline } = getEntryDetails(entry);
              const timeStr = new Date(entry.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    onSelectEntry(entry.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors border-none cursor-pointer ${
                    isActive
                      ? 'bg-[#27272e] text-[#f4f4f5] font-semibold'
                      : 'bg-transparent text-[#a1a1aa] hover:bg-[#202024] hover:text-[#e4e4e7]'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    {icon}
                    <span className="truncate text-xs">{headline}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-[#71717a]">{timeStr}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-[#ff5f52]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
