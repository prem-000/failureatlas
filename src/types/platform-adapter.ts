/**
 * Platform Adapter Types
 *
 * Defines the contract every platform adapter must implement.
 * Each adapter isolates platform-specific logic from the analysis engine.
 * Normalization lives inside the adapter — the shared pipeline never branches on platform.
 */

// ─── Capability Modeling ──────────────────────────────────────────────────────

/**
 * A platform might support a signal fully, not at all, or only for
 * certain languages / intermittently. This allows richer-than-boolean modeling.
 */
export type CapabilityState = 'available' | 'missing' | 'partial';

/**
 * Declares what signals a platform can provide.
 * The UI reads this to decide what to render (e.g. hide memory chart if 'missing').
 */
export interface PlatformCapabilities {
  runtime: CapabilityState;
  memory: CapabilityState;
  submissionId: CapabilityState;
  testcases: CapabilityState;
}

// ─── Raw / Normalized Submission ──────────────────────────────────────────────

/**
 * Platform-specific raw submission before normalization.
 * Each adapter defines its own shape internally, but passes it through
 * normalize() to produce a NormalizedSubmission.
 */
export interface RawSubmission {
  /** Adapter can store any platform-specific fields here */
  [key: string]: unknown;
}

/**
 * Editor state snapshot captured from the platform's code editor.
 */
export interface EditorSnapshot {
  code: string;
  language: string;
  cursorPosition?: { line: number; column: number };
  timestamp: number;
}

/**
 * Problem metadata extracted from the platform's DOM / API.
 */
export interface ProblemMetadata {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  url: string;
  constraints?: string;
  description?: string;
}

/**
 * The unified normalized submission shape produced by every adapter's normalize().
 * Schema version is explicit so extension ↔ backend can evolve independently.
 */
export interface NormalizedSubmission {
  /** Schema version — incremented on breaking changes */
  version: number;
  /** Platform identifier (e.g. 'leetcode', 'codeforces') */
  platform: string;
  /** Platform's own submission ID, if available */
  externalSubmissionId: string | null;
  /** Problem identifier (slug or platform-specific ID) */
  problemId: string;
  /** Human-readable problem title */
  title: string;
  /** Programming language */
  language: string;
  /** Submitted code */
  code: string;
  /** Submission verdict */
  status: string;
  /** Runtime in milliseconds, null if platform doesn't provide */
  runtime: number | null;
  /** Memory in MB, null if platform doesn't provide */
  memory: number | null;
  /** ISO timestamp */
  timestamp: string;
  /** Test cases passed, null if unavailable */
  testCasesPassed: number | null;
  /** Total test cases, null if unavailable */
  totalTestCases: number | null;
  /** Failed test case input, null if unavailable */
  failedTestCase: string | null;
}

// ─── Platform Adapter Interface ───────────────────────────────────────────────

/**
 * Supported platform identifiers.
 */
export type PlatformId =
  | 'leetcode'
  | 'takeuforward'
  | 'codeforces'
  | 'hackerrank'
  | 'codechef'
  | 'atcoder'
  | 'gfg';

/**
 * Every platform adapter must implement this interface.
 *
 * The shared pipeline calls these methods; platform-specific quirks
 * are contained inside the adapter. If the pipeline ever needs to
 * branch on `platform === "leetcode"`, that branching logic belongs
 * inside the adapter's normalize() instead.
 */
export interface PlatformAdapter {
  /** Unique platform identifier */
  readonly platformId: PlatformId;

  /** Human-readable platform name */
  readonly platformName: string;

  detect(location?: Location | { hostname: string; href: string }): boolean;

  /**
   * Capture the raw submission data from the platform.
   * Platform-specific — may read DOM, intercept network, etc.
   */
  captureSubmission(): Promise<RawSubmission>;

  /**
   * Capture the current editor state.
   */
  captureEditor(): Promise<EditorSnapshot>;

  /**
   * Extract problem metadata from the platform's page.
   */
  captureMetadata(): Promise<ProblemMetadata>;

  /**
   * Convert platform-specific raw submission into the unified schema.
   * Normalization logic lives here — not in a central normalizer.
   */
  normalize(raw: RawSubmission): NormalizedSubmission;

  /**
   * Declare what signals this platform can provide.
   */
  capabilities(): PlatformCapabilities;
}
