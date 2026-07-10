import React, { useState, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';

export interface AccordionSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  content: React.ReactNode;
}

interface MobileAccordionListProps {
  sections: AccordionSection[];
  defaultOpen?: string;
}

export function MobileAccordionList({ sections, defaultOpen }: MobileAccordionListProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen ?? sections[0]?.id ?? null);
  const [mounted, setMounted] = useState<Set<string>>(() => new Set(defaultOpen ? [defaultOpen] : sections[0]?.id ? [sections[0].id] : []));

  const toggle = useCallback((id: string) => {
    setOpenId(prev => {
      const next = prev === id ? null : id;
      if (next) setMounted(m => new Set([...m, next]));
      return next;
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sections.map(sec => {
        const isOpen = openId === sec.id;
        return (
          <div key={sec.id} id={`section-${sec.id}`} className="analysis-accordion-card analysis-section-anchor">
            {/* Trigger */}
            <button
              className="analysis-accordion-trigger compact"
              onClick={() => toggle(sec.id)}
              aria-expanded={isOpen}
              aria-controls={`acc-body-${sec.id}`}
            >
              <div style={{ width: 3, height: 18, background: sec.accent, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', flex: 1, letterSpacing: '-0.01em' }}>
                {sec.icon && <span style={{ marginRight: 6 }}>{sec.icon}</span>}
                {sec.label}
              </span>
              <span style={{ color: '#52525b', transition: 'transform 0.25s', transform: isOpen ? 'rotate(90deg)' : 'none', display: 'flex' }}>
                <ChevronRight size={16} />
              </span>
            </button>

            {/* Body — lazy mount */}
            {isOpen && (
              <div
                id={`acc-body-${sec.id}`}
                className="analysis-accordion-body open"
                role="region"
              >
                {/* Sticky mini-header */}
                <div className="analysis-section-sticky-header">
                  <div style={{ width: 3, height: 14, background: sec.accent, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: sec.accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {sec.label}
                  </span>
                </div>
                {/* Content — only render after first open */}
                {mounted.has(sec.id) ? sec.content : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
