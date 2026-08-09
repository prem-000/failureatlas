/**
 * mcp/tests/tools.test.ts
 * Unit tests for 6 FailureAtlas MCP tools, input validation, and schema definitions
 */

import { TOOL_DEFINITIONS } from '../src/server';
import { handleGetMyProfile } from '../src/tools/profile';
import { handleGetMyRecentFailures, handleSearchMyFailures } from '../src/tools/failures';
import { handleGetMyWeaknesses } from '../src/tools/weaknesses';
import { handleGetFailureDiagnosis } from '../src/tools/diagnosis';
import { handleGetLearningRecommendations } from '../src/tools/recommendations';
import { ALL_FAILUREATLAS_SCOPES, FAILUREATLAS_SCOPES } from '../src/auth/scopes';
import { AuthenticatedUserSession } from '../src/types/index';
import { FailureAtlasMcpError } from '../src/utils/errors';

async function runToolTests() {
  console.log('🧪 Starting FailureAtlas MCP Tools Unit Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName}`);
      failed++;
    }
  }

  // 1. Validate Tool Registry
  assert(TOOL_DEFINITIONS.length === 6, 'TOOL_DEFINITIONS contains exactly 6 tools');
  const toolNames = TOOL_DEFINITIONS.map(t => t.name);
  assert(toolNames.includes('get_my_profile'), 'Tool get_my_profile registered');
  assert(toolNames.includes('get_my_recent_failures'), 'Tool get_my_recent_failures registered');
  assert(toolNames.includes('search_my_failures'), 'Tool search_my_failures registered');
  assert(toolNames.includes('get_my_weaknesses'), 'Tool get_my_weaknesses registered');
  assert(toolNames.includes('get_failure_diagnosis'), 'Tool get_failure_diagnosis registered');
  assert(toolNames.includes('get_learning_recommendations'), 'Tool get_learning_recommendations registered');

  const mockSession: AuthenticatedUserSession = {
    userId: 'user-a-123',
    email: 'usera@example.com',
    scopes: ALL_FAILUREATLAS_SCOPES,
  };

  const mockApiService: any = {
    async getUserProfile(userId: string) {
      return {
        user: { id: userId, name: 'User A', email: 'usera@example.com' },
        statistics: { totalSubmissions: 10, acceptedSubmissions: 6, acceptanceRate: 0.6 },
      };
    },
    async getRecentFailures(userId: string, options: any) {
      return [
        {
          id: 'fail-1',
          problem: { title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy', topics: ['array'] },
          platform: 'LeetCode',
          status: 'Wrong Answer',
          timestamp: new Date().toISOString(),
          rootCause: 'Boundary Condition',
          confidence: 0.9,
          weakness: 'Edge Case Reasoning',
          evidenceSummary: 'Array bounds missed',
        },
      ];
    },
    async searchFailures(userId: string, query: string, limit: number) {
      return { failures: [], totalMatches: 0 };
    },
    async getWeaknesses(userId: string) {
      return [
        { id: 'w1', name: 'Edge Case Reasoning', score: 0.85, frequency: 4, severity: 'high' },
      ];
    },
    async getFailureDiagnosis(userId: string, failureId: string) {
      if (failureId === 'other-user-failure') {
        throw FailureAtlasMcpError.failureNotFound();
      }
      return {
        failureId,
        problem: { title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' },
        status: 'Wrong Answer',
        rootCause: 'Boundary Error',
        confidence: 0.95,
        weakness: 'Edge Case Reasoning',
        evidence: [],
        explanation: 'Off-by-one index loop condition',
      };
    },
    async getLearningRecommendations(userId: string) {
      return [
        {
          weakness: 'Edge Case Reasoning',
          strategy: 'Boundary checklist',
          reason: 'Frequent WA',
          priority: 'high',
          practiceProblems: [],
        },
      ];
    },
  };

  // 2. Test Tool Handlers
  try {
    const profile = await handleGetMyProfile(mockSession, mockApiService, {});
    assert(profile.user.id === 'user-a-123', 'handleGetMyProfile executes successfully');

    const recent = await handleGetMyRecentFailures(mockSession, mockApiService, { limit: 5 });
    assert(recent.length === 1 && recent[0].id === 'fail-1', 'handleGetMyRecentFailures executes successfully');

    const search = await handleSearchMyFailures(mockSession, mockApiService, { query: 'binary search' });
    assert(Array.isArray(search.failures), 'handleSearchMyFailures executes successfully');

    const weaknesses = await handleGetMyWeaknesses(mockSession, mockApiService, {});
    assert(weaknesses.weaknesses.length === 1, 'handleGetMyWeaknesses executes successfully');

    const diagnosis = await handleGetFailureDiagnosis(mockSession, mockApiService, { failureId: 'fail-1' });
    assert(diagnosis.failureId === 'fail-1', 'handleGetFailureDiagnosis executes successfully');

    const recs = await handleGetLearningRecommendations(mockSession, mockApiService, {});
    assert(recs.recommendations.length === 1, 'handleGetLearningRecommendations executes successfully');

  } catch (e) {
    console.error('Tool handler test error:', e);
    failed++;
  }

  // 3. Test Missing Scope Enforcement
  try {
    const restrictedSession: AuthenticatedUserSession = {
      userId: 'user-a-123',
      email: 'usera@example.com',
      scopes: [FAILUREATLAS_SCOPES.PROFILE], // Missing diagnosis scope
    };

    let scopeBlocked = false;
    try {
      await handleGetFailureDiagnosis(restrictedSession, mockApiService, { failureId: 'fail-1' });
    } catch (e: any) {
      if (e instanceof FailureAtlasMcpError && e.code === 'INSUFFICIENT_SCOPE') scopeBlocked = true;
    }
    assert(scopeBlocked === true, 'handleGetFailureDiagnosis blocks session lacking diagnosis scope');
  } catch (e) {
    console.error('Scope enforcement test error:', e);
    failed++;
  }

  // 4. Test Invalid Input Validation
  try {
    let invalidInput = false;
    try {
      await handleGetFailureDiagnosis(mockSession, mockApiService, { failureId: '' });
    } catch (e: any) {
      if (e?.code === 'INVALID_INPUT') {
        invalidInput = true;
      }
    }
    assert(invalidInput === true, 'handleGetFailureDiagnosis validates non-empty failureId');
  } catch (e) {
    console.error('Input validation test error:', e);
    failed++;
  }

  console.log(`\n📊 Tools Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runToolTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
