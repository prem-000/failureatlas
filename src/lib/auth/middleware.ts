import { verifyToken, getTokenFromHeader } from './jwt';

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Extract and verify JWT from request headers.
 * Throws ApiError if token is missing or invalid.
 * Returns userId from verified token.
 */
export async function requireAuth(request: Request): Promise<string> {
  const authHeader = request.headers.get('authorization');
  const token = getTokenFromHeader(authHeader || undefined);

  if (!token) {
    throw new ApiError('Unauthorized: Missing or invalid authorization header', 401);
  }

  const payload = await verifyToken(token);
  if (!payload?.userId) {
    throw new ApiError('Unauthorized: Invalid or expired token', 401);
  }

  return payload.userId;
}

/**
 * Create a standardized error response.
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: `HTTP_${error.statusCode}`,
          message: error.message,
        },
      }),
      { status: error.statusCode, headers: { 'content-type': 'application/json' } },
    );
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
      },
    }),
    { status: 500, headers: { 'content-type': 'application/json' } },
  );
}

/**
 * Create a standardized success response.
 */
export function successResponse<T>(data: T, status = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    { status, headers: { 'content-type': 'application/json' } },
  );
}
