import { NextResponse } from 'next/server';
import { gmailProvider } from '@/lib/email/gmail';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const environmentValid = Boolean(user && pass);

  const lastVerification = new Date().toISOString();

  if (!environmentValid) {
    return NextResponse.json(
      {
        healthy: false,
        provider: 'gmail',
        smtpConnected: false,
        authenticated: false,
        environmentValid: false,
        error: 'GMAIL_USER or GMAIL_APP_PASSWORD environment variable is missing',
        lastVerification,
      },
      { status: 500 }
    );
  }

  const isConnected = await gmailProvider.verify();

  if (!isConnected) {
    return NextResponse.json(
      {
        healthy: false,
        provider: 'gmail',
        smtpConnected: false,
        authenticated: false,
        environmentValid: true,
        error: 'Failed to verify Nodemailer SMTP authentication connection',
        lastVerification,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      healthy: true,
      provider: 'gmail',
      smtpConnected: true,
      authenticated: true,
      environmentValid: true,
      lastVerification,
    },
    { status: 200 }
  );
}
