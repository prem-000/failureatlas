import React, { useState } from 'react';

interface ShowMoreTextProps {
  text: string;
  lines?: number;
}

export function ShowMoreText({ text, lines = 3 }: ShowMoreTextProps) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > 120;
  return (
    <div>
      <p className={needsTruncation && !expanded ? 'show-more-text' : ''} style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>
        {text}
      </p>
      {needsTruncation && (
        <button
          className="show-more-btn compact"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? 'Show Less ▲' : 'Show More ▼'}
        </button>
      )}
    </div>
  );
}
