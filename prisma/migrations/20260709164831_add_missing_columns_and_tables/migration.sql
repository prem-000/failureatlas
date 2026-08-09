/*
  Warnings:

  - A unique constraint covering the columns `[fingerprint]` on the table `diagnosis_results` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[submissionHash]` on the table `submission_events` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "behavior_evidence" DROP CONSTRAINT "behavior_evidence_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "code_evidence" DROP CONSTRAINT "code_evidence_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "network_evidence" DROP CONSTRAINT "network_evidence_submissionId_fkey";

-- AlterTable
ALTER TABLE "behavior_evidence" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "code_evidence" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "diagnosis_results" ADD COLUMN     "codeHash" TEXT,
ADD COLUMN     "diagnosisJson" JSONB,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "modelVersion" TEXT;

-- AlterTable
ALTER TABLE "network_evidence" ALTER COLUMN "requestTimestamp" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "responseTimestamp" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "image" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerId" TEXT,
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyMissionEmail" BOOLEAN NOT NULL DEFAULT true,
    "preferredTime" TEXT NOT NULL DEFAULT '08:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_missions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryProblemSlug" TEXT NOT NULL,
    "secondaryProblemSlug" TEXT,
    "failureRisk" DOUBLE PRECISION NOT NULL,
    "successProbability" DOUBLE PRECISION NOT NULL,
    "aiHint" TEXT NOT NULL,
    "learningGain" JSONB NOT NULL,
    "missionDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_missions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_results_fingerprint_key" ON "diagnosis_results"("fingerprint");

-- CreateIndex
CREATE INDEX "diagnosis_results_codeHash_idx" ON "diagnosis_results"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "submission_events_submissionHash_key" ON "submission_events"("submissionHash");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_missions" ADD CONSTRAINT "daily_missions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_evidence" ADD CONSTRAINT "behavior_evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_evidence" ADD CONSTRAINT "network_evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_evidence" ADD CONSTRAINT "code_evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
