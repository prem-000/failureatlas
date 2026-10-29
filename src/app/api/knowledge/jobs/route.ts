/**
 * src/app/api/knowledge/jobs/route.ts
 *
 * Ingestion Jobs Monitoring and Processing Endpoint.
 * Allows inspecting durable job statuses and manually/automatically draining queued jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const status = searchParams.get('status') || undefined;

    const jobs = await prisma.ingestionJob.findMany({
      where: status ? { status } : undefined,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        source: {
          select: {
            owner: true,
            repo: true,
            url: true,
          },
        },
      },
    });

    const counts = await prisma.ingestionJob.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusCounts = counts.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      totalCount: jobs.length,
      statusCounts,
      jobs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to list jobs' },
      { status: 500 }
    );
  }
}
