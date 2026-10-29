/**
 * src/app/api/webhooks/github/route.ts
 *
 * Route alias for GitHub Webhook endpoint to ensure compatibility
 * with configurations targeting /api/webhooks/github.
 * Delegates to canonical /api/knowledge/webhook route.
 */

export const dynamic = 'force-dynamic';
export { GET, POST } from '@/app/api/knowledge/webhook/route';
