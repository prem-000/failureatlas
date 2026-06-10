import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { jwtVerify } from 'jose';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export async function auth(req: NextRequest): Promise<AuthUser | null> {
  try {
    // Check API key header first
    const apiKey = req.headers.get('X-API-Key');
    if (apiKey) {
      const user = await prisma.user.findFirst({ where: { apiKey } });
      if (user) return { id: user.id, email: user.email, name: user.name };
    }

    // Check Bearer token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') 
      || req.cookies.get('auth-token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback-secret-change-in-production'
    );
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    if (!userId) return null;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    return { id: user.id, email: user.email, name: user.name };
  } catch {
    return null;
  }
}
