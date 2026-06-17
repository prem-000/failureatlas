# Praxis REST API Reference

## Overview

The Praxis API provides endpoints for submission ingestion, Practice Analysis, graph queries, and diagnosis generation. All endpoints use JSON for request/response bodies and JWT authentication for user authorization.

## Base URL
```
Production: https://api.praxis.dev/api
Development: http://localhost:3000/api
```

## Authentication

### JWT Token-Based Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Implemented Endpoints (Phase 1–3)

The following 15 endpoints are implemented and verified in the current build.

### Route Summary

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/register` | — | Create user account |
| `POST` | `/api/auth/login` | — | JWT login |
| `GET` | `/api/health` | — | System health check |
| `GET` | `/api/submissions` | ✅ | List submissions (paginated) |
| `POST` | `/api/submissions` | ✅ | Ingest + full analysis pipeline |
| `GET` | `/api/submissions/[id]` | ✅ | Submission detail + Myers diff |
| `POST` | `/api/submissions/[id]/save-learning` | ✅ | Save learning feedback |
| `POST` | `/api/submissions/analyze` | ✅ | On-demand analysis trigger |
| `GET` | `/api/dashboard/stats` | ✅ | Aggregated dashboard stats |
| `GET` | `/api/graph/subgraph` | ✅ | Neo4j subgraph for ReactFlow |
| `GET` | `/api/graph/weaknesses` | ✅ | PageRank-scored weakness list |
| `GET` | `/api/graph/failures/[weakness]` | ✅ | Failures filtered by weakness |
| `POST` | `/api/diagnosis/generate` | ✅ | RAG + LLM personalized diagnosis |
| `GET` | `/api/user/profile` | ✅ | Profile + detailed analytics |
| `PATCH` | `/api/user/profile` | ✅ | Update name/username |

---

### 1. Authentication

#### POST /api/auth/register
Create a new user account.

**Request Body:**
```typescript
{
  email: string;      // Valid email address
  password: string;   // Minimum 8 characters
  name: string;       // Display name
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass","name":"Test User"}'
```

---

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    token: {
      token: string;      // JWT for subsequent requests
      expiresIn: number;  // Seconds until expiry
    };
    user: {
      id: string;
      email: string;
      name: string;
    };
  };
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass"}'
```

---

#### GET /api/health
System health check — returns connection status for PostgreSQL and Neo4j.

**Authentication:** Not required

**Response:**
```typescript
{
  status: "ok";
  services: {
    database: "connected" | "error";
    neo4j: "connected" | "error";
  };
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/health
```

---

### 2. Submissions

#### GET /api/submissions
List user's submission history with filtering and pagination.

**Authentication:** Required

**Query Parameters:**
```
limit    - Max results (default: 50)
offset   - Pagination offset (default: 0)
status   - Filter by: "Wrong Answer", "Accepted", etc.
problemSlug - Filter by problem
```

**Response:**
```typescript
{
  success: boolean;
  submissions: {
    id: string;
    problemSlug: string;
    problemTitle: string;
    submissionStatus: string;
    submissionLanguage: string;
    attemptNumber: number;
    createdAt: string;
  }[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

---

#### POST /api/submissions
Ingest a new submission event and trigger the full analysis pipeline:
Myers diff → Behavioral signals → Bayesian inference → Neo4j graph recording → Embedding → RAG retrieval → Diagnosis generation → PageRank update.

**Authentication:** Required

**Request Body:**
```typescript
{
  eventId: string;                    // UUID
  sessionId: string;                  // Session UUID
  timestamp: number;                  // Unix timestamp (ms)

  problemSlug: string;                // "two-sum"
  problemTitle: string;               // "Two Sum"
  problemDifficulty: "Easy" | "Medium" | "Hard";
  problemTopics: string[];
  problemUrl: string;

  submissionStatus: "Accepted" | "Wrong Answer" | "Time Limit Exceeded"
                  | "Memory Limit Exceeded" | "Runtime Error" | "Compilation Error";
  submissionLanguage: string;         // "python3", "java", "cpp"
  submissionCode: string;             // Full source code

  runtime?: number;                   // ms
  memory?: number;                    // MB
  testCasesPassed?: number;
  totalTestCases?: number;
  failedTestCase?: string;

  timeSpent: number;                  // ms on problem
  attemptNumber: number;
  rapidSubmission: boolean;           // < 30s since last submit
  codeEvolution: CodeDiff[];          // Last 5 diffs
}
```

**Response:**
```typescript
{
  success: boolean;
  submissionId: string;
  message: string;
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "sessionId": "session-123",
    "timestamp": 1674567890123,
    "problemSlug": "two-sum",
    "problemTitle": "Two Sum",
    "problemDifficulty": "Easy",
    "problemTopics": ["Array", "Hash Table"],
    "problemUrl": "https://leetcode.com/problems/two-sum/",
    "submissionStatus": "Wrong Answer",
    "submissionLanguage": "python3",
    "submissionCode": "class Solution:\n    def twoSum(self, nums, target):\n        pass",
    "testCasesPassed": 54,
    "totalTestCases": 57,
    "timeSpent": 1847000,
    "attemptNumber": 2,
    "rapidSubmission": false,
    "codeEvolution": []
  }'
```

---

#### GET /api/submissions/[id]
Retrieve full submission detail including Myers diff and root cause hypotheses.

**Authentication:** Required

**Response:**
```typescript
{
  success: boolean;
  submission: {
    id: string;
    problemSlug: string;
    problemTitle: string;
    submissionStatus: string;
    submissionCode: string;
    createdAt: string;
    evidence: {
      id: string;
      type: string;
      description: string;
      confidence: number;
    }[];
    rootCauseHypotheses: {
      rootCause: string;
      confidence: number;
    }[];
    codeEvolution: {
      additions: string[];
      deletions: string[];
      timestamp: number;
    }[];
  };
}
```

---

#### POST /api/submissions/[id]/save-learning
Save user feedback (helpfulness ratings) on a diagnosis.

**Authentication:** Required

**Request Body:**
```typescript
{
  helpful: boolean;
  notes?: string;
}
```

**Response:**
```typescript
{ success: boolean; message: string; }
```

---

#### POST /api/submissions/analyze
Trigger on-demand analysis for an existing submission.

**Authentication:** Required

**Request Body:**
```typescript
{
  submissionId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  analysis: {
    rootCause: string;
    confidence: number;
    evidence: string[];
  };
}
```

---

### 3. Dashboard

#### GET /api/dashboard/stats
Aggregated statistics for the user's intelligence dashboard.

**Authentication:** Required

**Response:**
```typescript
{
  success: boolean;
  stats: {
    totalSubmissions: number;
    totalFailures: number;
    acceptanceRate: number;         // 0–1
    activeGrowthOpportunities: number;
    recentSubmissions: {
      id: string;
      problemSlug: string;
      status: string;
      createdAt: string;
    }[];
    topWeaknesses: {
      name: string;
      score: number;
    }[];
  };
}
```

---

### 4. Graph

#### GET /api/graph/subgraph
Returns ReactFlow-compatible node and edge arrays for the full user failure subgraph.

**Authentication:** Required

**Response:**
```typescript
{
  success: boolean;
  nodes: {
    id: string;
    type: "Problem" | "Practice Session" | "Evidence" | "RootCause" | "Weakness" | "LearningStrategy";
    data: { label: string; [key: string]: any };
    position: { x: number; y: number };
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
  }[];
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/graph/subgraph \
  -H "Authorization: Bearer [token]"
```

---

#### GET /api/graph/weaknesses
PageRank-scored weakness list for the current user.

**Authentication:** Required

**Response:**
```typescript
{
  success: boolean;
  weaknesses: {
    id: string;
    name: string;
    pageRankScore: number;
    frequency: number;
    lastOccurrence: string;
  }[];
}
```

---

#### GET /api/graph/failures/[weakness]
Returns ReactFlow data filtered by a specific weakness ID.

**Authentication:** Required

**Path Parameter:** `weakness` — weakness ID (e.g., `edge-case-reasoning`)

**Response:**
```typescript
{
  success: boolean;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/graph/failures/edge-case-reasoning" \
  -H "Authorization: Bearer [token]"
```

---

### 5. Diagnosis

#### POST /api/diagnosis/generate
Run hybrid RAG retrieval + LLM reasoning to generate a personalized failure diagnosis.

**Authentication:** Required

**Request Body:**
```typescript
{
  submissionId?: string;    // Target specific submission (optional)
  weaknessId?: string;      // Focus on a specific weakness (optional)
}
```

**Response:**
```typescript
{
  success: boolean;
  diagnosis: {
    diagnosisId: string;
    generatedAt: string;
    primaryWeaknessId: string;
    confidence: number;
    summary: string;                  // LLM-generated summary
    learningRecommendations: {
      strategyId: string;
      name: string;
      description: string;
      priority: "high" | "medium" | "low";
    }[];
    retrievedEvidence: {
      submissionId: string;
      similarity: number;
      problemSlug: string;
    }[];
  };
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/diagnosis/generate \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### 6. User

#### GET /api/user/profile
Full user profile with detailed analytics: language distribution, difficulty breakdown, activity heatmap data.

**Authentication:** Required

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    username: string;
    createdAt: string;
    stats: {
      totalSubmissions: number;
      totalFailures: number;
      successRate: number;
      languageDistribution: { [lang: string]: number };
      difficultyDistribution: { Easy: number; Medium: number; Hard: number };
      recentActivity: { date: string; count: number }[];
    };
  };
}
```

#### PATCH /api/user/profile
Update user display name or username.

**Authentication:** Required

**Request Body:**
```typescript
{
  name?: string;
  username?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    name: string;
    username: string;
  };
}
```

---

## Error Responses

All endpoints return consistent error format:

```typescript
{
  success: false;
  error: {
    code: string;       // e.g., "VALIDATION_ERROR"
    message: string;    // Human-readable message
    details?: any;
  };
  requestId?: string;
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid JWT token |
| `AUTHORIZATION_FAILED` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Planned Endpoints (Phase 5)

The following endpoints are planned but not yet implemented:

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/refresh` | Refresh JWT before expiry |
| `DELETE` | `/api/user/account` | Delete account + all data |
| `PATCH` | `/api/user/preferences` | Notification & privacy settings |
| `GET` | `/api/diagnosis/history` | Past diagnosis reports |
| `POST` | `/api/submissions/batch` | Batch ingest (offline queue flush) |
| `GET` | `/api/graph/patterns` | Temporal/topical failure patterns |
| `POST` | `/api/webhooks` | Register real-time webhook |

---

The Praxis API provides structured access to Learning Intelligence with consistent REST conventions and JWT authentication. All protected endpoints require `Authorization: Bearer <token>` obtained from `/api/auth/login`.