/**
 * CodeChef Platform Adapter — Stub
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  RawSubmission,
  EditorSnapshot,
  ProblemMetadata,
  NormalizedSubmission,
} from '@/types/platform-adapter';

export class CodeChefAdapter implements PlatformAdapter {
  readonly platformId = 'codechef' as const;
  readonly platformName = 'CodeChef';

  detect(location?: Location | { hostname: string; href: string }): boolean {
    const loc = location || (typeof window !== 'undefined' ? window.location : null);
    if (!loc) return false;
    return loc.hostname.includes('codechef.com');
  }

  async captureSubmission(): Promise<RawSubmission> {
    throw new Error('CodeChef adapter: captureSubmission() not yet implemented');
  }

  async captureEditor(): Promise<EditorSnapshot> {
    throw new Error('CodeChef adapter: captureEditor() not yet implemented');
  }

  async captureMetadata(): Promise<ProblemMetadata> {
    throw new Error('CodeChef adapter: captureMetadata() not yet implemented');
  }

  normalize(_raw: RawSubmission): NormalizedSubmission {
    throw new Error('CodeChef adapter: normalize() not yet implemented');
  }

  capabilities(): PlatformCapabilities {
    return {
      runtime: 'available',
      memory: 'missing',
      submissionId: 'available',
      testcases: 'partial',
    };
  }
}
