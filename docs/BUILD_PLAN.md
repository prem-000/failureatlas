# FailureAtlas — Complete Build Plan

## What this file is

A complete, phase-by-phase construction guide for the FailureAtlas system. Each phase lists exactly what to build, the exact AI prompt to use to build it, what files get created, and how to verify it works. Follow phases in order — each one depends on the last.

## System Overview (Read Before Building)

FailureAtlas is an AI-powered competitive programming failure intelligence platform. It has 4 major parts:

| Part | What it is | Tech |
|------|-----------|------|
| **Web App** | Next.js 15 dashboard + diagnosis UI | Next.js 15, React 19, TypeScript, Tailwind |
| **API** | REST backend with auth, analysis, graph queries | Next.js API Routes, Prisma, JWT |
| **Databases** | Relational + graph + vector storage | PostgreSQL + pgvector, Neo4j |
| **Chrome Extension** | LeetCode submission capture | Manifest V3, Content Scripts |

**Full pipeline**: Chrome Extension captures LeetCode submissions → API ingests them → Myers Diff + Behavioral analysis runs → Bayesian + LLM inference classifies root cause → Neo4j knowledge graph stores relationships → RAG retrieval finds similar failures → GPT-4o/Claude generates personalized diagnosis.

## Design System (Apply to Every UI File)

Before writing any component, internalize these constraints — they apply everywhere:

```css
Background:    #131313  (--color-background)
Surface:       #191919  (--color-surface)
Foreground:    #f8fafc
Muted:         #27272a  (zinc-800)
Muted text:    #a1a1aa
Border:        #3f3f46  (zinc-700, 0.5px weight)
Primary:       #ff5f52  (Brand Coral)

Node colors:
  Problem      → blue   (#3b82f6)
  FailureEvent → orange (#fb923c)
  RootCause    → amber  (#f59e0b)
  Weakness     → purple (#a855f7)
  Strategy     → green  (#22c55e)

Font: Geist Sans (headings + body), Geist Mono (code)
Border radius: 12px cards, 8px inputs, full pills
Cards: 16px padding, 0.5px border, elevated surface bg
Dark mode: MANDATORY — no light mode toggle
```

## Phase 1 — Core Infrastructure (Week 1–2)

**Goal**: A running Next.js 15 app with working databases, authentication, and base UI shell. No real analysis yet — just the skeleton everything else attaches to.

### 1A — Project Scaffold & Config

**What to build**:
- `package.json` with all dependencies
- `next.config.mjs`
- `tsconfig.json`
- `tailwind.config.ts` with full design token system
- `src/styles/globals.css` with CSS variables + utility classes
- `.env.example` with all required env vars
- `.gitignore`

**Exact prompt to use**:
```
Build the complete Next.js 15 project configuration for FailureAtlas.

Create these files:

1. package.json with dependencies: next@15, react@19, react-dom@19, typescript, 
   tailwindcss, @prisma/client, prisma, neo4j-driver, @auth/prisma-adapter, jose, 
   bcryptjs, @tanstack/react-query, reactflow, zod, uuid, openai, @anthropic-ai/sdk, 
   lucide-react. 
   DevDeps: @types/node, @types/react, @types/bcryptjs, @types/uuid, ts-node.

2. tailwind.config.ts — extend theme with these exact CSS variable-based colors:
   background, surface, foreground, muted/muted-foreground, border, 
   primary/primary-foreground,
   node.problem (#3b82f6), node.failure (#fb923c), node.rootCause (#f59e0b), 
   node.weakness (#a855f7), node.strategy (#22c55e),
   success, warning, error, critical.
   Add keyframe animations: root-cause-pulse (2s coral box-shadow), fade-in, 
   slide-up, slide-in-right.
   Font: Geist Sans as default sans.

3. src/styles/globals.css — define all CSS variables for dark mode (#131313 bg, 
   #191919 surface, #f8fafc foreground, #27272a muted, #a1a1aa muted-fg, 
   #3f3f46 border, #ff5f52 primary).
   Add utility classes: .surface-elevated (bg-surface + 0.5px border), 
   .card (rounded-[12px] p-4), .card-dense, .data-card, 
   .root-cause-critical (pulse animation), 
   .text-body (14px/20px), .text-caption (12px/16px), .text-micro (11px/14px).
   Import Geist font from Google Fonts or next/font.

4. .env.example with: DATABASE_URL, NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, 
   OPENAI_API_KEY, ANTHROPIC_API_KEY, NEXTAUTH_URL, NEXTAUTH_SECRET, JWT_SECRET, 
   REDIS_URL, DEBUG, LOG_LEVEL.

5. next.config.mjs — minimal config with serverActions allowed origins.

Use TypeScript strict mode throughout.
```

**Files created**:
- `package.json`
- `next.config.mjs`
- `tsconfig.json`
- `tailwind.config.ts`
- `src/styles/globals.css`
- `.env.example`
- `.gitignore`
- `postcss.config.js`

**Verify**: `pnpm install` completes with no errors. `pnpm dev` starts (will fail on DB — that's fine).

---

### 1B — TypeScript Types & Interfaces

**What to build**: All shared TypeScript types used across the entire app.

**Exact prompt**:
```
Create src/types/index.ts for FailureAtlas with these exact TypeScript interfaces and types:

// Submission types
SubmissionStatus = "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | 
  "Memory Limit Exceeded" | "Runtime Error" | "Compilation Error"
ProblemDifficulty = "Easy" | "Medium" | "Hard"

interface SubmissionEvent {
  eventId, sessionId, timestamp, problemSlug, problemTitle, problemDifficulty, 
  problemTopics, problemUrl, submissionStatus, submissionLanguage, submissionCode, 
  runtime?, memory?, testCasesPassed?, totalTestCases?, failedTestCase?, timeSpent, 
  attemptNumber, rapidSubmission
}

// Analysis types
interface CodeSignal {
  type: "boundary_change"|"algorithm_rewrite"|"data_structure_change"|"optimization",
  diff, confidence: number
}
interface BehavioralSignal {
  type: "rapid_resubmission"|"long_gap"|"many_minor_changes",
  interval?: number, confidence: number
}
interface Evidence {
  evidenceId, type: "code_diff"|"behavioral"|"test_failure",
  description, confidence: number, source, rawData, extractedAt: Date
}

// Root cause types (8 types from ontology):
RootCauseType = "boundary-condition-error" | "algorithm-selection-mistake" | 
  "pattern-recognition-gap" | "time-complexity-oversight" | 
  "space-complexity-oversight" | "data-structure-mismatch" | 
  "implementation-detail-error" | "input-output-handling-error"

interface RootCauseHypothesis {
  rootCause: RootCauseType, name, confidence: number, evidence: string[], 
  alternativeHypotheses?: {rootCause, confidence}[]
}

// Weakness types
WeaknessType = "edge-case-reasoning" | "algorithmic-pattern-recognition" | 
  "performance-analysis" | "implementation-precision"
interface SystemicWeakness {
  id, name, severity: "critical"|"high"|"medium"|"low", confidence: number, 
  frequency: number, lastOccurrence: Date, riskIndex: number, pageRankScore: number
}

// Graph types
NodeType = "Problem" | "FailureEvent" | "Evidence" | "RootCause" | 
  "Weakness" | "LearningStrategy"
interface GraphNode {
  id, type: NodeType, label, data: Record<string,any>, position?: {x,y}
}
interface GraphEdge {
  id, source, target, type: string, properties?: Record<string,any>
}
interface GraphFilters {
  topics: string[], rootCauseTypes: RootCauseType[], 
  dateRange: {start,end}, confidenceThreshold: number
}

// Diagnosis types
interface DiagnosisResult {
  diagnosisId, generatedAt, primaryWeakness: SystemicWeakness, 
  secondaryWeaknesses, learningRecommendations: LearningRecommendation[], 
  progressMetrics
}
interface LearningRecommendation {
  strategyId, name, description, estimatedTime: number, 
  priority: "high"|"medium"|"low", practiceProblems?: PracticeProb[]
}

// Auth types
interface User { id, email, name, createdAt: Date }
interface AuthToken { token, expiresIn: number, user: User }

// API response wrapper
interface ApiResponse<T> {
  success: boolean, data?: T, 
  error?: {code, message, details?}, requestId?: string
}
interface PaginationInfo { total, limit, offset, hasMore: boolean }

Also create src/types/graph.ts (React Flow node/edge types), 
src/types/api.ts (all request/response body types matching the API spec exactly).
```

**Files created**:
- `src/types/index.ts`
- `src/types/graph.ts`
- `src/types/api.ts`

---

### 1C — PostgreSQL Schema (Prisma)

**Reference**: See `docs/ARCHITECTURE.md` for complete data model
**Reference**: See `docs/API.md` for API schemas

**What to build**: Complete Prisma schema matching the data model, plus migration and seed script.

**Files created**:
- `prisma/schema.prisma`
- `prisma/seed.ts`

**Run after creation**:
```bash
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

---

### 1D — Neo4j Schema & Setup Script

**Reference**: See `docs/GRAPH_SCHEMA.md` for complete schema
**Reference**: See `docs/FAILURE_ONTOLOGY.md` for ontology details

**What to build**: Neo4j initialization script that creates constraints, indexes, and seeds the full ontology.

**Files created**:
- `scripts/neo4j-setup.ts`
- `src/lib/db/neo4j.ts`

**Run after creation**:
```bash
ts-node scripts/neo4j-setup.ts
```

---

### 1E through 1K — Remaining Infrastructure

**Reference Documents**:
- `docs/API.md` — Complete API specification
- `docs/SETUP.md` — Development environment setup
- `docs/CONTRIBUTING.md` — Code standards and patterns

**Components to Build**:
1. **1E**: Prisma Database Client
2. **1F**: JWT Authentication System
3. **1G**: Base UI Component Library (see `docs/UI_LAYOUTS.md`)
4. **1H**: Layout Components (see `docs/UI_LAYOUTS.md`)
5. **1I**: Landing Page (see `docs/UI_LAYOUTS.md`)
6. **1J**: Login & Register Pages
7. **1K**: Health Check API + React Query Setup

---

## Phase 1 Completion Checklist

Before moving to Phase 2, verify ALL of these work:

- [ ] `pnpm install` completes with 0 errors
- [ ] `pnpm prisma generate` succeeds
- [ ] `pnpm prisma migrate dev` creates all tables
- [ ] `pnpm prisma db seed` creates test data
- [ ] `ts-node scripts/neo4j-setup.ts` creates all nodes/constraints
- [ ] `pnpm dev` starts on localhost:3000
- [ ] `GET /api/health` returns `{"status":"ok",...}` with both DBs connected
- [ ] `POST /api/auth/register` creates a new user in DB
- [ ] `POST /api/auth/login` returns a valid JWT token
- [ ] `GET /dashboard` redirects to `/login` when no token
- [ ] `/` (landing page) renders with no errors
- [ ] `/login` renders form, submits, redirects to `/dashboard` on success
- [ ] `/register` renders form, submits, redirects to `/login` on success
- [ ] Navigation drawer renders on `/dashboard`
- [ ] All colors are dark theme — no white backgrounds
- [ ] TypeScript: `pnpm tsc --noEmit` passes

---

## Phase 2 — Analysis Engine (Week 3-4)

**Goal**: Implement the intelligence layer — Myers diff, Bayesian inference, Neo4j operations, RAG pipeline.

**Reference Documents**:
- `docs/ALGORITHMS.md` — Complete algorithm specifications
- `docs/GRAPH_SCHEMA.md` — Neo4j operations

### Components to Build:

1. **Myers Diff Implementation** (`src/lib/analysis/myers-diff.ts`)
2. **Structural Code Pattern Analysis** (`src/lib/analysis/ast-diff.ts`)
3. **Behavioral Signal Parser** (`src/lib/analysis/behavioral.ts`)
4. **Bayesian Root Cause Classifier** (`src/lib/inference/bayesian.ts`)
5. **Neo4j Graph Operations** (`src/lib/graph/operations.ts`)
6. **PageRank Weakness Scoring** (`src/lib/graph/pagerank.ts`)
7. **OpenAI Embeddings Pipeline** (`src/lib/embeddings/pipeline.ts`)
8. **RAG Retrieval Engine** (`src/lib/rag/retrieval.ts`)
9. **LLM Diagnosis Generator** (`src/lib/diagnosis/generator.ts`)

---

## Phase 3 — Frontend Pages ✅ COMPLETE

**Goal**: Build all authenticated dashboard pages with React Flow visualizations.
**Status**: All pages built and verified.

**Reference**: `docs/UI_LAYOUTS.md` — Complete UI specifications

### Pages to Build:

1. **Dashboard** (`/dashboard`) - Real-time intelligence hub
2. **Graph Explorer** (`/graph`) - Full-canvas React Flow
3. **AI Diagnosis** (`/diagnosis`) - Split-pane RAG interface
4. **Problem Tracker** (`/problems`) - Data-rich table
5. **Problem Detail** (`/problems/[id]`) - Deep-dive analysis
6. **Settings** (`/settings`) - User configuration

---

## Phase 4 — Chrome Extension 🔨 IN PROGRESS

**Goal**: Build the LeetCode data capture extension.
**Status**: Scaffold, content script, background service worker, popup, and tests complete. E2E integration pending.

**Reference**: `docs/EXTENSION.md` — Complete extension specification

### Components to Build:

1. **Manifest V3 Configuration**
2. **Content Scripts** (LeetCode DOM monitoring)
3. **Background Service Worker**
4. **Extension Popup UI**
5. **API Communication Layer**

---

## Phase 5 — Integration & Testing ⏳ PENDING

**Goal**: Connect all systems, implement error handling, optimize performance.

### Tasks:

1. **End-to-End Testing** (submission → diagnosis flow)
2. **API Integration Testing**
3. **Performance Optimization** (lazy loading, code splitting)
4. **Error Handling** (all error states from `UI_LAYOUTS.md`)
5. **Accessibility Audit** (WCAG 2.1 AA)
6. **Documentation Completion**

---

## Quick Reference: Key Documentation Files

| File | Purpose | Use When |
|------|---------|----------|
| `ARCHITECTURE.md` | System design & data flow | Planning components, understanding pipeline |
| `ALGORITHMS.md` | Algorithm specifications | Implementing analysis/inference logic |
| `GRAPH_SCHEMA.md` | Neo4j schema & queries | Building graph operations |
| `FAILURE_ONTOLOGY.md` | Root cause taxonomy | Classifying failures |
| `UI_LAYOUTS.md` | Complete frontend spec | Building any UI component |
| `API.md` | REST API reference | Implementing API routes |
| `EXTENSION.md` | Chrome extension spec | Building extension |
| `SETUP.md` | Environment setup | Initial setup, troubleshooting |
| `CONTRIBUTING.md` | Code standards | Following conventions |

---

## Development Principles

### Always Follow:

1. **Dark Theme Only** — `#131313` background, no light mode
2. **Brand Coral Primary** — `#ff5f52` for all primary actions
3. **TypeScript Strict** — All code fully typed
4. **Component Isolation** — Each component self-contained
5. **Reference Documentation** — Use specs for exact implementations
6. **Test As You Build** — Verify each phase before proceeding

### Never:

1. Use white backgrounds or light theme colors
2. Skip TypeScript types (use `any`)
3. Implement without reading the relevant doc section
4. Move to next phase with failing checklist items
5. Deviate from design system specifications

---

## Success Metrics

**Phase 1 Complete** ✅:
- Authenticated users can navigate the empty dashboard
- All databases connected and seeded

**Phase 2 Complete** ✅:
- Submissions can be analyzed and stored in Neo4j
- Bayesian classifier produces root cause hypotheses

**Phase 3 Complete** ✅:
- All pages render with real data
- Graph visualization works with Neo4j data

**Phase 4 In Progress** 🔨:
- Extension captures LeetCode submissions (content script done)
- Service worker + popup UI done; E2E integration pending
- Data should flow: extension → API → dashboard

**Phase 5 Complete** ⏳ (pending):
- Full end-to-end flow works
- Performance metrics met
- Production-ready deployment

---

## Next Steps

Start with **Phase 1A** and work sequentially through the checklist. Use the exact prompts provided for each component. Reference the documentation files for detailed specifications. Verify each checkpoint before proceeding.

**Ready to build?** Begin with Phase 1A — Project Scaffold & Config.