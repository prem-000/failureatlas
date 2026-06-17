import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

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
            // Unconditionally update Google provider data, name, and image to keep in sync
            await prisma.user.update({
              where: { email },
              data: {
                provider: 'google',
                providerId: account.providerAccountId,
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
              },
            });
            return true;
          }

          // Create new user with API Key
          const apiKey = `fa_${crypto.randomBytes(32).toString('hex')}`;
          await prisma.user.create({
            data: {
              email,
              name: user.name,
              image: user.image,
              provider: 'google',
              providerId: account.providerAccountId,
              apiKey,
            },
          });
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
          // We can attach the user's ID to the session object
          // by looking them up in the DB.
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


