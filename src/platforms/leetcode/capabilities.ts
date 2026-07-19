/**
 * LeetCode Platform Capabilities
 *
 * LeetCode exposes all major signals:
 * - Runtime (ms) — always available
 * - Memory (MB) — always available
 * - Submission ID — always available
 * - Test case results — always available
 */

import type { PlatformCapabilities } from '@/types/platform-adapter';

export const LEETCODE_CAPABILITIES: PlatformCapabilities = {
  runtime: 'available',
  memory: 'available',
  submissionId: 'available',
  testcases: 'available',
};
