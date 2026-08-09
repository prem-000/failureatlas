-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "topics" TEXT[],
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "submissionTraceId" TEXT,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "runtime" INTEGER,
    "memory" INTEGER,
    "testCasesPassed" INTEGER,
    "totalTestCases" INTEGER,
    "failedTestCase" TEXT,
    "timeSpent" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "rapidSubmission" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "rawData" JSONB NOT NULL DEFAULT '{}',
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "root_cause_hypotheses" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT,
    "rootCauseType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "root_cause_hypotheses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "root_cause_occurrences" (
    "id" TEXT NOT NULL,
    "rootCauseType" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstOccurrence" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOccurrence" TIMESTAMP(3) NOT NULL,
    "averageConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "root_cause_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systemic_weaknesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "lastOccurrence" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riskIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pageRankScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systemic_weaknesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "primaryWeaknessId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progressMetrics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnosis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_weaknesses" (
    "id" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "weaknessId" TEXT NOT NULL,
    "isSecondary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnosis_weaknesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_strategies" (
    "id" TEXT NOT NULL,
    "weaknessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedTime" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "practiceProblems" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_recommendations" (
    "id" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "text_embeddings" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-large',
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "text_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leetcode_problems" (
    "id" TEXT NOT NULL,
    "leetcodeId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "topics" TEXT[],
    "patterns" TEXT[],
    "prerequisites" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leetcode_problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "levels" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_apiKey_key" ON "users"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "problems_slug_key" ON "problems"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "submission_events_eventId_key" ON "submission_events"("eventId");

-- CreateIndex
CREATE INDEX "submission_events_userId_idx" ON "submission_events"("userId");

-- CreateIndex
CREATE INDEX "submission_events_problemId_idx" ON "submission_events"("problemId");

-- CreateIndex
CREATE INDEX "submission_events_timestamp_idx" ON "submission_events"("timestamp");

-- CreateIndex
CREATE INDEX "evidence_submissionId_idx" ON "evidence"("submissionId");

-- CreateIndex
CREATE INDEX "root_cause_hypotheses_evidenceId_idx" ON "root_cause_hypotheses"("evidenceId");

-- CreateIndex
CREATE INDEX "root_cause_occurrences_problemId_idx" ON "root_cause_occurrences"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "root_cause_occurrences_rootCauseType_problemId_key" ON "root_cause_occurrences"("rootCauseType", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "systemic_weaknesses_name_key" ON "systemic_weaknesses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_results_submissionId_key" ON "diagnosis_results"("submissionId");

-- CreateIndex
CREATE INDEX "diagnosis_results_userId_idx" ON "diagnosis_results"("userId");

-- CreateIndex
CREATE INDEX "diagnosis_results_submissionId_idx" ON "diagnosis_results"("submissionId");

-- CreateIndex
CREATE INDEX "diagnosis_weaknesses_weaknessId_idx" ON "diagnosis_weaknesses"("weaknessId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_weaknesses_diagnosisId_weaknessId_isSecondary_key" ON "diagnosis_weaknesses"("diagnosisId", "weaknessId", "isSecondary");

-- CreateIndex
CREATE INDEX "learning_strategies_weaknessId_idx" ON "learning_strategies"("weaknessId");

-- CreateIndex
CREATE INDEX "learning_recommendations_diagnosisId_idx" ON "learning_recommendations"("diagnosisId");

-- CreateIndex
CREATE INDEX "learning_recommendations_strategyId_idx" ON "learning_recommendations"("strategyId");

-- CreateIndex
CREATE INDEX "learning_plans_userId_idx" ON "learning_plans"("userId");

-- CreateIndex
CREATE INDEX "text_embeddings_sourceType_sourceId_idx" ON "text_embeddings"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "leetcode_problems_leetcodeId_key" ON "leetcode_problems"("leetcodeId");

-- CreateIndex
CREATE UNIQUE INDEX "leetcode_problems_slug_key" ON "leetcode_problems"("slug");

-- CreateIndex
CREATE INDEX "roadmap_states_userId_idx" ON "roadmap_states"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_states_userId_topic_key" ON "roadmap_states"("userId", "topic");

-- AddForeignKey
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_cause_hypotheses" ADD CONSTRAINT "root_cause_hypotheses_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_cause_occurrences" ADD CONSTRAINT "root_cause_occurrences_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_results" ADD CONSTRAINT "diagnosis_results_primaryWeaknessId_fkey" FOREIGN KEY ("primaryWeaknessId") REFERENCES "systemic_weaknesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_results" ADD CONSTRAINT "diagnosis_results_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_results" ADD CONSTRAINT "diagnosis_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_weaknesses" ADD CONSTRAINT "diagnosis_weaknesses_weaknessId_fkey" FOREIGN KEY ("weaknessId") REFERENCES "systemic_weaknesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_strategies" ADD CONSTRAINT "learning_strategies_weaknessId_fkey" FOREIGN KEY ("weaknessId") REFERENCES "systemic_weaknesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_recommendations" ADD CONSTRAINT "learning_recommendations_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "diagnosis_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_recommendations" ADD CONSTRAINT "learning_recommendations_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "learning_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_states" ADD CONSTRAINT "roadmap_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
