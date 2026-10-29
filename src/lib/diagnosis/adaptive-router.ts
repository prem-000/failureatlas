/**
 * src/lib/diagnosis/adaptive-router.ts
 *
 * Adaptive Query Routing and Bounded Self-Correction Engine.
 * Intelligently classifies query intent, routes between internal failure intelligence
 * and external GitHub/CSV knowledge, evaluates retrieval coverage, and executes
 * bounded query reformulation (up to 2 cycles) when retrieval is inadequate.
 */

import { defaultExternalRetriever, type ExternalEvidenceItem } from '@/lib/rag/external-retrieval';
import { defaultSkillInference, type InferredSkillProfile } from './skill-inference';
import { DynamicGraphGenerator } from './graph-generator';
import type { StructuredDiagram } from '@/types/diagnosis-graph';
import type { InterpretedQuery } from './query-interpreter';

export type AdaptiveRouteTarget =
  | 'personal_failure'
  | 'external_company_dsa'
  | 'concept_and_algorithm'
  | 'combined_learning'
  | 'algorithm_visualization';

export interface AdaptiveRoutingDecision {
  target: AdaptiveRouteTarget;
  inferredSkill: InferredSkillProfile;
  companyTag?: string;
  wantsVisualization: boolean;
  routingReason: string;
}

export interface BoundedRetrievalResult {
  evidenceItems: ExternalEvidenceItem[];
  diagram: StructuredDiagram | null;
  correctionCycles: number;
  isAdequate: boolean;
  uncertaintyNotice?: string;
}

export class AdaptiveQueryRouter {
  /**
   * Determine optimal knowledge route based on query intent and inferred skill
   */
  static async routeQuery(
    userQuery: string,
    interpreted: InterpretedQuery,
    userId: string
  ): Promise<AdaptiveRoutingDecision> {
    const q = userQuery.toLowerCase();

    // 1. Infer skill dynamically
    const inferredSkill = await defaultSkillInference.inferProficiency(userId);

    // 2. Detect company names
    const companies = ['amazon', 'google', 'meta', 'apple', 'microsoft', 'bloomberg', 'uber', 'linkedin', 'netflix'];
    const detectedCompany = companies.find((c) => q.includes(c));
    const companyTag = detectedCompany ? detectedCompany.charAt(0).toUpperCase() + detectedCompany.slice(1) : undefined;

    // 3. Detect visualization intent
    const wantsVisualization = DynamicGraphGenerator.shouldGenerateDiagram(userQuery, interpreted);

    // 4. Determine routing target
    let target: AdaptiveRouteTarget = 'concept_and_algorithm';
    let routingReason = 'Algorithmic concept analysis';

    if (
      q.includes('my failure') ||
      q.includes('my solution') ||
      q.includes('my code') ||
      q.includes('why did i fail') ||
      q.includes('last wrong submission') ||
      q.includes('my mistakes')
    ) {
      target = 'personal_failure';
      routingReason = 'Prioritizing internal personal failure intelligence and submission history.';
    } else if (companyTag && (q.includes('question') || q.includes('interview') || q.includes('dsa') || q.includes('common'))) {
      target = 'external_company_dsa';
      routingReason = `Routing to external knowledge RAG for ${companyTag} interview questions and CSV datasets.`;
    } else if (wantsVisualization) {
      target = 'algorithm_visualization';
      routingReason = 'Routing to interactive diagram and algorithmic execution visualization.';
    } else if (q.includes('recommend') || q.includes('practice') || q.includes('study') || q.includes('next')) {
      target = 'combined_learning';
      routingReason = 'Combining personal weakness profile with external DSA practice recommendations.';
    }

    return {
      target,
      inferredSkill,
      companyTag,
      wantsVisualization,
      routingReason,
    };
  }

  /**
   * Execute bounded retrieval with self-correction
   */
  static async retrieveWithSelfCorrection(
    userQuery: string,
    interpreted: InterpretedQuery,
    decision: AdaptiveRoutingDecision,
    maxCycles: number = 2
  ): Promise<BoundedRetrievalResult> {
    let currentQuery = userQuery;
    let currentFilters: import('@/lib/rag/external-retrieval').ExternalRetrievalFilters = {
      company: decision.companyTag,
      topics: interpreted.mainTopic ? [interpreted.mainTopic] : undefined,
      limit: 6,
    };

    let items: ExternalEvidenceItem[] = [];
    let correctionCycles = 0;
    let isAdequate = false;

    for (let cycle = 0; cycle <= maxCycles; cycle++) {
      items = await defaultExternalRetriever.retrieve(currentQuery, currentFilters);

      // Evaluate coverage and relevance
      const hasHighRelevance = items.some((item) => item.relevanceScore >= 60);
      const hasTopicOrCompanyMatch = items.some(
        (item) =>
          (decision.companyTag && item.companies.includes(decision.companyTag)) ||
          item.topics.some((t) => t.toLowerCase().includes(interpreted.mainTopic.toLowerCase())) ||
          item.problemTitle.toLowerCase().includes(interpreted.mainTopic.toLowerCase())
      );

      if (items.length > 0 && (hasHighRelevance || hasTopicOrCompanyMatch)) {
        isAdequate = true;
        break;
      }

      // If inadequate and cycles remain, self-correct
      if (cycle < maxCycles) {
        correctionCycles++;
        if (cycle === 0) {
          // Cycle 1: Broaden search by dropping strict company filter and querying root topic
          currentFilters = {
            company: undefined,
            topics: interpreted.mainTopic ? [interpreted.mainTopic] : undefined,
            limit: 6,
          };
          currentQuery = `${interpreted.mainTopic} algorithm leetcode`;
        } else if (cycle === 1) {
          // Cycle 2: Use general algorithm tokens
          currentFilters = { limit: 6 };
          currentQuery = `${interpreted.mainTopic}`;
        }
      }
    }

    // Generate dynamic diagram if requested
    let diagram: StructuredDiagram | null = null;
    if (decision.wantsVisualization || decision.target === 'algorithm_visualization') {
      diagram = DynamicGraphGenerator.generateDiagram(userQuery, interpreted, items);
    }

    // Transparent uncertainty notice if evidence was sparse
    let uncertaintyNotice: string | undefined = undefined;
    if (!isAdequate || items.length === 0) {
      uncertaintyNotice =
        'Direct external repository records for this exact combination are limited. Providing verified conceptual fundamentals without asserting unverified company interview frequency.';
    } else if (decision.companyTag && items.some((i) => !i.isCompanyVerified)) {
      uncertaintyNotice = `Company tags for ${decision.companyTag} are community-reported dataset entries rather than official verified disclosures.`;
    }

    return {
      evidenceItems: items,
      diagram,
      correctionCycles,
      isAdequate,
      uncertaintyNotice,
    };
  }
}
