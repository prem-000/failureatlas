'use client';

import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';

interface OverallHealthCardProps {
  score: number;
  coverage?: number;
}

export const OverallHealthCard: React.FC<OverallHealthCardProps> = ({ score, coverage = 75 }) => {
  const getScoreBadgeColor = (val: number) => {
    if (val >= 85) return 'stroke-emerald-400';
    if (val >= 70) return 'stroke-sky-400';
    if (val >= 50) return 'stroke-amber-400';
    return 'stroke-rose-400';
  };

  return (
    <div className="w-full md:w-64 bg-[#12141a] border border-[#232733] rounded-xl p-5 flex flex-col justify-between items-center text-center">
      <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#8b949e] uppercase mb-1">
        <Activity className="w-3.5 h-3.5 text-sky-400" />
        Overall Code Health
      </div>

      <div className="relative flex items-center justify-center my-1">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            className="stroke-[#232733]"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            className={`${getScoreBadgeColor(score)} transition-all duration-1000 ease-out`}
            strokeWidth="8"
            strokeDasharray={251.2}
            strokeDashoffset={251.2 - (251.2 * score) / 100}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-extrabold text-[#e6edf3] tracking-tight">{score}</span>
          <span className="text-[10px] text-[#8b949e] -mt-1 font-semibold">/ 100</span>
        </div>
      </div>

      <div className="w-full mt-2 pt-2 border-t border-[#232733]/60 flex items-center justify-between text-[11px] text-[#8b949e]">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-sky-400" /> Analysis Coverage:
        </span>
        <span className="font-bold text-sky-400">{coverage}%</span>
      </div>
    </div>
  );
};
