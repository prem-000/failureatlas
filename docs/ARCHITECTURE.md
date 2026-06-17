# Praxis System Architecture

## Overview

Praxis transforms competitive programming failures from isolated events into structured, actionable Learning Intelligence through a multi-layered pipeline centered around a structured failure ontology (the backbone of the system). Data flows from the capture extension through evidence extraction, root cause inference, and weakness attribution, to feed graph-based diagnostic retrieval and explanation generator engines.

## Full Pipeline Architecture

```
Chrome Extension (Manifest V3)
         │
         ▼ [Submission Capture]
Backend Ingestion & Analysis (Next.js API)
         │
         ├──────────────────────┐
         ▼                      ▼
  Analysis Layer         Analysis Layer
Code Evolution         Behavioral Signal
Analyzer               Parser
(Myers diff ·          (attempt count ·
 structural pattern)   time signals)
         │                      │
         └──────────┬───────────┘
                    ▼
             Inference Layer
     (Bayesian Root Cause Scoring ·
      Evidence Aggregation ·
      Ontology Mapping & Weakness)
                    │
                    ▼
              Storage Layer
     Practice Tracking Knowledge Graph — Neo4j
     (PageRank weakness scoring ·
      Cypher queries)
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
   Retrieval Layer      Retrieval Layer
   Embedding Pipeline   Graph RAG Retrieval
   (text-embedding-3    (subgraph traversal
    · pgvector)         · k-NN · hybrid fusion)
         │                     │
         └──────────┬──────────┘
                    ▼
          Context Layer
        Context Builder
        (evidence packing ·
         prompt templating)
                    │
                    ▼
             Reasoning Layer
       Diagnosis Generation Engine
       (GPT-4o · Claude Sonnet ·
        structured reasoning)
                    │
                    ▼
          Output Layer
      Personalized Diagnosis
      (weakness summary ·
       evidence transparency)
```

## Data Flow Between Layers

### 1. Ingestion & Capture Layer → Analysis Layer

**Input**: Raw submission events from the Chrome Extension.
```json
{
  "problemId": "two-sum",
  "submissionStatus": "Wrong Answer",
  "code": "class Solution: ...",
  "timestamp": "2024-01-15T10:30:00Z",
  "runtime": 142,
  "memory": 16.2,
  "timeSpent": 1847,
  "testCasesPassed": 54,
  "totalTestCases": 57
}
```

**Output**: Structured submission data + metadata.
```json
{
  "submissionEvent": { /* submission data */ },
  "problemMetadata": {
    "difficulty": "Easy",
    "topics": ["Array", "Hash Table"],
    "constraints": "1 <= nums.length <= 10^4"
  }
}
```

### 2. Analysis Layer → Inference Layer

**Dual Fork Pattern**: Two parallel practice analysis branches process different aspects:

#### Branch A: Code Evolution Analysis
- **Myers Diff**: Compares current submission against previous attempts.
- **Structural Code Pattern Analysis**: Identifies structural changes in code logic.
- **Output**: Code change signals with confidence scores.

#### Branch B: Behavioral Signal Analysis
- **Attempt Patterns**: Analyzes submission frequency and timing.
- **Performance Signals**: Runtime/memory trend analysis.
- **Output**: Behavioral indicators with statistical significance.

**Merged Output to Inference**:
```json
{
  "codeSignals": [
    {
      "type": "boundary_change",
      "diff": "- while left < right\n+ while left <= right",
      "confidence": 0.89
    }
  ],
  "behavioralSignals": [
    {
      "type": "rapid_resubmission",
      "interval": 45,
      "confidence": 0.76
    }
  ]
}
```

### 3. Inference Layer → Storage Layer

**Input**: Combined signals + historical context.
**Processing**: Inference Layer (Bayesian root cause scoring, evidence aggregation, ontology mapping, weakness attribution).
**Output**: Confidence-scored root cause hypotheses.
```json
{
  "rootCause": "Boundary Condition Error",
  "confidence": 0.91,
  "evidence": [
    "off-by-one in loop bounds",
    "single-element test case failure"
  ],
  "alternativeHypotheses": [
    {
      "rootCause": "Algorithm Selection Mistake",
      "confidence": 0.23
    }
  ]
}
```

The system maps the relationships primarily through the evidence bridge:
$$\text{FailureEvent} \xrightarrow{\text{HAS\_EVIDENCE}} \text{Evidence} \xrightarrow{\text{SUGGESTS}} \text{RootCause} \xrightarrow{\text{INDICATES}} \text{Weakness} \xrightarrow{\text{ADDRESSED\_BY}} \text{LearningStrategy}$$

### 4. Storage Layer → Retrieval Layer

**Dual Fork Pattern**: Two parallel retrieval branches:

#### Branch A: Embedding Pipeline
- **Text Embedding**: Converts failure descriptions to vectors using OpenAI text-embedding-3.
- **Vector Storage**: Stores in PostgreSQL with pgvector.
- **k-NN Search**: Finds semantically similar past failures.

#### Branch B: Graph RAG Retrieval
- **Subgraph Traversal**: Neo4j Cypher queries to find related failures.
- **PageRank Scoring**: Identifies highest-impact weakness nodes.
- **Relationship Analysis**: Traces failure patterns across problem types.

**Hybrid Fusion**: Combines semantic similarity + graph relationships.

### 5. Retrieval Layer → Context Layer

**Input**: Retrieved similar failures + graph relationships.
**Processing**: Evidence aggregation + prompt templating.
**Output**: Structured context for reasoning.

### 6. Context Layer → Reasoning Layer

**Input**: Evidence-packed prompt with failure context.
**Processing**: Structured diagnostic reasoning via GPT-4o/Claude Sonnet.
**Output**: Personalized diagnosis with learning recommendations.

---

## Technology Choices and Justifications

### Frontend Layer
- **Next.js 15**: React-based framework with App Router and API routes for unified development.
- **TypeScript**: Type safety for complex data structures and API contracts.
- **Tailwind CSS**: Dark-first visual styling with CSS variables.
- **React Flow**: Interactive visualizer mapping systemGrowth Opportunities and root causes.

### Data Processing Layer
- **Node.js**: JavaScript runtime for unified language across frontend/backend.
- **Myers Algorithm**: Standard diff algorithm with O(ND) complexity for code comparison.
- **Structural Code Pattern Analysis**: Heuristic regex-based extraction for semantic changes in control structures.

### Storage Layer
- **PostgreSQL + Prisma**: ACID-compliant relational storage for submission data.
- **Neo4j**: Purpose-built graph database hosting the failure ontology taxonomy and connections.
- **pgvector**: PostgreSQL extension for efficient vector similarity search.

### AI/ML Layer
- **OpenAI text-embedding-3**: State-of-the-art embeddings for semantic similarity.
- **GPT-4o + Claude Sonnet**: Multiple LLM providers for reasoning redundancy.
- **Bayesian Classification**: Probabilistic inference for root cause confidence scoring.

### Browser Layer
- **Chrome Extension Manifest V3**: Modern extension platform with improved security.
- **Content Scripts**: DOM injection for seamless LeetCode submission capture.

---

## DAG Structure

The Praxis pipeline forms a Directed Acyclic Graph with these key characteristics:

1. **Entry Points**: Chrome Extension capture node.
2. **Parallel Processing**: Dual forks at Analysis and Retrieval layers.
3. **Convergence Points**: Inference Layer and Context Builder merge parallel streams.
4. **Terminal Nodes**: Personalized Diagnosis output.

**Critical Path**: Capture → Ingestion → Analysis → Inference → Graph → RAG Retrieval → Context → Diagnosis Generation → Explanation

**Parallelizable Paths**:
- Code Evolution + Behavioral Analysis (can run concurrently).
- Embedding Search + Graph Traversal (can run concurrently).

---

## Dual-Fork Pattern Details

### Analysis Fork
```
Input: Raw Submission
    │
    ├─── Code Evolution Branch
    │    ├── Myers Diff
    │    ├── Structural Code Pattern Analysis  
    │    └── Edit Distance
    │
    └─── Behavioral Branch
         ├── Attempt Analysis
         ├── Timing Analysis
         └── Performance Analysis
    │
    └──→ Signal Fusion → Inference Layer
```

### Retrieval Fork
```
Input: Root Cause + Historical Context
    │
    ├─── Semantic Branch
    │    ├── Text Embedding
    │    ├── Vector Storage
    │    └── k-NN Search
    │
    └─── Graph Branch
         ├── Cypher Queries
         ├── Subgraph Traversal
         └── PageRank Scoring
    │
    └──→ Hybrid Fusion → Context Builder
```

---

## Neo4j Subgraph Structure

```
Problem Nodes (P)
    │
    ▼ [TRIGGERED]
FailureEvent Nodes (F)
    │
    ▼ [HAS_EVIDENCE]
Evidence Nodes (E)
    │
    ▼ [SUGGESTS]
RootCause Nodes (R)
    │
    ▼ [INDICATES]
Weakness Nodes (W)
    │
    ▼ [ADDRESSED_BY]
LearningStrategy Nodes (L)

Cross-connections:
- (P)-[SIMILAR_TO]-(P)
- (F)-[FOLLOWS]-(F) 
- (W)-[RELATED_TO]-(W)
- (R)-[CO_OCCURS]-(R)
```

**Subgraph Queries**: When diagnosing a new failure, the system extracts 2-3 hop neighborhoods around related Problem and Weakness nodes, creating focused subgraphs that capture relevant failure patterns without overwhelming the retrieval context.

---

## Performance Characteristics

- **Ingestion Latency**: <200ms for submission capture.
- **Analysis Processing**: 1-3 seconds for dual-fork analysis.
- **Graph Traversal**: <500ms for 3-hop subgraph queries.
- **LLM Reasoning**: 2-8 seconds depending on context size.
- **End-to-End Latency**: 5-15 seconds for complete diagnosis.

---

## Scalability Considerations

- **Horizontal Scaling**: Analysis and Retrieval forks can be distributed across multiple workers.
- **Database Sharding**: Neo4j can be partitioned by user or problem type.
- **Caching Strategy**: Embeddings and PageRank scores cached for performance.
- **Rate Limiting**: API endpoints protected against abuse while maintaining responsiveness.