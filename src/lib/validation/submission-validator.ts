/**
 * Submission Validator
 *
 * Runs immediately after normalization, on the unified NormalizedSubmission schema.
 * Validates the normalized shape — not raw platform-specific payloads.
 * A submission that fails validation is rejected at the boundary.
 *
 * If a validation rule genuinely needs the raw payload, that check belongs
 * inside the adapter's normalize() itself.
 */

import type { NormalizedSubmission, PlatformCapabilities } from '@/types/platform-adapter';

// ─── Validation Error ─────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Current schema version the backend expects */
const CURRENT_SCHEMA_VERSION = 1;

/** Supported programming languages */
const SUPPORTED_LANGUAGES = new Set([
  'python', 'python3', 'java', 'cpp', 'c', 'c++',
  'javascript', 'typescript', 'go', 'rust', 'ruby',
  'swift', 'kotlin', 'scala', 'php', 'csharp', 'c#',
  'dart', 'elixir', 'erlang', 'racket', 'mysql', 'mssql',
  'oracle', 'postgresql',
]);

/** Valid submission statuses */
const VALID_STATUSES = new Set([
  'Accepted',
  'Wrong Answer',
  'Time Limit Exceeded',
  'Memory Limit Exceeded',
  'Runtime Error',
  'Compilation Error',
]);

/** Reasonable timestamp bounds */
const MIN_TIMESTAMP = new Date('2015-01-01').getTime(); // LeetCode era
const MAX_TIMESTAMP_OFFSET_MS = 5 * 60 * 1000; // 5 minutes into the future

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validate a NormalizedSubmission against the expected schema.
 *
 * @param submission  The normalized submission to validate
 * @param capabilities  Platform capabilities, used to cross-check null fields
 * @returns ValidationResult with `valid` boolean and any errors
 */
export function validateSubmission(
  submission: NormalizedSubmission,
  capabilities?: PlatformCapabilities
): ValidationResult {
  const errors: ValidationError[] = [];

  // ─── Required fields ────────────────────────────────────────────────────────

  if (!submission.platform || typeof submission.platform !== 'string') {
    errors.push({
      field: 'platform',
      code: 'MISSING_REQUIRED',
      message: 'Platform identifier is required',
    });
  }

  if (!submission.code || typeof submission.code !== 'string' || submission.code.trim().length === 0) {
    errors.push({
      field: 'code',
      code: 'MISSING_REQUIRED',
      message: 'Submission code is required and cannot be empty',
    });
  }

  if (!submission.status || typeof submission.status !== 'string') {
    errors.push({
      field: 'status',
      code: 'MISSING_REQUIRED',
      message: 'Submission status is required',
    });
  }

  if (!submission.language || typeof submission.language !== 'string') {
    errors.push({
      field: 'language',
      code: 'MISSING_REQUIRED',
      message: 'Programming language is required',
    });
  }

  if (!submission.timestamp || typeof submission.timestamp !== 'string') {
    errors.push({
      field: 'timestamp',
      code: 'MISSING_REQUIRED',
      message: 'Timestamp is required',
    });
  }

  if (!submission.problemId || typeof submission.problemId !== 'string') {
    errors.push({
      field: 'problemId',
      code: 'MISSING_REQUIRED',
      message: 'Problem identifier is required',
    });
  }

  // ─── Schema version check ──────────────────────────────────────────────────

  if (submission.version !== CURRENT_SCHEMA_VERSION) {
    errors.push({
      field: 'version',
      code: 'SCHEMA_VERSION_MISMATCH',
      message: `Expected schema version ${CURRENT_SCHEMA_VERSION}, got ${submission.version}. Extension may need updating.`,
    });
  }

  // ─── Status validation ─────────────────────────────────────────────────────

  if (submission.status && !VALID_STATUSES.has(submission.status)) {
    errors.push({
      field: 'status',
      code: 'INVALID_STATUS',
      message: `Unknown submission status: "${submission.status}". Valid statuses: ${[...VALID_STATUSES].join(', ')}`,
    });
  }

  // ─── Language validation ───────────────────────────────────────────────────

  if (submission.language && !SUPPORTED_LANGUAGES.has(submission.language.toLowerCase())) {
    errors.push({
      field: 'language',
      code: 'UNSUPPORTED_LANGUAGE',
      message: `Unsupported language: "${submission.language}"`,
    });
  }

  // ─── Timestamp validation ──────────────────────────────────────────────────

  if (submission.timestamp) {
    const ts = new Date(submission.timestamp).getTime();
    if (isNaN(ts)) {
      errors.push({
        field: 'timestamp',
        code: 'INVALID_TIMESTAMP',
        message: 'Timestamp is not a valid ISO date string',
      });
    } else {
      if (ts < MIN_TIMESTAMP) {
        errors.push({
          field: 'timestamp',
          code: 'TIMESTAMP_OUT_OF_RANGE',
          message: `Timestamp ${submission.timestamp} is before the minimum allowed date (2015-01-01)`,
        });
      }
      const now = Date.now();
      if (ts > now + MAX_TIMESTAMP_OFFSET_MS) {
        errors.push({
          field: 'timestamp',
          code: 'TIMESTAMP_OUT_OF_RANGE',
          message: `Timestamp ${submission.timestamp} is too far in the future`,
        });
      }
    }
  }

  // ─── Capabilities cross-check ──────────────────────────────────────────────
  // A null where the platform claims "available" is a validation failure

  if (capabilities) {
    if (capabilities.runtime === 'available' && submission.runtime === null) {
      errors.push({
        field: 'runtime',
        code: 'CAPABILITY_MISMATCH',
        message: 'Platform declares runtime as "available" but value is null',
      });
    }
    if (capabilities.memory === 'available' && submission.memory === null) {
      errors.push({
        field: 'memory',
        code: 'CAPABILITY_MISMATCH',
        message: 'Platform declares memory as "available" but value is null',
      });
    }
    if (capabilities.submissionId === 'available' && submission.externalSubmissionId === null) {
      errors.push({
        field: 'externalSubmissionId',
        code: 'CAPABILITY_MISMATCH',
        message: 'Platform declares submissionId as "available" but value is null',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
