/**
 * GeeksForGeeks Platform Adapter — Stub
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  RawSubmission,
  EditorSnapshot,
  ProblemMetadata,
  NormalizedSubmission,
} from '@/types/platform-adapter';

export class GFGAdapter implements PlatformAdapter {
  readonly platformId = 'gfg' as const;
  readonly platformName = 'GeeksForGeeks';

  detect(location?: Location | { hostname: string; href: string }): boolean {
    const loc = location || (typeof window !== 'undefined' ? window.location : null);
    if (!loc) return false;
    return (
      loc.hostname.includes('geeksforgeeks.org') ||
      loc.hostname.includes('practice.geeksforgeeks.org')
    );
  }

  async captureSubmission(): Promise<RawSubmission> {
    throw new Error('GFG adapter: captureSubmission() not yet implemented');
  }

  async captureEditor(): Promise<EditorSnapshot> {
    throw new Error('GFG adapter: captureEditor() not yet implemented');
  }

  async captureMetadata(): Promise<ProblemMetadata> {
    throw new Error('GFG adapter: captureMetadata() not yet implemented');
  }

  normalize(_raw: RawSubmission): NormalizedSubmission {
    throw new Error('GFG adapter: normalize() not yet implemented');
  }

  capabilities(): PlatformCapabilities {
    return {
      runtime: 'partial',
      memory: 'missing',
      submissionId: 'available',
      testcases: 'partial',
    };
  }
}
