-- CreateTable: failure_explanations
CREATE TABLE "failure_explanations" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "rootCauseCategory" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "logicBreakdown" TEXT NOT NULL,
    "learningConcept" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "estimatedLearningTimeMinutes" INTEGER NOT NULL,
    "evidenceItems" JSONB NOT NULL DEFAULT '[]',
    "representativeTestCase" JSONB,
    "recurringPatterns" JSONB NOT NULL DEFAULT '[]',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failure_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "failure_explanations_submissionId_key" ON "failure_explanations"("submissionId");

-- CreateIndex
CREATE INDEX "failure_explanations_submissionId_idx" ON "failure_explanations"("submissionId");

-- AddForeignKey
ALTER TABLE "failure_explanations" ADD CONSTRAINT "failure_explanations_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
