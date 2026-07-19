/**
 * Codeforces Platform Adapter — Stub
 *
 * Codeforces uses plain HTML textarea editors.
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  RawSubmission,
  EditorSnapshot,
  ProblemMetadata,
  NormalizedSubmission,
} from '@/types/platform-adapter';

export class CodeforcesAdapter implements PlatformAdapter {
  readonly platformId = 'codeforces' as const;
  readonly platformName = 'Codeforces';

  detect(location?: Location | { hostname: string; href: string }): boolean {
    const loc = location || (typeof window !== 'undefined' ? window.location : null);
    if (!loc) return false;
    return loc.hostname.includes('codeforces.com');
  }

  async captureSubmission(): Promise<RawSubmission> {
    throw new Error('Codeforces adapter: captureSubmission() not yet implemented');
  }

  async captureEditor(): Promise<EditorSnapshot> {
    throw new Error('Codeforces adapter: captureEditor() not yet implemented');
  }

  async captureMetadata(): Promise<ProblemMetadata> {
    throw new Error('Codeforces adapter: captureMetadata() not yet implemented');
  }

  normalize(_raw: RawSubmission): NormalizedSubmission {
    throw new Error('Codeforces adapter: normalize() not yet implemented');
  }

  capabilities(): PlatformCapabilities {
    return {
      runtime: 'available',
      memory: 'available',
      submissionId: 'available',
      testcases: 'partial', // Codeforces shows first failing test only
    };
  }
}
