import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';
import { notificationService } from '@/lib/notifications/notification.service';
import { NotificationType, NotificationCategory } from '@/lib/email/types';
import { isValidEmail } from '@/lib/email/security';

// ─── Structured log helper ────────────────────────────────────────────────────
function logGoogleOAuth(fields: {
  email: string;
  provider: string;
  newUser: boolean;
  notificationCreated?: boolean;
  notificationId?: string;
  smtpRecipient?: string;
  smtpStatus?: 'SENT' | 'FAILED' | 'SKIPPED' | 'NOT_ATTEMPTED';
  error?: string;
}) {
  console.log(
    [
      '[Google OAuth]',
      `  Email:                ${fields.email}`,
      `  Provider:             ${fields.provider}`,
      `  New User:             ${fields.newUser}`,
      `  Notification Created: ${fields.notificationCreated ?? 'N/A'}`,
      `  Notification ID:      ${fields.notificationId ?? 'N/A'}`,
      `  SMTP Recipient:       ${fields.smtpRecipient ?? 'N/A'}`,
      `  SMTP Status:          ${fields.smtpStatus ?? 'N/A'}`,
      ...(fields.error ? [`  Error:                ${fields.error}`] : []),
    ].join('\n')
  );
}

// ─── Welcome-email helper ─────────────────────────────────────────────────────
/**
 * Fires a WELCOME notification for a freshly created Google-OAuth user.
 *
 * Guards:
 *  1. email must exist and pass RFC-5322 validation
 *  2. provider must be "google"
 *  3. WELCOME notification must not already exist for this user
 *
 * Any failure is swallowed — it must never interrupt the OAuth sign-in flow.
 */
async function sendGoogleWelcomeEmail(userId: string, email: string, provider: string): Promise<void> {
  // Guard 1: email validity
  if (!email || !isValidEmail(email)) {
    logGoogleOAuth({
      email: email ?? '(none)',
      provider,
      newUser: true,
      notificationCreated: false,
      smtpStatus: 'NOT_ATTEMPTED',
      error: 'Invalid or missing email — WELCOME notification skipped',
    });
    return;
  }

  // Guard 2: provider must be google
  if (provider !== 'google') {
    logGoogleOAuth({
      email,
      provider,
      newUser: true,
      notificationCreated: false,
      smtpStatus: 'NOT_ATTEMPTED',
      error: `Provider is "${provider}", not "google" — WELCOME notification skipped`,
    });
    return;
  }

  // Guard 3: idempotency — check for an existing WELCOME notification
  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId,
      type: NotificationType.WELCOME,
    },
    select: { id: true },
  });

  if (existingNotification) {
    logGoogleOAuth({
      email,
      provider,
      newUser: true,
      notificationCreated: false,
      notificationId: existingNotification.id,
      smtpStatus: 'SKIPPED',
      error: 'WELCOME notification already exists for this user — skipped',
    });
    return;
  }

  // All guards passed — create and dispatch the notification
  const result = await notificationService.createAndProcess({
    userId,
    type: NotificationType.WELCOME,
    category: NotificationCategory.WELCOME,
    title: 'Welcome to Praxis 🚀',
    payload: {},
    dedupeKey: `welcome-${userId}`,
  });

  logGoogleOAuth({
    email,
    provider,
    newUser: true,
    notificationCreated: true,
    notificationId: result.notificationId,
    smtpRecipient: email,
    smtpStatus: result.processed ? 'SENT' : 'FAILED',
  });
}

export const authOptions: AuthOptions = {
  debug: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email;
        if (!email) return false;

        try {
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            // Returning user — update Google provider data, name, and image to keep in sync
            await prisma.user.update({
              where: { email },
              data: {
                provider: 'google',
                providerId: account.providerAccountId,
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
              },
            });

            logGoogleOAuth({
              email,
              provider: 'google',
              newUser: false,
              smtpStatus: 'NOT_ATTEMPTED',
            });

            return true;
          }

          // ── New user path ──────────────────────────────────────────────────
          const apiKey = `fa_${crypto.randomBytes(32).toString('hex')}`;
          const newUser = await prisma.user.create({
            data: {
              email,
              name: user.name,
              image: user.image,
              provider: 'google',
              providerId: account.providerAccountId,
              apiKey,
            },
          });

          // Send WELCOME email — failures are caught inside and must NOT block sign-in
          try {
            await sendGoogleWelcomeEmail(newUser.id, email, 'google');
          } catch (welcomeErr: unknown) {
            // Safety net: log but never propagate — requirement 9
            console.error(
              '[Google OAuth] ⚠️ WELCOME notification threw unexpectedly (sign-in unaffected):',
              welcomeErr instanceof Error ? welcomeErr.message : welcomeErr
            );
          }

          return true;
        } catch (error) {
          console.error('OAuth SignIn Error:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user?.email) {
        try {
          // Attach the user's ID to the session object by looking them up in the DB.
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, image: true },
          });
          if (dbUser) {
            session.user.id = dbUser.id;
            session.user.image = dbUser.image;
          }
        } catch (error) {
          console.error('OAuth Session Error:', error);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};


