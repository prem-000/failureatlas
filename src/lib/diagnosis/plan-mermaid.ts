/**
 * src/lib/diagnosis/plan-mermaid.ts
 *
 * Generates vertical adaptive Mermaid flowchart (flowchart TB) for study plans.
 * Includes "Understood?" check diamonds with adaptive loops (No loops back, Yes moves forward).
 * Renders focus name + human-readable why context, step day + title + topic + minutes.
 * Strips any internal PageRank scores.
 */

import type { PlanDiagnosis } from '@/types/diagnosis-v2';

function escapeMermaidLabel(text: string): string {
  if (!text) return '';
  return text
    .replace(/"/g, "'")
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\(/g, '&#40;')
    .replace(/\)/g, '&#41;');
}

export function planToMermaid(plan: PlanDiagnosis): string {
  const safeFocusName = escapeMermaidLabel(plan.focus.name);
  const safeFocusWhy = escapeMermaidLabel(plan.focus.why || 'Curated adaptive focus');

  const lines: string[] = [
    `%%{init: {'theme':'base','themeVariables':{'background':'#131313','primaryColor':'#191919','primaryTextColor':'#f8fafc','primaryBorderColor':'#3f3f46','lineColor':'#a1a1aa','fontFamily':'Inter, sans-serif'}}}%%`,
    'flowchart TB',
    `W(["${safeFocusName}<br/>${safeFocusWhy}"]):::weak`,
  ];

  let prevNodeId = 'W';
  let isAfterGate = false;

  plan.steps.forEach((step, i) => {
    const id = `S${i}`;
    let cls = 'step';
    if (step.completed) {
      cls = 'done';
    } else if (step.rung === 'original' || step.rung === 'transfer') {
      cls = 'problem';
    }

    const safeDay = escapeMermaidLabel(step.day);
    const safeTitle = escapeMermaidLabel(step.title);
    const safeTopic = escapeMermaidLabel(step.topic || 'Core concept');

    lines.push(`${id}["${safeDay} · ${safeTitle}<br/>${safeTopic} · ${step.minutes} min"]:::${cls}`);

    if (isAfterGate) {
      lines.push(`${prevNodeId} -->|Yes| ${id}`);
      isAfterGate = false;
    } else {
      lines.push(`${prevNodeId} --> ${id}`);
    }

    prevNodeId = id;

    // Insert adaptive gate after concept_check and trace rungs
    if (step.rung === 'concept_check' || step.rung === 'trace') {
      const gateId = `C${i}`;
      lines.push(`${gateId}{"Understood?"}:::gate`);
      lines.push(`${id} --> ${gateId}`);
      lines.push(`${gateId} -.->|Need Review| ${id}`);
      prevNodeId = gateId;
      isAfterGate = true;
    }
  });

  lines.push(
    'classDef weak fill:#a855f7,stroke:#a855f7,color:#fff',
    'classDef step fill:#191919,stroke:#22c55e,color:#f8fafc',
    'classDef gate fill:#131313,stroke:#f59e0b,color:#f59e0b',
    'classDef problem fill:#3b82f6,stroke:#3b82f6,color:#fff',
    'classDef done fill:#14532d,stroke:#22c55e,color:#86efac'
  );

  return lines.join('\n');
}
