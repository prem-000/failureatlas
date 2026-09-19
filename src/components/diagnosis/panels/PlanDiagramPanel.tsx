'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { PlanDiagnosis, StepRung } from '@/types/diagnosis-v2';
import { planToMermaid } from '@/lib/diagnosis/plan-mermaid';
import { getCuratedResourcesForSkillOrRootCause } from '@/lib/resources/catalog';
import { CheckCircle2, Circle, ExternalLink, BookOpen, Clock, AlertTriangle } from 'lucide-react';

export interface PlanDiagramPanelProps {
  initialPlan: PlanDiagnosis;
}

const RUNG_LABELS: Record<StepRung, string> = {
  concept_check: 'Concept Check',
  trace: 'Manual Trace',
  tiny_build: 'Micro Implementation',
  easy_variant: 'Easy Variant',
  modified_variant: 'Modified Variant',
  original: 'Original Problem',
  transfer: 'Transfer Skill Challenge',
};

export const PlanDiagramPanel: React.FC<PlanDiagramPanelProps> = ({ initialPlan }) => {
  const [plan, setPlan] = useState<PlanDiagnosis>(initialPlan);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [mermaidError, setMermaidError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync if initialPlan updates
  useEffect(() => {
    setPlan(initialPlan);
  }, [initialPlan]);

  // Render Mermaid Diagram
  useEffect(() => {
    let active = true;

    async function renderDiagram() {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            background: '#131313',
            primaryColor: '#191919',
            primaryTextColor: '#f8fafc',
            primaryBorderColor: '#3f3f46',
            lineColor: '#a1a1aa',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        });

        const code = planToMermaid(plan);
        const elementId = `plan-diagram-${Date.now()}`;
        const { svg } = await mermaid.render(elementId, code);

        if (active) {
          setMermaidSvg(svg);
          setMermaidError(false);
        }
      } catch (err) {
        console.warn('Plan Mermaid rendering exception, falling back to vertical list:', err);
        if (active) {
          setMermaidError(true);
        }
      }
    }

    renderDiagram();
    return () => {
      active = false;
    };
  }, [plan]);

  // Attach SVG node click handlers
  useEffect(() => {
    if (!containerRef.current || !mermaidSvg) return;

    const el = containerRef.current;
    const stepNodes = el.querySelectorAll('[id^="flowchart-S"]');

    stepNodes.forEach((node) => {
      node.classList.add('cursor-pointer');
      const handler = (e: Event) => {
        const match = (node as HTMLElement).id.match(/flowchart-S(\d+)/);
        if (match && match[1]) {
          const idx = parseInt(match[1], 10);
          if (!isNaN(idx)) {
            setSelectedStepIndex(idx);
          }
        }
      };
      node.addEventListener('click', handler);
    });
  }, [mermaidSvg]);

  const toggleStepCompletion = (index: number) => {
    setPlan((prev) => {
      const updated = [...prev.steps];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          completed: !updated[index].completed,
        };
      }
      return { ...prev, steps: updated };
    });
  };

  const currentStep = plan.steps[selectedStepIndex] || plan.steps[0];
  const stepResources = getCuratedResourcesForSkillOrRootCause(
    plan.focus.name,
    currentStep?.resourceIds
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#141416]">
      {/* Header */}
      <div className="p-4 border-b border-[#222226] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#a855f7]">
              THIS WEEK'S FOCUS
            </div>
            <div className="text-sm font-bold text-[#f4f4f5] flex items-center gap-2 mt-0.5">
              <span>{plan.focus.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#a855f7]/15 text-[#d8b4fe] font-semibold uppercase tracking-wider border border-[#a855f7]/30">
                {plan.focus.priority} priority
              </span>
            </div>
            <div className="text-xs text-[#a1a1aa] mt-0.5">
              {plan.focus.why}
            </div>
          </div>
          <div className="text-xs text-[#a1a1aa] font-medium self-start">
            {plan.steps.filter((s) => s.completed).length} / {plan.steps.length} completed
          </div>
        </div>

        {plan.topics && plan.topics.length > 0 && (
          <div className="pt-2 border-t border-[#222226] flex items-center gap-2 text-[11px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
              TOPICS
            </span>
            <span className="text-[#e4e4e7]">
              {plan.topics.map((t) => t.name).join(' · ')}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Diagram or Fallback List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start">
          {!mermaidError && mermaidSvg ? (
            <div
              ref={containerRef}
              dangerouslySetInnerHTML={{ __html: mermaidSvg }}
              className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
            />
          ) : (
            <div className="w-full flex flex-col gap-2.5">
              {mermaidError && (
                <div className="flex items-center gap-2 p-2.5 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Interactive list view active</span>
                </div>
              )}
              {plan.steps.map((step, idx) => (
                <div
                  key={step.id || idx}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    selectedStepIndex === idx
                      ? 'border-[#ff5f52] bg-[#1e1e24]'
                      : 'border-[#27272a] bg-[#18181b] hover:border-[#3f3f46]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStepCompletion(idx);
                      }}
                      className="text-[#71717a] hover:text-[#22c55e] transition-colors"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="font-semibold text-[#f4f4f5]">
                        {step.day} · {step.title}
                      </div>
                      <div className="text-[10px] text-[#71717a]">
                        {RUNG_LABELS[step.rung]} · {step.minutes} min
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Selected Step Exercise Details */}
        {currentStep && (
          <div className="w-80 border-l border-[#222226] bg-[#121214] p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
                  Selected Step
                </span>
                <h4 className="text-sm font-bold text-[#f4f4f5] mt-0.5">
                  {currentStep.day}: {currentStep.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => toggleStepCompletion(selectedStepIndex)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  currentStep.completed
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                    : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'
                }`}
              >
                {currentStep.completed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </>
                ) : (
                  <span>Mark Done</span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#a1a1aa] bg-[#18181b] p-2.5 rounded border border-[#27272a]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#ff5f52]" />
                <span>{currentStep.minutes} minutes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>{RUNG_LABELS[currentStep.rung]}</span>
              </div>
            </div>

            {/* Step Resources */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] mb-2">
                Step Resources
              </div>
              <div className="flex flex-col gap-2">
                {stepResources.slice(0, 3).map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded border border-[#27272a] bg-[#18181b] hover:border-[#ff5f52] transition-colors block text-xs"
                  >
                    <div className="font-medium text-[#e4e4e7] line-clamp-1 flex items-center justify-between">
                      <span>{r.title}</span>
                      <ExternalLink className="w-3 h-3 text-[#71717a] shrink-0 ml-1" />
                    </div>
                    <div className="text-[10px] text-[#71717a] mt-1 flex items-center gap-1.5">
                      <span className="uppercase text-[9px] font-semibold text-[#ff5f52]">{r.type}</span>
                      <span>·</span>
                      <span>{r.source}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
