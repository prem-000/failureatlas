/**
 * Platform Adapter Layer — Shared Types
 *
 * Re-exports the core adapter interface and capabilities types
 * for use by platform implementations and the registry.
 */

export type {
  CapabilityState,
  PlatformCapabilities,
  RawSubmission,
  EditorSnapshot,
  ProblemMetadata,
  NormalizedSubmission,
  PlatformId,
  PlatformAdapter,
} from '@/types/platform-adapter';
