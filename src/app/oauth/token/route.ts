import { NextRequest, NextResponse } from 'next/server';
import { exchangeAuthorizationCode, renewAccessToken } from '../../../../mcp/src/auth/oauth';
import { FailureAtlasMcpError } from '../../../../mcp/src/utils/errors';

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, string> = {};

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    } else if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // Fallback try reading text / URLSearchParams
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        body[key] = value;
      });
    }

    const grantType = body.grant_type;

    if (grantType === 'authorization_code') {
      const code = body.code;
      const clientId = body.client_id;
      const redirectUri = body.redirect_uri;
      const codeVerifier = body.code_verifier;

      if (!code || !clientId || !redirectUri || !codeVerifier) {
        return NextResponse.json(
          {
            error: 'invalid_request',
            error_description: 'Missing code, client_id, redirect_uri, or code_verifier parameter.',
          },
          { status: 400 }
        );
      }

      const tokenResult = await exchangeAuthorizationCode({
        code,
        clientId,
        redirectUri,
        codeVerifier,
      });

      return NextResponse.json(tokenResult);
    } else if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token;

      if (!refreshToken) {
        return NextResponse.json(
          {
            error: 'invalid_request',
            error_description: 'Missing refresh_token parameter.',
          },
          { status: 400 }
        );
      }

      const tokenResult = await renewAccessToken(refreshToken);
      return NextResponse.json(tokenResult);
    } else {
      return NextResponse.json(
        {
          error: 'unsupported_grant_type',
          error_description: 'Only grant_type=authorization_code and grant_type=refresh_token are supported.',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof FailureAtlasMcpError) {
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: error.message,
        },
        { status: error.statusCode || 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: (error as Error).message || 'Unexpected token exchange error.',
      },
      { status: 500 }
    );
  }
}
