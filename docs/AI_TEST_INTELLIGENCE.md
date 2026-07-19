# AI Test Intelligence Engine

## Goal

Replace static prescription checklists with a dynamic reasoning engine that explains failures, infers hidden test categories, and generates personalized adversarial test cases.

## Features

- Dynamic failure reasoning
- Hidden test category inference
- Personalized edge-case generation
- Behavioral adaptation
- Knowledge Graph integration
- Bayesian confidence scoring
- Multi-key Groq failover
- Automatic retry and rate-limit handling
- User-specific recommendation generation
- Progressive adversarial testing

## Flow

Submission
→ Capture
→ Behavioral Analysis
→ Myers Diff
→ Bayesian Root Cause
→ Relational Graph Retrieval
→ User History Retrieval
→ Problem Metadata
→ Constraint Analysis
→ Groq Prompt Builder
→ Multi-Key Groq Client
→ Diagnosis
→ Hidden Test Inference
→ Personalized Edge Cases
→ Explanations
→ Learning Prescription
→ Graph Update

## Generated Sections

- Why your solution failed
- Evidence from your code
- Inferred hidden test categories
- Personalized edge cases
- Constraint stress tests
- Behavioral recommendations
- Fix strategy
- Confidence scores
- Similar historical failures

## Multi-Key Groq Configuration

Environment Variables

GROQ_API_KEY_1
GROQ_API_KEY_2
GROQ_MODEL
GROQ_TIMEOUT
GROQ_MAX_RETRIES
GROQ_KEY_STRATEGY

Supported strategies

- round-robin
- failover
- least-used

Automatic handling

- HTTP 429 retry
- Exponential backoff
- Per-key health monitoring
- Automatic cooldown recovery

## Future Extensions

- Code execution against generated tests
- Counterexample minimization
- Property-based test generation
- Mutation testing
- Difficulty-aware adversarial generation
- Continuous learning from accepted submissions
