import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { runOfflineRetraining } from '@/lib/feedback/retraining';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret from headers if configured
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.CRON_SECRET;
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const report = await runOfflineRetraining(prisma as any);
    
    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('[Retrain Cron] Retraining failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Retraining failed',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
