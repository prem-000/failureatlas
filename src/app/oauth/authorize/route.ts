import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth';
import { resolveUserId } from '@/lib/auth/resolve-user';
import { generateAuthorizationCode } from '../../../../mcp/src/auth/oauth';
import { ALL_FAILUREATLAS_SCOPES } from '../../../../mcp/src/auth/scopes';
import { FailureAtlasScope } from '../../../../mcp/src/types/index';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const scopeParam = searchParams.get('scope');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  if (!clientId || !redirectUri || responseType !== 'code' || !codeChallenge) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameters (client_id, redirect_uri, response_type=code, code_challenge).',
      },
      { status: 400 }
    );
  }

  if (codeChallengeMethod && codeChallengeMethod !== 'S256') {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Only PKCE code_challenge_method=S256 is supported.',
      },
      { status: 400 }
    );
  }

  // 1. Try resolving NextAuth session
  let userId: string | null = null;
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    // 2. Try resolveUserId helper (JWT / API Key)
    const resolved = await resolveUserId(request);
    userId = resolved.userId;
  }

  if (!userId) {
    const callbackUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  // Parse requested scopes or grant all default FailureAtlas scopes
  const requestedScopes = scopeParam
    ? (scopeParam.split(' ').filter(s => ALL_FAILUREATLAS_SCOPES.includes(s as FailureAtlasScope)) as FailureAtlasScope[])
    : ALL_FAILUREATLAS_SCOPES;

  const code = await generateAuthorizationCode({
    clientId,
    redirectUri,
    userId,
    scopes: requestedScopes.length > 0 ? requestedScopes : ALL_FAILUREATLAS_SCOPES,
    codeChallenge,
    codeChallengeMethod: 'S256',
  });

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectUrl);
}
