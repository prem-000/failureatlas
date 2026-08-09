-- Recovery Migration: 20260710_production_recovery
-- Safely adds missing cache columns and indexes to diagnosis_results without modifying or dropping any existing production schema objects.

-- AlterTable (defensive addition of missing cache fields)
ALTER TABLE "diagnosis_results" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;
ALTER TABLE "diagnosis_results" ADD COLUMN IF NOT EXISTS "codeHash" TEXT;
ALTER TABLE "diagnosis_results" ADD COLUMN IF NOT EXISTS "diagnosisJson" JSONB;
ALTER TABLE "diagnosis_results" ADD COLUMN IF NOT EXISTS "modelVersion" TEXT;

-- CreateIndex (defensive unique index and standard index creation)
CREATE UNIQUE INDEX IF NOT EXISTS "diagnosis_results_fingerprint_key" ON "diagnosis_results"("fingerprint");
CREATE INDEX IF NOT EXISTS "diagnosis_results_codeHash_idx" ON "diagnosis_results"("codeHash");
