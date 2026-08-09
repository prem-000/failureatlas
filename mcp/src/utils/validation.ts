/**
 * mcp/src/utils/validation.ts
 * Schema validation utilities using Zod
 */

import { z } from 'zod';
import { FailureAtlasMcpError } from './errors';

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues || (result.error as any).errors || [];
    const errorDetails = issues
      .map((e: any) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw FailureAtlasMcpError.invalidInput(errorDetails || 'Validation failed');
  }
  return result.data;
}

export const recentFailuresInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(10),
  topic: z.string().optional(),
  status: z.string().optional(),
});

export const searchFailuresInputSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export const failureDiagnosisInputSchema = z.object({
  failureId: z.string().min(1, 'failureId is required'),
});
