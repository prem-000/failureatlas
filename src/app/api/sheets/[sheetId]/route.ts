import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { PracticeSheet } from '@/types/sheets';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sheetId: string }> }
) {
  try {
    const { sheetId } = await params;
    const cleanSheetId = sheetId.trim().toLowerCase();
    const filePath = path.join(process.cwd(), 'data', 'sheets', `${cleanSheetId}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: `Sheet '${sheetId}' not found` },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const sheet: PracticeSheet = JSON.parse(raw);

    return NextResponse.json(sheet, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to load sheet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read sheet data' },
      { status: 500 }
    );
  }
}
