/**
 * src/lib/judge/praxis-prompts/index.ts
 *
 * Dynamic prompt selector — injects the right prompt based on user tier and persona.
 * Smaller, focused prompts = better LLM responses + lower latency.
 */

import type { JudgeProfile, JudgePersona } from '@/types';
import type { DifficultyTarget } from '../difficulty-engine';
import type { BugTemplate } from '../bug-mining-agent';
import type { PersonaConfig } from '../judge-personas';
import type { StructuralEvidence } from '@/lib/analysis/structural-analyzer';

import { buildBeginnerPrompt } from './beginner-prompt';
import { buildIntermediatePrompt } from './intermediate-prompt';
import { buildExpertPrompt } from './expert-prompt';
import { buildAdversarialPrompt } from './adversarial-prompt';

interface PromptContext {
  evidence: StructuralEvidence;
  profile: JudgeProfile;
  bugs: BugTemplate[];
  diffTarget: DifficultyTarget;
  persona: JudgePersona;
  personaConfig: PersonaConfig;
  fingerprintJson: string;
}

/**
 * Selects the appropriate prompt tier based on user's judge rating + difficulty stage.
 * Returns the fully-populated prompt string ready for LLM submission.
 */
export function selectPrompt(ctx: PromptContext): string {
  const { evidence, profile, bugs, diffTarget, persona, personaConfig, fingerprintJson } = ctx;
  const personaInstruction = personaConfig.systemInstruction;
  const { judgeRating } = profile;
  const { stageOverride } = diffTarget;

  // Adversarial: Codeforces persona always, or Expert+ stage, or high-rating adversarial
  const isAdversarial =
    persona === 'codeforces' ||
    stageOverride >= 4 ||
    (judgeRating >= 2400 && stageOverride >= 3);

  if (isAdversarial) {
    return buildAdversarialPrompt(
      evidence, profile, bugs, diffTarget, persona, personaInstruction, fingerprintJson
    );
  }

  // Expert: 1800–2400 rating
  if (judgeRating >= 1800) {
    return buildExpertPrompt(
      evidence, profile, bugs, diffTarget, persona, personaInstruction, fingerprintJson
    );
  }

  // Intermediate: 1200–1800 rating
  if (judgeRating >= 1200) {
    return buildIntermediatePrompt(
      evidence, profile, bugs, diffTarget, persona, personaInstruction, fingerprintJson
    );
  }

  // Beginner: < 1200 rating
  return buildBeginnerPrompt(
    evidence, profile, bugs, diffTarget, persona, personaInstruction
  );
}
