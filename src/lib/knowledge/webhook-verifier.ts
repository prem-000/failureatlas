/**
 * src/lib/knowledge/webhook-verifier.ts
 *
 * Cryptographic verification for GitHub Webhook HMAC-SHA256 signatures.
 * Provides timing-safe comparisons to prevent timing attacks.
 */

import crypto from 'crypto';

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verify HMAC-SHA256 signature from GitHub webhook header `X-Hub-Signature-256`.
 *
 * @param rawBody - The unparsed string body of the incoming HTTP request.
 * @param signatureHeader - Value of `x-hub-signature-256` header (e.g., "sha256=abcdef...").
 * @param secret - The server-side webhook secret configured in GITHUB_WEBHOOK_SECRET.
 */
export function verifyGitHubSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string
): WebhookVerificationResult {
  if (!secret) {
    return { valid: false, reason: 'Server secret is not configured' };
  }

  if (!signatureHeader) {
    return { valid: false, reason: 'Missing X-Hub-Signature-256 header' };
  }

  if (!signatureHeader.startsWith('sha256=')) {
    return { valid: false, reason: 'Invalid signature prefix, expected sha256=' };
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const expectedDigest = `sha256=${hmac.update(rawBody, 'utf8').digest('hex')}`;

    const sigBuffer = Buffer.from(signatureHeader, 'utf8');
    const expectedBuffer = Buffer.from(expectedDigest, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: 'Signature length mismatch' };
    }

    const matches = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    if (!matches) {
      return { valid: false, reason: 'HMAC signature mismatch' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Verification error: ${err.message}` };
  }
}

/**
 * Helper to compute valid signature for automated tests and webhooks.
 */
export function computeGitHubSignature(rawBody: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  return `sha256=${hmac.update(rawBody, 'utf8').digest('hex')}`;
}
