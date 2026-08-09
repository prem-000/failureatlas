-- Migration: add_network_interceptor
-- Generated for FailureAtlas Network Interceptor Pipeline
-- Apply with: npx prisma migrate dev --name add_network_interceptor
--          or: npx prisma db push (for rapid iteration)

-- ── 1. Add new columns to submission_events ──────────────────────────────────

ALTER TABLE "submission_events"
  ADD COLUMN IF NOT EXISTS "submissionHash" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'extension';

-- Unique index on submissionHash (allow NULL, only unique when set)
CREATE UNIQUE INDEX IF NOT EXISTS "submission_events_submissionHash_key"
  ON "submission_events"("submissionHash")
  WHERE "submissionHash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "submission_events_submissionHash_idx"
  ON "submission_events"("submissionHash");

-- ── 2. Create behavior_evidence table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "behavior_evidence" (
  "id"              TEXT         NOT NULL,
  "submissionId"    TEXT         NOT NULL,
  "typingTime"      INTEGER,
  "editorEvents"    INTEGER,
  "tabSwitches"     INTEGER,
  "focusLoss"       INTEGER,
  "sessionDuration" INTEGER,
  "rawData"         JSONB        NOT NULL DEFAULT '{}',
  "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "behavior_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "behavior_evidence_submissionId_fkey"
    FOREIGN KEY ("submissionId")
    REFERENCES "submission_events"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "behavior_evidence_submissionId_key"
  ON "behavior_evidence"("submissionId");

CREATE INDEX IF NOT EXISTS "behavior_evidence_submissionId_idx"
  ON "behavior_evidence"("submissionId");

-- ── 3. Create network_evidence table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "network_evidence" (
  "id"                  TEXT         NOT NULL,
  "submissionId"        TEXT         NOT NULL,
  "requestMethod"       TEXT,
  "requestUrl"          TEXT,
  "requestHeaders"      JSONB        NOT NULL DEFAULT '{}',
  "requestBody"         JSONB        NOT NULL DEFAULT '{}',
  "requestSize"         INTEGER,
  "requestTimestamp"    TIMESTAMPTZ,
  "responseStatusCode"  INTEGER,
  "responseHeaders"     JSONB        NOT NULL DEFAULT '{}',
  "responseBody"        JSONB        NOT NULL DEFAULT '{}',
  "responseSize"        INTEGER,
  "responseTimestamp"   TIMESTAMPTZ,
  "verdict"             TEXT,
  "runtime"             INTEGER,
  "memory"              DOUBLE PRECISION,
  "totalTestcases"      INTEGER,
  "passedTestcases"     INTEGER,
  "failedTestcase"      TEXT,
  "serverProcessingMs"  INTEGER,
  "latencyMs"           INTEGER,
  "retryCount"          INTEGER      NOT NULL DEFAULT 0,
  "pollingFrequency"    DOUBLE PRECISION,
  "createdAt"           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "network_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "network_evidence_submissionId_fkey"
    FOREIGN KEY ("submissionId")
    REFERENCES "submission_events"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "network_evidence_submissionId_key"
  ON "network_evidence"("submissionId");

CREATE INDEX IF NOT EXISTS "network_evidence_submissionId_idx"
  ON "network_evidence"("submissionId");

-- ── 4. Create code_evidence table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "code_evidence" (
  "id"           TEXT         NOT NULL,
  "submissionId" TEXT         NOT NULL,
  "previousCode" TEXT,
  "currentCode"  TEXT,
  "diff"         TEXT,
  "changedLines" INTEGER,
  "confidence"   DOUBLE PRECISION,
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "code_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "code_evidence_submissionId_fkey"
    FOREIGN KEY ("submissionId")
    REFERENCES "submission_events"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "code_evidence_submissionId_key"
  ON "code_evidence"("submissionId");

CREATE INDEX IF NOT EXISTS "code_evidence_submissionId_idx"
  ON "code_evidence"("submissionId");
