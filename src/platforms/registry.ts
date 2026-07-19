/**
 * Platform Adapter Registry
 *
 * Central registry that maps platform IDs to their adapters.
 * In browser context, auto-detects the current platform.
 * In server context, looks up by platform ID string.
 */

import type { PlatformAdapter, PlatformId } from '@/types/platform-adapter';
import { LeetCodeAdapter } from './leetcode/adapter';
import { TakeUForwardAdapter } from './takeuforward/adapter';
import { CodeforcesAdapter } from './codeforces/adapter';
import { HackerRankAdapter } from './hackerrank/adapter';
import { CodeChefAdapter } from './codechef/adapter';
import { AtCoderAdapter } from './atcoder/adapter';
import { GFGAdapter } from './gfg/adapter';

/** All registered platform adapters */
const ADAPTERS: PlatformAdapter[] = [
  new LeetCodeAdapter(),
  new TakeUForwardAdapter(),
  new CodeforcesAdapter(),
  new HackerRankAdapter(),
  new CodeChefAdapter(),
  new AtCoderAdapter(),
  new GFGAdapter(),
];

/** Map for O(1) lookup by platform ID */
const ADAPTER_MAP = new Map<PlatformId, PlatformAdapter>(
  ADAPTERS.map(a => [a.platformId, a])
);

/**
 * Get adapter by platform ID.
 * Used server-side when the platform is already known.
 */
export function getAdapter(platformId: PlatformId): PlatformAdapter {
  const adapter = ADAPTER_MAP.get(platformId);
  if (!adapter) {
    throw new Error(`No adapter registered for platform: ${platformId}`);
  }
  return adapter;
}

/**
 * Auto-detect the current platform from the browser environment.
 * Returns null if no platform matches.
 * Used by the extension content script.
 */
export function detectPlatform(location?: Location | { hostname: string; href: string }): PlatformAdapter | null {
  for (const adapter of ADAPTERS) {
    if (adapter.detect(location)) {
      return adapter;
    }
  }
  return null;
}

/**
 * Detect platform from an absolute URL string.
 */
export function detectPlatformFromUrl(url: string): PlatformAdapter | null {
  try {
    const parsed = new URL(url);
    return detectPlatform({ hostname: parsed.hostname, href: parsed.href });
  } catch {
    // Fallback: check plain substring
    for (const adapter of ADAPTERS) {
      if (adapter.detect({ hostname: url, href: url })) {
        return adapter;
      }
    }
    return null;
  }
}

/**
 * Get all registered platform IDs.
 */
export function listPlatforms(): PlatformId[] {
  return ADAPTERS.map(a => a.platformId);
}

/**
 * Check if a platform ID is supported.
 */
export function isPlatformSupported(platformId: string): platformId is PlatformId {
  return ADAPTER_MAP.has(platformId as PlatformId);
}
