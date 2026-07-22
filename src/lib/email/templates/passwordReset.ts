import { renderBaseEmailLayout } from './common';
import { escapeHtml } from '../security';

export const TEMPLATE_VERSION = 1;

export interface PasswordResetEmailData {
  name?: string;
  resetToken: string;
  baseUrl?: string;
}

export function generateHtml(data: PasswordResetEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const name = escapeHtml(data.name || 'User');
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(data.resetToken)}`;

  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 12px;">
      🔒 Reset Your Password
    </h1>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
      Hi ${name}, we received a request to reset the password for your Praxis account. Click the button below to set a new password. This link will expire in 1 hour.
    </p>

    <a href="${resetUrl}" class="btn">Reset Password</a>

    <p style="font-size: 12px; color: #71717a; margin-top: 24px; line-height: 1.5;">
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;

  return renderBaseEmailLayout({
    title: '🔒 Reset Your Praxis Password',
    badgeText: 'Security',
    content,
    baseUrl,
  });
}

export function generateText(data: PasswordResetEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const name = data.name || 'User';
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(data.resetToken)}`;

  return `Hi ${name},

We received a request to reset the password for your Praxis account. Use the link below to set a new password (expires in 1 hour):

${resetUrl}

If you did not request a password reset, you can safely ignore this email.
`;
}
