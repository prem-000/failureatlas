/**
 * mcp/src/tools/diagnosis.ts
 * MCP Tool: get_failure_diagnosis (with strict resource ownership check)
 */

import { FailureAtlasApiService } from '../services/failureatlas-api';
import { requireScope, FAILUREATLAS_SCOPES } from '../auth/scopes';
import { AuthenticatedUserSession } from '../types/index';
import { validateSchema, failureDiagnosisInputSchema } from '../utils/validation';

export const getFailureDiagnosisDefinition = {
  name: 'get_failure_diagnosis',
  description:
    "Returns a structured failure diagnosis for a specific submission including root cause, confidence, primary weakness, supporting evidence, and concise explanation. Use this when the user asks for a detailed breakdown or diagnosis of a specific failure event.",
  inputSchema: {
    type: 'object',
    properties: {
      failureId: {
        type: 'string',
        description: 'Unique failure event ID, submission ID, or submission hash.',
      },
    },
    required: ['failureId'],
  },
};

export async function handleGetFailureDiagnosis(
  session: AuthenticatedUserSession,
  apiService: FailureAtlasApiService,
  args: unknown
) {
  requireScope(session.scopes, FAILUREATLAS_SCOPES.DIAGNOSIS_READ);
  const validated = validateSchema(failureDiagnosisInputSchema, args || {});
  return await apiService.getFailureDiagnosis(session.userId, validated.failureId);
}
