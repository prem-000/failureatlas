'use client';

import React from 'react';

export interface ConceptBulletsProps {
  concept?: {
    name: string;
    points: string[];
  };
}

export const ConceptBulletsPanel: React.FC<ConceptBulletsProps> = ({ concept }) => {
  if (!concept || !concept.points || concept.points.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#3f205c] bg-[#1a1224] p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#d8b4fe] mb-2.5">
        CONCEPT: {concept.name}
      </div>
      <ul className="flex flex-col gap-2 pl-1 text-xs text-[#e4e4e7] list-none">
        {concept.points.map((point, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-[#a855f7] select-none text-base leading-none mt-[-2px]">•</span>
            <span className="leading-relaxed">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
