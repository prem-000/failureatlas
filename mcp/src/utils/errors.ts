/**
 * mcp/src/utils/errors.ts
 * FailureAtlas MCP Custom Error handling
 */

import { McpErrorCode } from '../types/index';

export class FailureAtlasMcpError extends Error {
  public readonly code: McpErrorCode;
  public readonly statusCode: number;

  constructor(code: McpErrorCode, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'FailureAtlasMcpError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, FailureAtlasMcpError.prototype);
  }

  public toResponsePayload() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }

  public static notAuthenticated(message: string = 'Authentication required.'): FailureAtlasMcpError {
    return new FailureAtlasMcpError('NOT_AUTHENTICATED', message, 401);
  }

  public static notAuthorized(message: string = 'Access denied for this resource.'): FailureAtlasMcpError {
    return new FailureAtlasMcpError('NOT_AUTHORIZED', message, 403);
  }

  public static insufficientScope(requiredScope: string): FailureAtlasMcpError {
    return new FailureAtlasMcpError(
      'INSUFFICIENT_SCOPE',
      `Insufficient scope. Required scope: ${requiredScope}`,
      403
    );
  }

  public static userNotFound(): FailureAtlasMcpError {
    return new FailureAtlasMcpError('USER_NOT_FOUND', 'Authenticated user account not found.', 404);
  }

  public static failureNotFound(): FailureAtlasMcpError {
    return new FailureAtlasMcpError('FAILURE_NOT_FOUND', 'Failure event not found or access denied.', 404);
  }

  public static invalidInput(message: string): FailureAtlasMcpError {
    return new FailureAtlasMcpError('INVALID_INPUT', `Invalid input: ${message}`, 400);
  }

  public static apiUnavailable(message: string = 'FailureAtlas API is temporarily unavailable.'): FailureAtlasMcpError {
    return new FailureAtlasMcpError('FAILUREATLAS_API_UNAVAILABLE', message, 503);
  }

  public static internalError(message: string = 'An unexpected internal error occurred.'): FailureAtlasMcpError {
    return new FailureAtlasMcpError('INTERNAL_ERROR', message, 500);
  }
}
