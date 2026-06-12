# 🗺 FailureAtlas — Graph System Deep Dive

## How the Knowledge Graph is Built, Stored & Rendered

> **In one sentence:** FailureAtlas implements a 6-layer **directed acyclic knowledge graph** stored entirely in PostgreSQL, scored with a custom **PageRank algorithm**, retrieved with **Hybrid RAG** (semantic cosine similarity + structural graph matching), and rendered interactively with **React Flow**.

---

## 1. Why a Graph?

A flat submission log tells you *what* you got wrong. A graph tells you *why* — and shows the chain from a specific code mistake all the way to a recurring systemic weakness in your thinking. By modeling the relationships between Problems → Failures → Evidence → Root Causes → Weaknesses → Strategies as nodes and directed edges, FailureAtlas can:

- Surface **recurring patterns** across dozens of unrelated problems
- Rank weaknesses by **propagated importance** (not just raw count)
- Find **similar past failures** using both semantic content and structural graph structure
- Generate a **visual ontology** you can explore, filter, and export

---

## 2. Graph Storage — PostgreSQL as a Graph Database

We do **not** use Neo4j or any native graph database. The entire graph is stored in **PostgreSQL 16** via **Prisma ORM**, using relational foreign keys to model directed edges.

### 2.1 Node Types (Prisma Models)

| Node Type | Prisma Model | What it represents |
|---|---|---|
| `Problem` | `Problem` | A LeetCode problem (slug, title, difficulty, topics) |
| `FailureEvent` | `SubmissionEvent` | One failed submission attempt |
| `Evidence` | `Evidence` | A piece of extracted diagnostic signal (code diff, behavioral, test failure) |
| `RootCause` | `RootCauseHypothesis` | A Bayesian hypothesis about *why* the failure occurred |
| `Weakness` | `SystemicWeakness` | A long-term gap category (e.g. "Edge Case Reasoning") |
| `LearningStrategy` | `LearningStrategy` | A targeted learning action to fix the weakness |

### 2.2 Edge Types (Relational Foreign Keys)

```
Problem  ──[TRIGGERED]──►  FailureEvent
                                │
                         [HAS_EVIDENCE]
                                │
                                ▼
                           Evidence
                                │
                           [SUGGESTS]
                                │
                                ▼
                           RootCause
                                │
                           [INDICATES]
                                │
                                ▼
                           Weakness
                                │
                          [ADDRESSED_BY]
                                │
                                ▼
                        LearningStrategy
```

Each arrow is a PostgreSQL foreign key with `ON DELETE CASCADE`. The `animated` flag on `TRIGGERED` and `HAS_EVIDENCE` edges is rendered as a flowing particle animation in React Flow.

### 2.3 Schema Excerpt (Key Relationships)

```prisma
model SubmissionEvent {
  userId    String
  problemId String                       // → Problem (TRIGGERED edge)
  evidence  Evidence[]                   // → Evidence (HAS_EVIDENCE edges)
  diagnosis DiagnosisResult?
}

model Evidence {
  submissionId        String
  rootCauseHypotheses RootCauseHypothesis[]  // → RootCause (SUGGESTS edges)
}

model SystemicWeakness {
  pageRankScore Float @default(0)        // Computed by PageRank algorithm
  frequency     Int   @default(0)        // Raw failure count
  strategies    LearningStrategy[]       // → LearningStrategy (ADDRESSED_BY edges)
}
```

---

## 3. Graph Construction — `src/lib/graph/operations.ts`

Every time a submission is recorded, the graph is built implicitly through Prisma relations. The `getUserFailureSubgraph()` function materialises it on-demand:

```typescript
// Traversal order: Submission → Evidence → RootCauseHypotheses → Diagnosis → Weakness → Strategies
const submissions = await prisma.submissionEvent.findMany({
  where: { userId },
  include: {
    problem: true,
    evidence: { include: { rootCauseHypotheses: true } },
    diagnosis: { include: { primaryWeakness: { include: { strategies: true } } } }
  }
});
```

### 3.1 Node Deduplication

Because multiple failures can map to the same weakness, all node IDs are prefixed by type and deduplicated with `Set<string>`:

```typescript
const problemId = `problem-${sub.problem.slug}`;
if (!addedProblems.has(problemId)) {
  problemsList.push({ id: problemId, nodeType: 'Problem', ... });
  addedProblems.add(problemId);
}
```

Similarly, edges are deduplicated using a `Set<string>` keyed by `${source}-${target}`.

### 3.2 Root Cause → Weakness Mapping

Root cause types (from Bayesian inference) are mapped to the 4 canonical weakness categories:

```typescript
const ROOT_CAUSE_TO_WEAKNESS = {
  'boundary-condition-error':     { id: 'edge-case-reasoning',            name: 'Edge Case Reasoning' },
  'input-output-handling-error':  { id: 'edge-case-reasoning',            name: 'Edge Case Reasoning' },
  'pattern-recognition-gap':      { id: 'algorithmic-pattern-recognition', name: 'Algorithmic Pattern Recognition' },
  'algorithm-selection-mistake':  { id: 'algorithmic-pattern-recognition', name: 'Algorithmic Pattern Recognition' },
  'time-complexity-oversight':    { id: 'performance-analysis',           name: 'Performance Analysis' },
  'space-complexity-oversight':   { id: 'performance-analysis',           name: 'Performance Analysis' },
  'data-structure-mismatch':      { id: 'performance-analysis',           name: 'Performance Analysis' },
  'implementation-detail-error':  { id: 'implementation-precision',       name: 'Implementation Precision' },
};
```

### 3.3 Auto-Layout

Nodes are positioned in a **6-column layout** (one column per node type), with vertical spacing of 130px:

```typescript
const columns = [
  { list: problemsList,   x: 50   },   // Column 1
  { list: failuresList,   x: 300  },   // Column 2
  { list: evidencesList,  x: 550  },   // Column 3
  { list: rootCausesList, x: 800  },   // Column 4
  { list: weaknessesList, x: 1050 },   // Column 5
  { list: strategiesList, x: 1300 },   // Column 6
];
```

The frontend also supports a **Vertical Flow** toggle that recalculates positions to top-to-bottom stages.

---

## 4. PageRank Algorithm — `src/lib/graph/pagerank.ts`

### 4.1 Why PageRank?

Raw frequency tells you which weakness appeared most often. PageRank tells you which weakness is most *influential* — factoring in how strongly each failure "votes" for it and how recently those failures occurred.

### 4.2 Graph Structure for PageRank

The bipartite subgraph used for PageRank:

```
FailureNode_A ──weight(confidence × recency)──► WeaknessNode_X
FailureNode_B ──weight──────────────────────────► WeaknessNode_X
FailureNode_B ──weight──────────────────────────► WeaknessNode_Y
```

- **Nodes:** Unique failure events + unique weakness categories
- **Edges:** `FailureEvent → Weakness` (from root cause mappings)
- **Edge weight:** `confidence × recencyWeight`

### 4.3 Recency Weighting (Exponential Decay)

Failures from 30 days ago count half as much as today's:

```typescript
function calculateRecencyWeight(lastFailureDate: string): number {
  const daysAgo = Math.ceil(|now - lastDate| / (1000 * 60 * 60 * 24));
  return Math.exp(-daysAgo / 30.0);   // 30-day half-life
}
```

| Days ago | Weight |
|---|---|
| 0 | 1.00 |
| 7 | 0.79 |
| 30 | 0.37 |
| 60 | 0.14 |
| 90 | 0.05 |

### 4.4 Power Iteration (Damping = 0.85, max 100 iterations)

```typescript
// Standard PageRank formula:
// PR(w) = (1 - d) / N  +  d × Σ [ PR(f) × weight(f→w) / outDegree(f) ]
const newScore = (1 - damping) / weaknessArray.length + damping * rankSum;
```

The algorithm runs bidirectionally — weaknesses also propagate score back to failures — until convergence (`maxDiff < 1e-6`).

### 4.5 Persistence

After each PageRank run, scores are written back to PostgreSQL:

```typescript
await prisma.systemicWeakness.upsert({
  where: { name: weaknessId },
  update: { pageRankScore: prScore, frequency: freq, lastOccurrence: lastOcc },
  create: { ... }
});
```

This means the `SystemicWeakness` table always has up-to-date PageRank scores available for the Groq AI prompt and the `/api/graph/weaknesses` endpoint.

---

## 5. Hybrid RAG Retrieval — `src/lib/rag/retrieval.ts`

When generating an AI diagnosis, the system retrieves the **most similar past failures** using two parallel signals fused together.

### 5.1 Branch A — Semantic Embedding Similarity

1. Build a text representation of the current failure:
   ```
   Problem: Two Sum (Easy)
   Topics: Array, Hash Table
   Status: Wrong Answer
   Code: [full submission code]
   Failed Test Case: [3,3] → expected 1
   ```
2. Generate a vector embedding (stored in `TextEmbedding` table as `Json`)
3. Compute **cosine similarity** against all stored embeddings:
   ```typescript
   function cosineSimilarity(a: number[], b: number[]): number {
     return dotProduct(a, b) / (magnitude(a) * magnitude(b));
   }
   ```

### 5.2 Branch B — Structural Graph Similarity

Score each past submission based on graph-structural overlap:

```typescript
const score = (sameProblem ? 2.5 : 0.0) + sharedCount * 3.5;
//              ^ same problem ID bonus    ^ shared root cause types × 3.5
```

### 5.3 Hybrid Fusion (α = 0.6)

```typescript
let hybridScore = alpha * semanticScore + (1 - alpha) * graphScore;
//                  60% semantic              40% structural

// 20% bonus when a failure appears in BOTH branches
if (semanticMap.has(id) && graphMap.has(id)) {
  hybridScore *= 1.2;
}
```

Both score arrays are **min-max normalised** before fusion so they're on the same [0, 1] scale.

---

## 6. Frontend Rendering — React Flow

**Library:** [`reactflow`](https://reactflow.dev) v11.10.4  
**File:** `src/app/graph/page.tsx`

### 6.1 Custom Node Component

Each node is a glassmorphism card with a type-specific glow color:

| Node Type | Border Color | Glow |
|---|---|---|
| Problem | `#3b82f6` (blue) | `rgba(59,130,246,0.35)` |
| FailureEvent | `#f97316` (orange) | `rgba(249,115,22,0.35)` |
| Evidence | `#71717a` (gray) | `rgba(113,113,122,0.25)` |
| RootCause | `#f59e0b` (amber) | `rgba(245,158,11,0.35)` |
| Weakness | `#a855f7` (purple) | `rgba(168,85,247,0.35)` |
| LearningStrategy | `#22c55e` (green) | `rgba(34,197,94,0.35)` |

### 6.2 Animated Edges

`TRIGGERED` and `HAS_EVIDENCE` edges use CSS `stroke-dashoffset` animation to create a flowing particle effect:

```css
@keyframes flowParticles {
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset: 0;  }
}
```

### 6.3 Staggered Reveal Animation

Nodes are revealed column-by-column using a `revealStage` counter, with 150ms delays per stage:

```typescript
const timers = [
  setTimeout(() => setRevealStage(1), 100),   // Problems appear
  setTimeout(() => setRevealStage(2), 250),   // FailureEvents appear
  setTimeout(() => setRevealStage(3), 400),   // Evidence appear
  setTimeout(() => setRevealStage(4), 550),   // RootCauses appear
  setTimeout(() => setRevealStage(5), 700),   // Weaknesses appear
  setTimeout(() => setRevealStage(6), 850),   // LearningStrategies appear
];
```

### 6.4 Interactive Features

| Feature | Implementation |
|---|---|
| **Node click** → Inspector panel | `onNodeClick` → `selectedNode` state |
| **Neighbor highlight** | `getConnectedNeighbors()` traverses edge list |
| **Type toggle chips** | `activeTypes: Set<string>` filters `rawNodes` |
| **Text search** | Substring match on `node.data.label` |
| **Topic/Problem filter** | BFS flood-fill from matching Problem nodes |
| **Date range filter** | Compares `FailureEvent.timestamp` property |
| **Confidence filter** | Threshold on `Evidence` and `RootCause` nodes |
| **Layout toggle** | Column (L→R) ↔ Vertical (T→B) recalculates all positions |
| **JSON Export** | Serialises `{ nodes, edges }` → `.json` download |

---

## 7. API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/graph/subgraph?limit=300` | GET | Returns full `{ nodes, edges, stats }` for React Flow |
| `GET /api/graph/weaknesses?limit=10` | GET | Returns weaknesses ranked by PageRank score |
| `GET /api/graph/failures` | GET | Returns recent failure events with root causes |

---

## 8. Data Flow — End to End

```
Chrome Extension
    │  captures LeetCode submission
    ▼
POST /api/submissions
    │
    ├─► Save SubmissionEvent (PostgreSQL)
    │
    ├─► Extract Evidence
    │     ├─ Myers Diff (code_diff)
    │     ├─ AST Pattern Analysis (code_diff)
    │     ├─ Behavioral Signals (behavioral)
    │     └─ Test Failure Verdict (test_failure)
    │
    ├─► Bayesian Inference → RootCauseHypothesis rows
    │     (maps Evidence → RootCause type + confidence)
    │
    ├─► recordFailureEventInGraph()
    │     (no-op: graph is materialized from FK relations)
    │
    ├─► computeWeaknessPageRank()
    │     (Power iteration → updates SystemicWeakness.pageRankScore)
    │
    ├─► saveTextEmbedding()
    │     (Generate vector → store in TextEmbedding table)
    │
    └─► generateAIDiagnosis()
          ├─ retrieveSimilarFailures() → Hybrid RAG
          │     ├─ Semantic: cosine similarity on embeddings
          │     └─ Graph:    shared root cause types + same problem
          │
          └─ Groq LLaMA-3 prompt with:
                • Current failure context
                • Similar past failures (RAG)
                • PageRank weakness scores
                • User's chat question
```

---

## 9. Tech Summary

| Component | Technology | File |
|---|---|---|
| Graph storage | PostgreSQL + Prisma ORM | `prisma/schema.prisma` |
| Graph construction | TypeScript (in-memory traversal) | `src/lib/graph/operations.ts` |
| Weakness ranking | Custom PageRank (power iteration) | `src/lib/graph/pagerank.ts` |
| Similar failure retrieval | Hybrid RAG (cosine sim + graph BFS) | `src/lib/rag/retrieval.ts` |
| Graph visualisation | React Flow v11 | `src/app/graph/page.tsx` |
| AI inference | Groq Cloud (LLaMA-3 8B) | `src/lib/diagnosis/generator.ts` |
| Bayesian analysis | Custom Bayesian engine | `src/lib/inference/bayesian.ts` |
| Code diff | Myers Diff algorithm | `src/lib/analysis/myers-diff.ts` |

---

*This document was auto-generated by analyzing the FailureAtlas source code.*
