/**
 * AtCoder Platform Adapter — Stub
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  RawSubmission,
  EditorSnapshot,
  ProblemMetadata,
  NormalizedSubmission,
} from '@/types/platform-adapter';

export class AtCoderAdapter implements PlatformAdapter {
  readonly platformId = 'atcoder' as const;
  readonly platformName = 'AtCoder';

  detect(location?: Location | { hostname: string; href: string }): boolean {
    const loc = location || (typeof window !== 'undefined' ? window.location : null);
    if (!loc) return false;
    return loc.hostname.includes('atcoder.jp');
  }

  async captureSubmission(): Promise<RawSubmission> {
    throw new Error('AtCoder adapter: captureSubmission() not yet implemented');
  }

  async captureEditor(): Promise<EditorSnapshot> {
    throw new Error('AtCoder adapter: captureEditor() not yet implemented');
  }

  async captureMetadata(): Promise<ProblemMetadata> {
    throw new Error('AtCoder adapter: captureMetadata() not yet implemented');
  }

  normalize(_raw: RawSubmission): NormalizedSubmission {
    throw new Error('AtCoder adapter: normalize() not yet implemented');
  }

  capabilities(): PlatformCapabilities {
    return {
      runtime: 'available',
      memory: 'available',
      submissionId: 'available',
      testcases: 'partial',
    };
  }
}
