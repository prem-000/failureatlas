'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { analyzeFailedSubmission } from './inferenceEngine';
import { FailureBannerCard } from './FailureBannerCard';
import { BugExplanationSection } from './BugExplanationSection';
import { ExecutionSimulationSection } from './ExecutionSimulationSection';
import { HiddenTestCasesSection } from './HiddenTestCasesSection';
import { RootCauseSection } from './RootCauseSection';
import { SimilarFailuresSection } from './SimilarFailuresSection';
import { LearningRecommendationSection } from './LearningRecommendationSection';

interface FailedSubmissionWorkspaceProps {
  submissionData: {
    submission: {
      id: string;
      eventId: string;
      status: string;
      language: string;
      code: string;
      runtime: number | null;
      memory: number | null;
      testCasesPassed: number | null;
      totalTestCases: number | null;
      failedTestCase: string | null;
      attemptNumber: number;
      timestamp: string;
      problem: {
        id: string;
        slug: string;
        title: string;
        difficulty: string;
        topics: string[];
      };
    };
    previousSubmission?: {
      code: string;
      timestamp: string;
    } | null;
    codeDiff?: Array<{ type: string; content: string }>;
  };
}

export function FailedSubmissionWorkspace({
  submissionData,
}: FailedSubmissionWorkspaceProps) {
  const { submission, previousSubmission, codeDiff } = submissionData;

  // Perform failure analysis using inference engine
  const analysis = useMemo(() => {
    return analyzeFailedSubmission(submission, previousSubmission, codeDiff);
  }, [submission, previousSubmission, codeDiff]);

  const [activeTestIndex, setActiveTestIndex] = useState(0);

  // Smooth scroll helper for banner quick actions
  const scrollToSection = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleShowExecution = () => {
    scrollToSection('section-execution-simulation');
  };

  const handleHowWeFoundThis = () => {
    scrollToSection('section-root-cause');
  };

  // Staggered Framer Motion animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}
      >
        {/* Section 1: Failure Banner */}
        <motion.div variants={itemVariants} id="section-failure-banner" className="w-full">
          <FailureBannerCard
            bannerText={analysis.failureBannerText}
            reasonText={analysis.failureReason}
            onShowExecution={handleShowExecution}
            onHowWeFoundThis={handleHowWeFoundThis}
          />
        </motion.div>

        {/* Section 2: Bug Explanation */}
        <motion.div variants={itemVariants} id="section-bug-explanation" className="w-full">
          <BugExplanationSection bugs={analysis.bugs} />
        </motion.div>

        {/* Section 3: AI Execution Simulation */}
        <motion.div variants={itemVariants} id="section-execution-simulation" className="w-full">
          <ExecutionSimulationSection steps={analysis.simulationSteps} />
        </motion.div>

        {/* Section 4: AI Judge Simulator */}
        <motion.div variants={itemVariants} id="section-ai-judge" className="w-full">
          <HiddenTestCasesSection
            judgeCases={analysis.judgeCases}
            activeTestIndexInitial={activeTestIndex}
            onTestIndexChange={(idx) => setActiveTestIndex(idx)}
            onRunSimulation={handleShowExecution}
          />
        </motion.div>

        {/* Section 5: Root Cause */}
        <motion.div variants={itemVariants} id="section-root-cause" className="w-full">
          <RootCauseSection rootCause={analysis.rootCause} />
        </motion.div>

        {/* Section 7: Similar Past Failures */}
        <motion.div variants={itemVariants} id="section-similar-failures" className="w-full">
          <SimilarFailuresSection failures={analysis.similarPastFailures} />
        </motion.div>

        {/* Section 8: Learning Recommendation */}
        <motion.div variants={itemVariants} id="section-learning-recommendation" className="w-full">
          <LearningRecommendationSection recommendation={analysis.learningRecommendation} />
        </motion.div>
      </motion.div>
    </div>
  );
}
