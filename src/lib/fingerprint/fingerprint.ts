import { createHash } from 'crypto';

export interface FingerprintInput {
  userId: string;
  problemSlug: string;
  language: string;
  status: string; // Submission verdict
  code: string;
}

/**
 * Normalizes code by handling:
 * - Windows/Unix line endings
 * - Trailing whitespace per line
 * - Extra blank lines
 * - Overall leading/trailing whitespace
 */
export function normalizeSourceCode(code: string): string {
  if (!code) return '';
  return code
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function createFingerprint(input: FingerprintInput): { fingerprint: string; codeHash: string } {
  const normalizedCode = normalizeSourceCode(input.code);
  const codeHash = sha256(normalizedCode);
  
  const combined = [
    input.userId,
    input.problemSlug,
    input.language,
    input.status,
    codeHash
  ].join(':');
  
  const fingerprint = sha256(combined);
  return { fingerprint, codeHash };
}
