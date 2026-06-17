# Praxis Neo4j Graph Schema

## Overview

Praxis models Learning Intelligence as a knowledge graph where learning challenges, root causes, and weaknesses are interconnected entities. This graph structure enables powerful traversal queries, pattern recognition, and PageRank-based importance scoring.

## Node Types

### 1. Problem Nodes

Represent individual competitive programming problems from platforms like LeetCode.

```cypher
CREATE (:Problem {
  problemId: String,           // "two-sum", "binary-search"
  title: String,              // "Two Sum", "Binary Search"  
  difficulty: String,         // "Easy", "Medium", "Hard"
  topics: [String],           // ["Array", "Hash Table"]
  platform: String,          // "LeetCode", "Codeforces"
  url: String,               // Direct link to problem
  constraints: String,       // "1 <= nums.length <= 10^4"
  testCaseCount: Integer,    // Total number of test cases
  acceptanceRate: Float,     // Global acceptance rate
  createdAt: DateTime,
  updatedAt: DateTime
})
```

**Properties:**
- `problemId` (String, Unique): Platform-specific identifier
- `title` (String): Human-readable problem name
- `difficulty` (String): Easy/Medium/Hard classification
- `topics` (Array[String]): Algorithm/data structure categories
- `platform` (String): Source platform (LeetCode, Codeforces, etc.)
- `url` (String): Direct link to the problem
- `constraints` (String): Problem constraints text
- `testCaseCount` (Integer): Total number of test cases
- `acceptanceRate` (Float): Global acceptance rate (0.0-1.0)

### 2. ChallengeEvent Nodes

Represent individual submission challenges with contextual metadata.

```cypher
CREATE (:ChallengeEvent {
  eventId: String,            // UUID for this specific challenge
  userId: String,             // User identifier
  submissionStatus: String,   // "Wrong Answer", "Time Limit Exceeded"
  code: String,              // Submitted code
  language: String,          // "Python", "Java", "C++"
  runtime: Integer,          // Runtime in milliseconds
  memory: Float,            // Memory usage in MB
  testCasesPassed: Integer, // Number of test cases passed
  failedTestCase: String,   // Description of failed test case
  timeSpent: Integer,       // Time spent on problem (seconds)
  attemptNumber: Integer,   // 1st, 2nd, 3rd attempt, etc.
  timestamp: DateTime,
  createdAt: DateTime
})
```

**Properties:**
- `eventId` (String, Unique): UUID for this specific challenge
- `userId` (String): User identifier for grouping challenges
- `submissionStatus` (String): Wrong Answer/TLE/MLE/Runtime Error
- `code` (String): Full submitted code
- `language` (String): Programming language used
- `runtime` (Integer): Execution time in milliseconds
- `memory` (Float): Memory consumption in MB
- `testCasesPassed` (Integer): How many test cases passed
- `failedTestCase` (String): Description of the failing test case
- `timeSpent` (Integer): Total time spent on problem in seconds
- `attemptNumber` (Integer): Which attempt this was (1st, 2nd, etc.)

### 3. Evidence Nodes

Represent specific pieces of evidence extracted from code analysis and behavioral signals.

```cypher
CREATE (:Evidence {
  evidenceId: String,         // UUID
  type: String,              // "code_diff", "behavioral", "test_failure"
  description: String,       // "Changed < to <= in loop condition"
  confidence: Float,         // Confidence score (0.0-1.0)
  source: String,           // "myers_diff", "structural_pattern_analysis", "timing"
  rawData: String,          // Original diff or signal data
  extractedAt: DateTime,
  createdAt: DateTime
})
```

**Properties:**
- `evidenceId` (String, Unique): UUID for this evidence
- `type` (String): Evidence category (code_diff/behavioral/test_failure)
- `description` (String): Human-readable evidence description
- `confidence` (Float): Algorithmic confidence in this evidence (0.0-1.0)
- `source` (String): Which analyzer produced this evidence
- `rawData` (String): Original diff, timing data, or signal
- `extractedAt` (DateTime): When this evidence was extracted

### 4. RootCause Nodes

Represent classified root causes of challenges from the ontology taxonomy.

```cypher
CREATE (:RootCause {
  causeId: String,           // "boundary-condition-error"
  name: String,             // "Boundary Condition Error"
  category: String,         // "Logic Error", "Algorithm Error"
  description: String,      // Detailed explanation
  commonPatterns: [String], // ["off-by-one", "< vs <="]
  detectionSignals: [String], // Signals that indicate this cause
  createdAt: DateTime
})
```

**Properties:**
- `causeId` (String, Unique): Kebab-case identifier
- `name` (String): Human-readable cause name
- `category` (String): High-level category from ontology
- `description` (String): Detailed explanation of this root cause
- `commonPatterns` (Array[String]): Common manifestations of this cause
- `detectionSignals` (Array[String]): Signals that typically indicate this cause

### 5. Weakness Nodes

Represent higher-level learning gaps that aggregate multiple root causes.

```cypher
CREATE (:Weakness {
  weaknessId: String,        // "edge-case-reasoning"
  name: String,             // "Edge Case Reasoning"
  domain: String,           // "Algorithmic Thinking", "Implementation"
  description: String,      // Detailed weakness explanation
  learningObjectives: [String], // What should be learned
  pageRankScore: Float,     // Computed importance score
  userFrequency: Integer,   // How often user hits this weakness
  lastOccurrence: DateTime, // Most recent challenge
  createdAt: DateTime,
  updatedAt: DateTime
})
```

**Properties:**
- `weaknessId` (String, Unique): Kebab-case identifier
- `name` (String): Human-readable weakness name
- `domain` (String): Learning domain classification
- `description` (String): Detailed explanation of the weakness
- `learningObjectives` (Array[String]): What needs to be learned
- `pageRankScore` (Float): Computed importance for this user
- `userFrequency` (Integer): How many times user has hit this
- `lastOccurrence` (DateTime): Most recent challenge with this weakness

### 6. LearningStrategy Nodes

Represent specific learning recommendations and practice plans.

```cypher
CREATE (:LearningStrategy {
  strategyId: String,        // "boundary-practice-plan"
  name: String,             // "Boundary Condition Practice Plan"
  type: String,             // "practice_set", "concept_review", "technique"
  description: String,      // Strategy explanation
  practiceProblems: [String], // Recommended problem IDs
  concepts: [String],       // Key concepts to review
  techniques: [String],       // Specific techniques to practice
  estimatedTime: Integer,   // Time investment in hours
  difficultyProgression: [String], // Easy -> Medium -> Hard
  createdAt: DateTime
})
```

**Properties:**
- `strategyId` (String, Unique): Kebab-case identifier
- `name` (String): Human-readable strategy name
- `type` (String): Type of learning intervention
- `description` (String): Detailed strategy explanation
- `practiceProblems` (Array[String]): Recommended problem IDs
- `concepts` (Array[String]): Key concepts that should be reviewed
- `techniques` (Array[String]): Specific techniques to practice
- `estimatedTime` (Integer): Expected time investment in hours
- `difficultyProgression` (Array[String]): Recommended difficulty order

## Relationship Types

### 1. TRIGGERED

Connects Problems to ChallengeEvents, representing when a specific problem caused a challenge.

```cypher
CREATE (p:Problem)-[:TRIGGERED {
  userId: String,           // Which user experienced this
  frequency: Integer,       // How many times this problem triggered challenge
  firstChallenge: DateTime,   // When user first challenged this problem
  lastChallenge: DateTime,    // Most recent challenge
  averageAttempts: Float,   // Average attempts before success/giving up
  pattern: String          // "consistent", "occasional", "one-off"
}]->(f:ChallengeEvent)
```

**Properties:**
- `userId` (String): User experiencing the challenge
- `frequency` (Integer): Total challenge count for this user+problem
- `firstChallenge` (DateTime): First time user challenged this problem
- `lastChallenge` (DateTime): Most recent challenge
- `averageAttempts` (Float): Average attempts across sessions
- `pattern` (String): Challenge pattern classification

**Cardinality:** One-to-Many (Problem → ChallengeEvents)

### 2. HAS_EVIDENCE

Connects ChallengeEvents to Evidence, linking challenges to their supporting evidence.

```cypher
CREATE (f:ChallengeEvent)-[:HAS_EVIDENCE {
  extractionMethod: String, // "myers_diff", "structural_pattern_analysis"
  confidence: Float,        // Confidence in this evidence
  primary: Boolean,        // Whether this is primary evidence
  extractedAt: DateTime
}]->(e:Evidence)
```

**Properties:**
- `extractionMethod` (String): Which algorithm extracted this evidence
- `confidence` (Float): Confidence score (0.0-1.0)
- `primary` (Boolean): Whether this is the primary evidence for inference
- `extractedAt` (DateTime): When evidence was extracted

**Cardinality:** One-to-Many (ChallengeEvent → Evidence)

### 3. SUGGESTS

Connects Evidence to RootCauses, representing the inference from evidence to cause.

```cypher
CREATE (e:Evidence)-[:SUGGESTS {
  confidence: Float,        // Bayesian inference confidence
  weight: Float,           // Evidence weight in inference
  method: String,          // "bayesian", "rule_based", "llm_inference"
  inferredAt: DateTime
}]->(r:RootCause)
```

**Properties:**
- `confidence` (Float): Bayesian confidence in this inference
- `weight` (Float): How much this evidence contributes to the inference
- `method` (String): Inference method used
- `inferredAt` (DateTime): When inference was made

**Cardinality:** Many-to-One (Evidence → RootCause)

### 4. INDICATES

Connects RootCauses to Weaknesses, aggregating causes into higher-level gaps.

```cypher
CREATE (r:RootCause)-[:INDICATES {
  strength: Float,          // How strongly this cause indicates weakness
  frequency: Integer,       // How often this mapping occurs
  userSpecific: Boolean,   // Whether this is user-specific or universal
  validatedBy: String     // "expert_review", "statistical_analysis"
}]->(w:Weakness)
```

**Properties:**
- `strength` (Float): How strongly this cause indicates the weakness
- `frequency` (Integer): How often this cause-weakness mapping occurs
- `userSpecific` (Boolean): User-specific or universally true mapping
- `validatedBy` (String): How this mapping was validated

**Cardinality:** Many-to-Many (RootCause ↔ Weakness)

### 5. ADDRESSED_BY

Growth Opportunities to LearningStrategies, linking gaps to solutions.

```cypher
CREATE (w:Weakness)-[:ADDRESSED_BY {
  effectiveness: Float,     // How effective this strategy is
  timeInvestment: Integer, // Required time investment
  prerequisites: [String], // Required prior knowledge
  difficulty: String,      // "beginner", "intermediate", "advanced"
  validatedBy: String     // "user_feedback", "expert_design"
}]->(l:LearningStrategy)
```

**Properties:**
- `effectiveness` (Float): Measured/estimated effectiveness (0.0-1.0)
- `timeInvestment` (Integer): Required time in hours
- `prerequisites` (Array[String]): Required prior knowledge
- `difficulty` (String): Strategy difficulty level
- `validatedBy` (String): How effectiveness was validated

**Cardinality:** Many-to-Many (Weakness ↔ LearningStrategy)

### 6. Cross-Connection Relationships

#### SIMILAR_TO
Connects Problems that share algorithmic patterns or failure modes.

```cypher
CREATE (p1:Problem)-[:SIMILAR_TO {
  similarity: Float,        // Cosine similarity of failure patterns
  sharedTopics: [String],  // Common algorithmic topics
  sharedPatterns: [String], // Common failure patterns
  computedAt: DateTime
}]->(p2:Problem)
```

#### FOLLOWS
Connects FailureEvents in temporal sequence for the same user.

```cypher
CREATE (f1:FailureEvent)-[:FOLLOWS {
  timeGap: Integer,        // Minutes between failures
  sameSession: Boolean,    // Whether part of same coding session
  learningEvidence: Boolean // Whether second failure shows learning
}]->(f2:FailureEvent)
```

#### CO_OCCURS
Connects RootCauses that frequently appear together.

```cypher
CREATE (r1:RootCause)-[:CO_OCCURS {
  frequency: Integer,       // How often they co-occur
  correlation: Float,       // Statistical correlation
  userPattern: Boolean     // Whether this is user-specific
}]->(r2:RootCause)
```

## Example Cypher Queries

### Insert New Practice Session

```cypher
// Create failure event with problem connection
MATCH (p:Problem {problemId: "two-sum"})
CREATE (f:FailureEvent {
  eventId: "failure-" + randomUUID(),
  userId: "user123",
  submissionStatus: "Wrong Answer",
  code: "class Solution:\n    def twoSum(self, nums, target):",
  language: "Python",
  runtime: 142,
  memory: 16.2,
  testCasesPassed: 54,
  failedTestCase: "Input: [2,7,11,15], target=9, Expected: [0,1]",
  timeSpent: 1847,
  attemptNumber: 2,
  timestamp: datetime(),
  createdAt: datetime()
})
CREATE (p)-[:TRIGGERED {
  userId: "user123",
  frequency: 1,
  firstFailure: datetime(),
  lastFailure: datetime(),
  pattern: "first-occurrence"
}]->(f)
RETURN f
```

### Traverse from Problem to Weakness

```cypher
// Find all weaknesses associated with a specific problem for a user
MATCH path = (p:Problem {problemId: "binary-search"})-[:TRIGGERED {userId: "user123"}]->(f:FailureEvent)
-[:HAS_EVIDENCE]->(e:Evidence)-[:SUGGESTS]->(r:RootCause)-[:INDICATES]->(w:Weakness)
RETURN p.title, r.name, w.name, w.pageRankScore
ORDER BY w.pageRankScore DESC
```

### Run PageRank on Weakness Nodes

```cypher
// Compute PageRank scores for weakness nodes for a specific user
CALL gds.pageRank.stream({
  nodeQuery: '
    MATCH (w:Weakness) 
    WHERE EXISTS((w)<-[:INDICATES]-(:RootCause)<-[:SUGGESTS]-(:Evidence)<-[:HAS_EVIDENCE]-(:FailureEvent {userId: "user123"}))
    RETURN id(w) as id
  ',
  relationshipQuery: '
    MATCH (w1:Weakness)<-[:INDICATES]-(r:RootCause)-[:INDICATES]->(w2:Weakness)
    WHERE EXISTS((w1)<-[:INDICATES]-(:RootCause)<-[:SUGGESTS]-(:Evidence)<-[:HAS_EVIDENCE]-(:FailureEvent {userId: "user123"}))
    AND EXISTS((w2)<-[:INDICATES]-(:RootCause)<-[:SUGGESTS]-(:Evidence)<-[:HAS_EVIDENCE]-(:FailureEvent {userId: "user123"}))
    RETURN id(w1) as source, id(w2) as target, 1.0 as weight
  '
})
YIELD nodeId, score
MATCH (w:Weakness) WHERE id(w) = nodeId
SET w.pageRankScore = score
RETURN w.name, score ORDER BY score DESC
```

### Find Top Weaknesses for User

```cypher
// Get top 5 weaknesses for a user based on frequency and PageRank
MATCH (w:Weakness)<-[:INDICATES]-(r:RootCause)<-[:SUGGESTS]-(e:Evidence)
<-[:HAS_EVIDENCE]-(f:FailureEvent {userId: "user123"})
WITH w, count(f) as frequency, avg(w.pageRankScore) as avgPageRank
RETURN w.name, w.description, frequency, avgPageRank,
       (frequency * 0.6 + avgPageRank * 0.4) as combinedScore
ORDER BY combinedScore DESC
LIMIT 5
```

### Find Similar Failures

```cypher
// Find failures similar to current failure based on problem similarity and root causes
MATCH (currentF:FailureEvent {eventId: "current-failure-id"})
-[:HAS_EVIDENCE]->(e1:Evidence)-[:SUGGESTS]->(r:RootCause)
MATCH (r)<-[:SUGGESTS]-(e2:Evidence)<-[:HAS_EVIDENCE]-(similarF:FailureEvent)
WHERE similarF.userId = currentF.userId AND similarF <> currentF
WITH similarF, count(r) as sharedRootCauses
MATCH (currentF)-[:TRIGGERED]-(p1:Problem)-[:SIMILAR_TO {similarity: similarity}]-(p2:Problem)-[:TRIGGERED]-(similarF)
RETURN similarF, sharedRootCauses, similarity,
       (sharedRootCauses * 0.7 + similarity * 0.3) as relevanceScore
ORDER BY relevanceScore DESC
LIMIT 10
```

### Subgraph Extraction for RAG

```cypher
// Extract 2-hop neighborhood around current failure for RAG context
MATCH path = (center:FailureEvent {eventId: "current-failure-id"})
-[:HAS_EVIDENCE*1..2|:SUGGESTS*1..2|:INDICATES*1..2|:ADDRESSED_BY*1..2]->(connected)
WHERE connected:Evidence OR connected:RootCause OR connected:Weakness OR connected:LearningStrategy
WITH center, collect(DISTINCT connected) as neighborhood
RETURN {
  centerFailure: center,
  relatedEvidence: [n IN neighborhood WHERE n:Evidence],
  relatedRootCauses: [n IN neighborhood WHERE n:RootCause],
  relatedWeaknesses: [n IN neighborhood WHERE n:Weakness],
  suggestedStrategies: [n IN neighborhood WHERE n:LearningStrategy]
} as subgraph
```

## Visual Schema Diagram

```
                    Problems
                   ┌─────────┐
                   │ Two Sum │
                   │ Binary  │ 
                   │ Search  │
                   └─────────┘
                        │ TRIGGERED
                        ▼
                 FailureEvents
                ┌──────────────┐
                │ Wrong Answer │
                │ TLE          │
                │ MLE          │
                └──────────────┘
                        │ HAS_EVIDENCE
                        ▼
                   Evidence
                ┌──────────────┐
                │ Code Diff    │
                │ Behavioral   │
                │ Test Failure │
                └──────────────┘
                        │ SUGGESTS
                        ▼
                 Root Causes
                ┌──────────────┐
                │ Boundary Err │
                │ Algorithm    │
                │ Logic Error  │
                └──────────────┘
                        │ INDICATES  
                        ▼
                  Weaknesses
                ┌──────────────┐
                │ Edge Cases   │
                │ Pattern Rec  │
                │ Optimization │
                └──────────────┘
                        │ ADDRESSED_BY
                        ▼
              Learning Strategies
                ┌──────────────┐
                │ Practice Set │
                │ Concept Rev  │
                │ Technique    │
                └──────────────┘

Cross-connections:
- Problems ←→ Problems (SIMILAR_TO)
- FailureEvents → FailureEvents (FOLLOWS)
- RootCauses ←→ RootCauses (CO_OCCURS)
- Weaknesses ←→ Weaknesses (RELATED_TO)
```

## Indexes and Constraints

```cypher
// Unique constraints
CREATE CONSTRAINT problem_id_unique FOR (p:Problem) REQUIRE p.problemId IS UNIQUE;
CREATE CONSTRAINT failure_event_id_unique FOR (f:FailureEvent) REQUIRE f.eventId IS UNIQUE;
CREATE CONSTRAINT evidence_id_unique FOR (e:Evidence) REQUIRE e.evidenceId IS UNIQUE;
CREATE CONSTRAINT root_cause_id_unique FOR (r:RootCause) REQUIRE r.causeId IS UNIQUE;
CREATE CONSTRAINT weakness_id_unique FOR (w:Weakness) REQUIRE w.weaknessId IS UNIQUE;
CREATE CONSTRAINT strategy_id_unique FOR (l:LearningStrategy) REQUIRE l.strategyId IS UNIQUE;

// Performance indexes
CREATE INDEX failure_user_idx FOR (f:FailureEvent) ON (f.userId);
CREATE INDEX failure_timestamp_idx FOR (f:FailureEvent) ON (f.timestamp);
CREATE INDEX weakness_pagerank_idx FOR (w:Weakness) ON (w.pageRankScore);
CREATE INDEX problem_difficulty_idx FOR (p:Problem) ON (p.difficulty);
CREATE INDEX evidence_confidence_idx FOR (e:Evidence) ON (e.confidence);
```

## Graph Statistics and Sizing

**Expected Node Counts (per active user):**
- Problems: 500-2000 (platform-specific)
- FailureEvents: 100-1000 per month
- Evidence: 300-3000 per month (3x failure events)
- RootCauses: 15-25 (ontology-defined)
- Weaknesses: 8-15 (higher-level aggregation)
- LearningStrategies: 20-40 (reusable across users)

**Relationship Density:**
- High: FailureEvent→Evidence (1:3 ratio)
- Medium: Evidence→RootCause (3:1 ratio)
- Low: RootCause→Weakness (sparse, many-to-many)

**Query Performance:**
- User weakness traversal: <50ms for 2-3 hops
- PageRank computation: <200ms for 1000 weakness nodes
- Similar failure search: <100ms with proper indexing