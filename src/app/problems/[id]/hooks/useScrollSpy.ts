import { useState, useEffect } from 'react';

export function useScrollSpy(ids: string[], rootMargin = '-48px 0px -60% 0px') {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) return;
    const elements = ids.map(id => document.getElementById(`section-${id}`)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          const id = top.target.id.replace('section-', '');
          setActiveId(id);
        }
      },
      { rootMargin, threshold: 0 }
    );

    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [ids.join(','), rootMargin]);

  return activeId;
}
