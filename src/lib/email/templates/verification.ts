import { renderBaseEmailLayout } from './common';
import { escapeHtml } from '../security';

export const TEMPLATE_VERSION = 1;

export interface VerificationEmailData {
  name?: string;
  verificationToken: string;
  baseUrl?: string;
}

export function generateHtml(data: VerificationEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const name = escapeHtml(data.name || 'Developer');
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(data.verificationToken)}`;

  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 12px;">
      ✉️ Verify Your Email Address
    </h1>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
      Hi ${name}, thank you for registering with Praxis! Please confirm your email address by clicking the button below to complete setting up your account.
    </p>

    <a href="${verifyUrl}" class="btn">Verify Email Address</a>

    <p style="font-size: 12px; color: #71717a; margin-top: 24px; line-height: 1.5;">
      If you did not create a Praxis account, no action is required.
    </p>
  `;

  return renderBaseEmailLayout({
    title: '✉️ Verify Your Praxis Email',
    badgeText: 'Account Verification',
    content,
    baseUrl,
  });
}

export function generateText(data: VerificationEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const name = data.name || 'Developer';
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(data.verificationToken)}`;

  return `Hi ${name},

Thank you for joining Praxis! Please verify your email address using the link below:

${verifyUrl}

If you did not create an account, you can safely ignore this message.
`;
}
