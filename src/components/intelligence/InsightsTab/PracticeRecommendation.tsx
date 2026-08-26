'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { ProblemContract } from '@/lib/intelligence/contracts/problem-contract';

interface PracticeRecommendationProps {
  contract: ProblemContract;
}

export const PracticeRecommendation: React.FC<PracticeRecommendationProps> = ({ contract }) => {
  const recommendations = getPracticeProblems(contract.slug);

  return (
    <div className="bg-[#12141a] border border-[#232733] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
        <Sparkles className="w-4 h-4" />
        Recommended Targeted Practice Problems
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recommendations.map((prob, idx) => (
          <a
            key={idx}
            href={`https://leetcode.com/problems/${prob.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-[#0b0c10] border border-[#232733] hover:border-sky-500/50 rounded-lg p-3.5 transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#e6edf3] group-hover:text-sky-400 transition-colors">
                {prob.title}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  prob.difficulty === 'Easy'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : prob.difficulty === 'Medium'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {prob.difficulty}
              </span>
            </div>
            <div className="text-[11px] text-[#8b949e] flex items-center justify-between mt-2">
              <span>{prob.skill}</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-sky-400" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

function getPracticeProblems(slug: string) {
  if (slug === 'move-zeroes' || slug === 'sort-colors') {
    return [
      { title: '75. Sort Colors', slug: 'sort-colors', difficulty: 'Medium', skill: 'Three-way Partitioning' },
      { title: '26. Remove Duplicates from Sorted Array', slug: 'remove-duplicates-from-sorted-array', difficulty: 'Easy', skill: 'In-place Read/Write Pointers' },
      { title: '27. Remove Element', slug: 'remove-element', difficulty: 'Easy', skill: 'Fast/Slow Pointer Swaps' },
      { title: '283. Move Zeroes', slug: 'move-zeroes', difficulty: 'Easy', skill: 'Boundary Zero Alignment' },
    ];
  }

  if (slug === 'binary-search') {
    return [
      { title: '35. Search Insert Position', slug: 'search-insert-position', difficulty: 'Easy', skill: 'Lower Bound Binary Search' },
      { title: '34. Find First and Last Position of Element', slug: 'find-first-and-last-position-of-element-in-sorted-array', difficulty: 'Medium', skill: 'Dual Boundary Binary Search' },
      { title: '153. Find Minimum in Rotated Sorted Array', slug: 'find-minimum-in-rotated-sorted-array', difficulty: 'Medium', skill: 'Rotated Boundary Invariant' },
      { title: '704. Binary Search', slug: 'binary-search', difficulty: 'Easy', skill: 'Interval Inclusivity' },
    ];
  }

  return [
    { title: '1. Two Sum', slug: 'two-sum', difficulty: 'Easy', skill: 'Hash Map Lookup Invariants' },
    { title: '121. Best Time to Buy and Sell Stock', slug: 'best-time-to-buy-and-sell-stock', difficulty: 'Easy', skill: 'Prefix Minimum Tracking' },
    { title: '53. Maximum Subarray', slug: 'maximum-subarray', difficulty: 'Medium', skill: "Kadane's Algorithm" },
    { title: '3. Longest Substring Without Repeating Characters', slug: 'longest-substring-without-repeating-characters', difficulty: 'Medium', skill: 'Dynamic Sliding Window' },
  ];
}
