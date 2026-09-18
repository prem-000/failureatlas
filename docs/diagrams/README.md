# Praxis Multi-Adapter Submission Intelligence — Architecture Diagrams

> Visual architecture documentation for the multi-adapter capture system  
> **Platforms:** LeetCode · HackerRank · GeeksForGeeks

---

## Diagram Index

| # | Diagram | File | Description |
|---|---------|------|-------------|
| 01 | **High-Level Architecture** | [`01-high-level-architecture.svg`](./01-high-level-architecture.svg) | Complete system from platform capture to PostgreSQL + intelligence pipeline |
| 02 | **Platform Router Flow** | [`02-platform-router-flow.svg`](./02-platform-router-flow.svg) | How the extension selects the correct adapter based on URL |
| 03 | **Evidence Pipeline** | [`03-evidence-pipeline.svg`](./03-evidence-pipeline.svg) | Evidence collection, merge priorities, and canonical event creation |
| 04 | **Lifecycle State Machine** | [`04-lifecycle-state-machine.svg`](./04-lifecycle-state-machine.svg) | Submission state transitions with terminal-state protection |
| 05 | **Multi-Tab Isolation** | [`05-multi-tab-isolation.svg`](./05-multi-tab-isolation.svg) | Concurrent tab context isolation and bounded worker delivery |
| 06 | **Status Normalization** | [`06-status-normalization.svg`](./06-status-normalization.svg) | Cross-platform status mapping to unified Praxis statuses |
| 07 | **Final Layered Architecture** | [`07-final-layered-architecture.svg`](./07-final-layered-architecture.svg) | Platform → Evidence → Correlation → Delivery → API → DB → Intelligence |
| 08 | **HackerRank Submission Flow** | [`08-hackerrank-submission-flow.svg`](./08-hackerrank-submission-flow.svg) | Full sequence of a single HackerRank submission capture |
| 09 | **Dedup & Traffic Classification** | [`09-dedup-and-traffic.svg`](./09-dedup-and-traffic.svg) | Multi-level deduplication and network traffic filtering |
| 10 | **Extension Lifecycle** | [`10-extension-lifecycle.svg`](./10-extension-lifecycle.svg) | Per-tab lifecycle and SPA navigation adapter reset flow |

---

## Core Architecture Principle

```
Adapters know platform-specific behavior.
The core pipeline knows submissions.
```

Adding a new platform (e.g. CodeChef) requires only:

```
NewPlatformAdapter → same common pipeline
```

No changes to the evidence merger, lifecycle manager, deduplication, queue, or analysis pipeline.

---

## System Overview

```
LeetCode ───────┐
HackerRank ─────┼──> Platform Adapter ──> Evidence Pipeline
GeeksForGeeks ──┘
                                      │
                                      ▼
                              Canonical Event
                                      │
                                      ▼
                           Correlation + Lifecycle
                                      │
                                      ▼
                              Deduplication
                                      │
                                      ▼
                              Local Queue
                                      │
                                      ▼
                              Praxis API
                                      │
                                      ▼
                                PostgreSQL
                                      │
                                      ▼
                          Existing Praxis Analysis
```

---

## Directory Structure

```
apps/extension/
├── manifest.json
├── src/
│   ├── content.ts                    # Entry point — bootstraps Platform Router
│   ├── background.ts                 # Service worker — queue, API client
│   ├── popup.ts
│   │
│   ├── adapters/
│   │   ├── base/
│   │   │   ├── PlatformAdapter.ts    # Common adapter interface
│   │   │   ├── types.ts              # Evidence types, Platform enum
│   │   │   ├── normalizer.ts         # Language/status normalization base
│   │   │   └── lifecycle.ts          # State machine engine
│   │   │
│   │   ├── leetcode/
│   │   │   ├── adapter.ts            # LeetCodeAdapter — wraps existing impl
│   │   │   ├── editor.ts             # Monaco capture (existing)
│   │   │   ├── network.ts            # GraphQL/REST intercept
│   │   │   ├── result.ts             # DOM mutation observer
│   │   │   └── problem.ts            # Slug/title/difficulty extraction
│   │   │
│   │   ├── hackerrank/
│   │   │   ├── adapter.ts            # HackerRankAdapter
│   │   │   ├── editor.ts             # Monaco safe capture + fallback
│   │   │   ├── network.ts            # REST API intercept
│   │   │   ├── result.ts             # Result DOM/network detection
│   │   │   └── problem.ts            # Challenge slug from URL
│   │   │
│   │   └── geeksforgeeks/
│   │       ├── adapter.ts            # GFGAdapter
│   │       ├── editor.ts             # Ace editor capture
│   │       ├── network.ts            # GFG API intercept
│   │       ├── result.ts             # Result + runtime extraction
│   │       └── problem.ts            # Problem slug/title from URL+DOM
│   │
│   ├── capture/
│   │   ├── evidence-merger.ts        # Combines multi-source evidence
│   │   ├── snapshot-buffer.ts        # Sliding window editor snapshots
│   │   ├── traffic-classifier.ts     # Filters irrelevant network traffic
│   │   └── submission-correlator.ts  # Tab+platform+ID correlation
│   │
│   ├── state/
│   │   ├── submission-context.ts     # Per-tab context manager
│   │   ├── lifecycle-manager.ts      # Terminal-state protection
│   │   └── dedup.ts                  # Multi-level deduplication
│   │
│   └── queue/
│       ├── persistent-queue.ts       # chrome.storage.local queue
│       └── queue-worker.ts           # Bounded concurrent workers
```

---

## Canonical Submission Event

Every platform produces this single normalized event:

```typescript
interface CanonicalSubmissionEvent {
  eventId: string;
  platform: "leetcode" | "hackerrank" | "geeksforgeeks";
  platformSubmissionId?: string;
  problem: {
    slug?: string;
    title?: string;
    url: string;
  };
  code: string;
  language: string;
  submissionStatus: SubmissionStatus;
  runtime?: number;
  memory?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  evidence: {
    editor: boolean;
    network: boolean;
    dom: boolean;
    event: boolean;
    result: boolean;
    problem: boolean;
  };
  capturedAt: number;
  fingerprint: string;
}
```

---

## Implementation Milestones

| Phase | Milestone | Description |
|-------|-----------|-------------|
| M1 | Common Foundation | `PlatformAdapter`, `PlatformRouter`, `CanonicalSubmissionEvent`, evidence types |
| M2 | Capture Infrastructure | `TrafficClassifier`, `SnapshotBuffer`, `EvidenceMerger`, `SubmissionCorrelator` |
| M3 | Reliability Layer | `SubmissionContextManager`, `LifecycleManager`, `Deduplication`, `PersistentQueue` |
| M4 | LeetCode Integration | Wrap existing implementation behind adapter interface, verify all tests pass |
| M5 | HackerRank Integration | Move validated prototype into `HackerRankAdapter`, fix slug/title/URL |
| M6 | GFG Integration | Move validated prototype into `GFGAdapter`, fix `CALCULATED` lifecycle |
| M7 | Backend Integration | Connect `CanonicalSubmissionEvent` → `/api/submissions` → PostgreSQL |
| M8 | Problem Navigation | Platform-aware problem URLs throughout Praxis UI |
| M9 | Concurrency Testing | LeetCode + HackerRank + GFG simultaneous tab testing |
| M10 | Regression Testing | Verify existing analysis pipeline works with all three platforms |

---

## Regenerating Diagrams

The Mermaid source files are in [`mmd/`](./mmd/). To regenerate SVGs:

```bash
node docs/diagrams/render-diagrams.mjs
```

Requires `@mermaid-js/mermaid-cli` (auto-installed via `npx`).

---

## Related Docs

- [Extension Architecture](../EXTENSION.md)
- [API Documentation](../API.md)
- [System Architecture](../ARCHITECTURE.md)
- [Algorithms](../ALGORITHMS.md)
- [Graph Schema](../GRAPH_SCHEMA.md)
