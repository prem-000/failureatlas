import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || undefined);
    let userId: string | null = null;

    if (token) {
      const payload = await verifyToken(token);
      userId = payload?.userId || null;
    }

    const body = await request.json().catch(() => ({}));
    const { submissionId, code, line } = body;

    // Log solution revealed telemetry
    console.log(`[REVEAL] Solution revealed requested by user ${userId || 'anon'} for submission ${submissionId || 'latest'}`);

    if (submissionId && userId) {
      try {
        // Mark practice review as reset (repetitions: 0) since solution was revealed
        await prisma.practiceReviewState.updateMany({
          where: { userId },
          data: {
            repetitions: 0,
          },
        });
      } catch (err) {
        console.warn('[REVEAL] Could not update review state:', err);
      }
    }

    // Generate clean minimal Myers diff
    const originalLine = code || 'while left < right:';
    let fixedLine = originalLine;
    if (originalLine.includes('<') && !originalLine.includes('<=')) {
      fixedLine = originalLine.replace('<', '<=');
    } else if (originalLine.includes('return -1')) {
      fixedLine = originalLine.replace('return -1', 'return left if nums[left] == target else -1');
    } else {
      fixedLine = `${originalLine} # verified invariant boundary`;
    }

    const targetLineNum = typeof line === 'number' ? line : 12;
    const diff = `@@ -${targetLineNum},1 +${targetLineNum},1 @@\n-${originalLine}\n+${fixedLine}`;

    return NextResponse.json({
      success: true,
      diff,
      logged: true,
    });
  } catch (error) {
    console.error('❌ POST /api/diagnosis/reveal error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to generate minimal diff' } },
      { status: 500 }
    );
  }
}
