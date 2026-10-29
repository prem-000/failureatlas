/**
 * src/app/api/knowledge/webhook/route.ts
 *
 * GitHub Webhook Ingestion Endpoint.
 * - Authenticates requests using X-Hub-Signature-256 HMAC-SHA256.
 * - Filters for supported events (ping, push).
 * - Durably persists jobs in PostgreSQL (ingestion_jobs) and Redis queue.
 * - Executes ingestion work asynchronously via Next.js after() to prevent Vercel timeouts.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { redis } from '@/lib/redis';
import { defaultKnowledgeIngestion } from '@/lib/knowledge/ingestion-service';
import { verifyGitHubSignature } from '@/lib/knowledge/webhook-verifier';

export const dynamic = 'force-dynamic';

/**
 * Health check & diagnostic GET handler
 */
export async function GET() {
  const secretConfigured = Boolean(process.env.GITHUB_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET);
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/knowledge/webhook',
    secretConfigured,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Main Webhook POST handler
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Server Configuration
    const secret = process.env.GITHUB_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    if (!secret) {
      console.error('[GitHub Webhook] Missing GITHUB_WEBHOOK_SECRET on server');
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook secret is not configured on the server. Please set GITHUB_WEBHOOK_SECRET.',
        },
        { status: 500 }
      );
    }

    // 2. Read Raw Request Body
    const rawBody = await request.text();
    if (!rawBody && rawBody !== '') {
      return NextResponse.json(
        { success: false, error: 'Empty payload received' },
        { status: 400 }
      );
    }

    // 3. Verify HMAC-SHA256 Signature
    const signature = request.headers.get('x-hub-signature-256');
    const verification = verifyGitHubSignature(rawBody, signature, secret);

    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          error: verification.reason || 'Invalid HMAC signature',
        },
        { status: 401 }
      );
    }

    // 4. Verify GitHub Event Type
    const event = request.headers.get('x-github-event') || 'push';

    if (event === 'ping') {
      return NextResponse.json({
        success: true,
        message: 'pong',
        receivedAt: new Date().toISOString(),
      });
    }

    if (event !== 'push') {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported GitHub event: '${event}'. Only 'push' and 'ping' events are handled.`,
        },
        { status: 400 }
      );
    }

    // 5. Parse and Validate JSON Payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload' },
        { status: 400 }
      );
    }

    const repoFullName = payload?.repository?.full_name;
    const defaultBranch = payload?.repository?.default_branch || 'main';

    if (!repoFullName || typeof repoFullName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid repository in payload' },
        { status: 400 }
      );
    }

    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) {
      return NextResponse.json(
        { success: false, error: 'Invalid repository format, expected owner/repo' },
        { status: 400 }
      );
    }

    // 6. Check if repository is tracked in knowledge_sources
    const source = await prisma.knowledgeSource.findUnique({
      where: { owner_repo: { owner, repo } },
    });

    if (!source) {
      return NextResponse.json(
        {
          success: true,
          message: `Repository ${repoFullName} is not tracked in knowledge sources. Ignored.`,
        },
        { status: 200 }
      );
    }

    // 7. Parse Changed / Added / Removed files
    const addedFiles = new Set<string>();
    const modifiedFiles = new Set<string>();
    const removedFiles = new Set<string>();

    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    for (const c of commits) {
      if (Array.isArray(c.added)) c.added.forEach((f: string) => addedFiles.add(f));
      if (Array.isArray(c.modified)) c.modified.forEach((f: string) => modifiedFiles.add(f));
      if (Array.isArray(c.removed)) c.removed.forEach((f: string) => removedFiles.add(f));
    }

    // Filter for supported formats (.csv, .md, .json)
    const isSupported = (path: string) =>
      path.endsWith('.csv') || path.endsWith('.md') || path.endsWith('.json');

    const filesToSync = Array.from(new Set([...addedFiles, ...modifiedFiles])).filter(isSupported);
    const filesToDelete = Array.from(removedFiles).filter(isSupported);

    // 8. Create Durable Job in PostgreSQL
    const job = await prisma.ingestionJob.create({
      data: {
        sourceId: source.id,
        jobType: 'webhook_sync',
        status: 'queued',
        progress: 0,
        recordsProcessed: 0,
        recordsCreated: 0,
      },
    });

    // 9. Replicate to Redis Queue if Redis is configured
    if (redis) {
      try {
        await redis.lpush(
          'queue:knowledge_jobs',
          JSON.stringify({
            jobId: job.id,
            sourceId: source.id,
            owner,
            repo,
            defaultBranch,
            filesToSync,
            filesToDelete,
            commitSha: payload.after || null,
            enqueuedAt: new Date().toISOString(),
          })
        );
      } catch (redisErr) {
        console.warn('[GitHub Webhook] Redis queue push failed, proceeding with DB job:', redisErr);
      }
    }

    // 10. Execute Job Asynchronously
    // When running inside Next.js / Vercel, after() keeps serverless context alive
    // while returning 202 immediately to GitHub. In standalone tests, it gracefully falls back.
    try {
      after(async () => {
        try {
          await defaultKnowledgeIngestion.processWebhookJob(job.id, {
            sourceId: source.id,
            owner,
            repo,
            defaultBranch,
            filesToSync,
            filesToDelete,
            commitSha: payload.after || null,
          });
        } catch (err) {
          console.error(`[GitHub Webhook] Async job processing failed for ${job.id}:`, err);
        }
      });
    } catch {
      // Outside Next.js request context (e.g. unit test runner)
      defaultKnowledgeIngestion
        .processWebhookJob(job.id, {
          sourceId: source.id,
          owner,
          repo,
          defaultBranch,
          filesToSync,
          filesToDelete,
          commitSha: payload.after || null,
        })
        .catch((err) => {
          console.error(`[GitHub Webhook] Fallback job execution failed for ${job.id}:`, err);
        });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Push event accepted and ingestion job queued',
        jobId: job.id,
        repository: repoFullName,
        filesToSyncCount: filesToSync.length,
        filesToDeleteCount: filesToDelete.length,
        syncedFiles: filesToSync,
        deletedFiles: filesToDelete,
      },
      { status: 202 }
    );
  } catch (err: any) {
    console.error('[GitHub Webhook] Fatal error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal webhook processing failed' },
      { status: 500 }
    );
  }
}
