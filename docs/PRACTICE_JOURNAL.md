# Praxis Practice Journal

The **Practice Journal** is a key feature of the Praxis system workspace. It provides developers with a structured, chronological feed of automated reflection notes extracted from recent coding practice failures (e.g., LeetCode submissions that did not result in an `Accepted` status). 

Instead of showing raw error messages, the Practice Journal correlates code edits, compilation/test results, and behavioral signals to isolate the actual **Root Cause** of a failure and explain it in plain English.

---

## 1. Architectural Overview & Dataflow

The Practice Journal operates through a decoupled, multi-layered pipeline:

```
┌──────────────────────────────────────────┐
│  LeetCode Chrome Extension / Interceptor │
└────────────────────┬─────────────────────┘
                     │ HTTP POST
                     ▼
┌──────────────────────────────────────────┐
│ Ingestion Endpoint: /api/submissions     │
│ (Authenticates, Dedupes, Saves Raw Row)  │
└────────────────────┬─────────────────────┘
                     ├─────────────────────────────────────────────────┐
                     ▼ (Instant Response to Ext)                       ▼ (Asynchronous Background Job)
┌──────────────────────────────────────────┐      ┌──────────────────────────────────────────┐
│  JSON Response: "Analysis running..."    │      │  runAnalysisPipeline()                   │
└──────────────────────────────────────────┘      └────────────────────┬─────────────────────┘
                                                                       │
                                        ┌──────────────────────────────┼──────────────────────────────┐
                                        ▼                              ▼                              ▼
                         ┌─────────────────────────────┐┌──────────────────────────────┐┌─────────────────────────────┐
                         │   Myers Diff & AST Parser   ││   Behavioral Signal Parser   ││    Bayesian Inference       │
                         │   (Code Evolution Signals)  ││   (Time gaps, focus, status) ││    (Root Cause Scoring)     │
                         └──────────────┬──────────────┘└──────────────┬───────────────┘└──────────────┬──────────────┘
                                        │                              │                               │
                                        └──────────────────────────────┼───────────────────────────────┘
                                                                       ▼
                                                        ┌──────────────────────────────┐
                                                        │      Neo4j Graph Write       │
                                                        │   & PageRank Weakness Calc   │
                                                        └──────────────┬───────────────┘
                                                                       ▼
                                                        ┌──────────────────────────────┐
                                                        │   Gemini RAG & Diagnosis     │
                                                        │ (Failure Explanation Engine) │
                                                        └──────────────┬───────────────┘
                                                                       ▼
                                                        ┌──────────────────────────────┐
                                                        │  Database Schema Persistence  │
                                                        └──────────────────────────────┘
                                                                       ▲
                                                                       │ HTTP GET
                                                        ┌──────────────┴───────────────┐
                                                        │ API Endpoint:                │
                                                        │ /api/graph/failures          │
                                                        └──────────────┬───────────────┘
                                                                       ▲
                                                                       │ React Query / Hook
                                                        ┌──────────────┴───────────────┐
                                                        │ Frontend: Workspace UI       │
                                                        │ (Practice Journal Tab)       │
                                                        └──────────────────────────────┘
```

---

## 2. Database Schema (PostgreSQL via Prisma)

The journal is powered by relational tables defined in [schema.prisma](file:///c:/Users/ADMIN/python/failureatlas/prisma/schema.prisma):

- **`SubmissionEvent`**: The central record of a practice attempt. It stores the `userId`, `problemId`, `status` (e.g., `Wrong Answer`, `Time Limit Exceeded`), the raw source `code`, metadata like `runtime`, `memory`, `timeSpent`, and the `attemptNumber`.
- **`Evidence`**: Fine-grained signals extracted during ingestion. Types include `code_diff`, `behavioral`, and `test_failure`.
- **`RootCauseHypothesis`**: Multiple competing root-cause categorizations mapped to an evidence node, scored with a confidence value.
- **`FailureExplanation`**: The final AI-generated synthesis. It holds the high-level `rootCause`, `rootCauseCategory`, `reason`, `logicBreakdown`, `learningConcept`, and an `estimatedLearningTimeMinutes`.

---

## 3. How It Is Built: The Technical Pipeline

### Step A: Capture & Ingestion
Submissions are sent via `POST` to [/api/submissions](file:///c:/Users/ADMIN/python/failureatlas/src/app/api/submissions/route.ts). The API performs:
1. **Authentication**: Validates requests using standard Next-Auth session handling.
2. **Deduplication**:
   - Checks for duplicate transaction `eventId`s.
   - Prevents duplicate writes by ignoring identical submissions from the same user, on the same problem, with the same code and status, within a 60-second window.
3. **Immediate Handshake**: Saves the raw `SubmissionEvent` and responds `200 OK` to the extension immediately. The heavier analysis pipeline is deferred to background execution.

### Step B: Core Analysis Pipeline (`runAnalysisPipeline`)
The pipeline runs asynchronously to compile diagnostic signals:
1. **Code Evolution & AST Differ**:
   - Runs a **Myers Diff** against the user's previous code attempt to calculate line differences and change metrics.
   - Performs **AST / Structural Code Pattern Analysis** to classify structural shifts (such as `BOUNDARY_CONDITION_CHANGE`, `ALGORITHM_REWRITE`, or `DATA_STRUCTURE_CHANGE`).
   - Inserts findings into the `Evidence` and `CodeEvidence` tables.
2. **Behavioral Signal Parser**:
   - Examines timestamps and user interaction logs to extract signals like `rapid_resubmission` (indicating brute-forcing or code guessing) or `long_gap` (indicating offline design/reflection).
3. **Bayesian Root Cause Inference**:
   - Aggregates all structural and behavioral evidence features.
   - Passes them to the **Bayesian Inference Engine** (`runBayesianInference`) to update probability distributions across the failure ontology.
   - Persists several `RootCauseHypothesis` entries, associating them with the highest-confidence root cause.
4. **Graph & PageRank Integration**:
   - Records the failure event in the database knowledge graph to map relationships.
   - Computes PageRank scores (`computeWeaknessPageRank`) to evaluate the user's systemic weakness patterns over time.
5. **AI Failure Explanation Engine (Gemini-Powered)**:
   - When a submission fails, it triggers the explanation engine.
   - Ingests the raw submission details, Myers diffs, behavioral signals, inferred root causes, and similar historical failures (retrieved via vector embeddings).
   - Prompts **Gemini** (`generateFailureExplanation`) to produce a structured failure explanation including a code logic breakdown, underlying learning concept, and targeted recommendations.

---

## 4. Backend Query Retrieval

The Practice Journal UI fetches data from the GET handler at [/api/graph/failures](file:///c:/Users/ADMIN/python/failureatlas/src/app/api/graph/failures/route.ts):

- **Query Filters**: It retrieves records for the authenticated user, filters out successful attempts (`NOT: { status: 'Accepted' }`), limits results to the most recent attempts (default 50), and looks back over a configurable time window (default 30 days).
- **Joining & Formatting**:
  - Joins the `Problem` table to retrieve titles, slugs, and difficulties.
  - Resolves the primary root cause by sorting all `RootCauseHypothesis` records for the submission by confidence and selecting the top-performing candidate (defaulting to "Unknown Root Cause" if none exists).
  - Returns a clean JSON representation containing all formatted UI metadata.

---

## 5. Frontend UI Implementation

The user interface is hosted inside [WorkspacePage](file:///c:/Users/ADMIN/python/failureatlas/src/app/workspace/page.tsx) under the `journal` section:

- **State Management**:
  - Uses the custom React Query hook `useGraphFailures(50, 60)` from [usePhase3Queries.ts](file:///c:/Users/ADMIN/python/failureatlas/src/hooks/usePhase3Queries.ts) to manage loading, error, and cached response states.
- **Formatting Logic**:
  - Maps raw timestamps into human-readable strings (e.g., `Jul 15` or `10m ago`).
  - Correlates the top root cause hypothesis as the main failure summary.
- **Aesthetic Styling**:
  - Employs a dark, premium theme (`#0d0d0f`) with glassmorphism styling (`rgba(255,255,255,0.01)` background with `rgba(255,255,255,0.04)` borders).
  - Maps difficulty categories (`Easy`, `Medium`, `Hard`) to vibrant theme colors:
    - **Easy**: Green (`#22c55e`)
    - **Medium**: Amber (`#f59e0b`)
    - **Hard**: Red (`#ef4444`)
  - Features high-contrast badges with translucent backgrounds for readability.
- **Empty State UX**:
  - Offers clear user instruction ("No failure submissions registered yet. Install the extension to begin tracing.") if no data is found.
