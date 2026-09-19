'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export const FirstOccurrenceEmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#ff5f52]/10 border border-[#ff5f52]/20 flex items-center justify-center text-[#ff5f52] mb-1">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="text-sm font-semibold text-[#f4f4f5]">
        First occurrence detected
      </div>
      <p className="text-xs text-[#71717a] max-w-xs leading-relaxed">
        No matching past failures found in your graph. This pattern is tracked from now on.
      </p>
    </div>
  );
};
