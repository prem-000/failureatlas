# Contributing to Praxis

## Overview

We welcome contributions to Praxis! This guide outlines our development workflow, coding standards, and contribution process. Whether you're fixing bugs, adding features, or improving documentation, this guide will help you contribute effectively.

## Development Workflow

### Branch Naming Conventions

We follow a structured branching strategy to maintain code organization and clarity:

#### Branch Types and Naming

**Feature Branches**
```
feature/[scope]/[description]
```
Examples:
- `feature/inference/bayesian-classification`
- `feature/graph/pagerank-optimization`  
- `feature/extension/manifest-v3-migration`
- `feature/api/batch-submission-endpoint`

**Bug Fix Branches**
```
fix/[scope]/[description]
```
Examples:
- `fix/inference/confidence-scoring-overflow`
- `fix/extension/leetcode-dom-changes`
- `fix/api/authentication-token-refresh`

**Hotfix Branches** (for critical production issues)
```
hotfix/[description]
```
Examples:
- `hotfix/security-vulnerability-patch`
- `hotfix/database-connection-leak`

**Documentation Branches**
```
docs/[area]/[description]
```
Examples:
- `docs/api/endpoint-documentation`
- `docs/setup/docker-configuration`

**Refactoring Branches**
```
refactor/[scope]/[description]
```
Examples:
- `refactor/inference/extract-bayesian-service`
- `refactor/graph/optimize-cypher-queries`

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit history and automated tooling.

#### Commit Message Structure
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types
- `feat`: New feature implementation
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting, missing semicolons, etc.
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Test additions or modifications
- `chore`: Build process, dependency updates, etc.

#### Examples
```bash
# Feature commit
feat(inference): implement Bayesian root cause classification

Add Bayesian classifier that combines code diff evidence with 
historical patterns to predict failure root causes. Includes
confidence scoring and alternative hypothesis ranking.

Closes #234

# Bug fix commit  
fix(extension): handle dynamic LeetCode DOM structure changes

LeetCode updated their submission result DOM structure, breaking
our result detection logic. Updated selectors to be more robust
and added fallback detection methods.

Fixes #456

# Breaking change commit
feat(api)!: redesign submission endpoint for batch processing

BREAKING CHANGE: The /api/submissions endpoint now expects an array
of submission objects instead of a single object. Update client
code to use the new batch format.

# Documentation commit
docs(setup): add Neo4j installation instructions for Windows

Include step-by-step Neo4j setup for Windows development
environment, including Docker alternative.
```

### Pull Request Process

#### 1. Create Pull Request

```bash
# Ensure you're on your feature branch
git checkout feature/inference/bayesian-classification

# Push your branch to origin  
git push -u origin feature/inference/bayesian-classification

# Create PR via GitHub CLI (optional)
gh pr create --title "feat(inference): implement Bayesian root cause classification" \
  --body "Implements Bayesian classifier for root cause inference with confidence scoring"
```

#### 2. Pull Request Template

When creating a PR, use this template:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)  
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Unit tests pass (`pnpm test`)
- [ ] Integration tests pass (`pnpm test:integration`)
- [ ] Manual testing completed
- [ ] Chrome extension tested with LeetCode

## Screenshots/Evidence
For UI changes or extension updates, include screenshots or evidence of functionality.

## Checklist
- [ ] Code follows style guidelines (`pnpm lint`)
- [ ] Self-review completed
- [ ] Documentation updated (if applicable)
- [ ] No new console warnings or errors
- [ ] Database migrations included (if applicable)
- [ ] Environment variables documented (if new ones added)
```

#### 3. Code Review Requirements

**Required Reviewers:**
- At least 1 maintainer approval required
- For algorithm changes: ML/algorithms team member
- For API changes: Backend team member
- For extension changes: Frontend team member

**Review Criteria:**
- Code quality and adherence to style guide
- Test coverage and edge case handling
- Performance implications
- Security considerations
- Documentation completeness

## Code Style and Standards

### ESLint Configuration

We use ESLint with TypeScript for consistent code style:

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    // Enforce consistent imports
    'import/order': ['error', {
      'groups': [
        'builtin',
        'external', 
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      'alphabetize': {
        'order': 'asc',
        'caseInsensitive': true
      }
    }],
    
    // TypeScript-specific rules
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    
    // Code quality rules
    'no-console': ['warn', { 'allow': ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

### Prettier Configuration

```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

### TypeScript Standards

```typescript
// Good: Proper type definitions
interface SubmissionEvent {
  eventId: string;
  problemSlug: string;
  submissionStatus: SubmissionStatus;
  timestamp: number;
}

// Good: Use enums for constants
enum SubmissionStatus {
  ACCEPTED = 'Accepted',
  WRONG_ANSWER = 'Wrong Answer',
  TIME_LIMIT_EXCEEDED = 'Time Limit Exceeded'
}

// Good: Proper error handling
async function analyzeSubmission(eventId: string): Promise<AnalysisResult> {
  try {
    const result = await inferenceService.analyze(eventId);
    return result;
  } catch (error) {
    logger.error('Analysis failed', { eventId, error });
    throw new AnalysisError('Failed to analyze submission', { cause: error });
  }
}

// Avoid: Using 'any' type
const processData = (data: any) => { /* ... */ };  // Bad

// Prefer: Proper type definition
const processData = (data: SubmissionEvent) => { /* ... */ };  // Good
```

## Repository Layout and Workspace Structure

FailureAtlas uses pnpm workspaces for managing the main Next.js web application and the Chrome Extension.

### Workspace Structure
```
failureatlas/
├── apps/
│   └── extension/              # Chrome Extension (v1.1.0 Manifest V3)
├── prisma/                     # PostgreSQL database schema and migrations
├── src/                        # Main web application (Next.js 15, React 19)
│   ├── app/                    # Next.js App Router and API endpoints
│   ├── components/             # Reusable UI components (Zustand, React Flow)
│   ├── lib/                    # Business logic (Bayesian classifier, Myers diff, PageRank)
│   └── styles/                 # Tailwind CSS styles and themes
└── tests/                      # Vitest test suite
```

### Adding New Business Logic

When adding or expanding features:
1. **Core Business Logic**: Implement functions in typescript inside `src/lib/`. For example, new algorithms should go in `src/lib/analysis/` or similar folders.
2. **Prisma Models**: If database changes are needed, update `prisma/schema.prisma` and run `npx prisma migrate dev`.
3. **API Routes**: Implement Next.js endpoints inside `src/app/api/`.

## Testing Guidelines

### Running Tests Locally

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @failureatlas/inference test

# Run tests with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration

# Watch mode for development
pnpm test:watch
```

### Test Structure and Conventions

#### Unit Tests
```typescript
// packages/inference/src/__tests__/bayesian.test.ts
import { BayesianClassifier } from '../bayesian';
import { mockSubmissionEvent } from './fixtures';

describe('BayesianClassifier', () => {
  let classifier: BayesianClassifier;

  beforeEach(() => {
    classifier = new BayesianClassifier();
  });

  describe('classify', () => {
    it('should return high confidence for clear boundary error', async () => {
      const evidence = {
        codeDiff: 'while left < right -> while left <= right',
        testFailure: 'single element array failed'
      };

      const result = await classifier.classify(evidence);

      expect(result.rootCause).toBe('boundary-condition-error');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle insufficient evidence gracefully', async () => {
      const evidence = {};

      const result = await classifier.classify(evidence);

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.alternatives).toHaveLength(0);
    });
  });
});
```

#### Integration Tests
```typescript
// apps/web/src/__tests__/api/submissions.integration.test.ts
import { testApiClient } from '../../test-utils';
import { createTestUser, cleanupTestData } from '../../test-helpers';

describe('/api/submissions integration', () => {
  let testUser: TestUser;
  let apiClient: TestApiClient;

  beforeAll(async () => {
    testUser = await createTestUser();
    apiClient = new TestApiClient(testUser.token);
  });

  afterAll(async () => {
    await cleanupTestData(testUser.id);
  });

  it('should create submission and trigger analysis', async () => {
    const submissionData = {
      eventId: 'test-event-123',
      problemSlug: 'two-sum',
      submissionStatus: 'Wrong Answer'
      // ... other required fields
    };

    const response = await apiClient.post('/api/submissions', submissionData);

    expect(response.status).toBe(201);
    expect(response.body.analysisQueued).toBe(true);
    
    // Wait for analysis to complete
    await waitForAnalysis(response.body.submissionId);
    
    const analysis = await apiClient.get(`/api/submissions/${response.body.submissionId}`);
    expect(analysis.body.submission.analysis).toBeDefined();
  });
});
```

## Learning Intelligencey Management

### Adding New Root Cause Types

To add a new root cause to the learning ontology:

#### 1. Update Type Definitions
Add the new root cause type to the platform's types (such as `src/types/index.ts` or custom mapping files). For example:
```typescript
export type RootCauseType =
  | 'boundary-condition-error'
  | 'algorithm-selection-mistake'
  | 'memory-management-error'; // Add your new cause type
```

#### 2. Update Classification Weights
Modify the Bayesian weights file (`src/lib/inference/bayesian-weights.json`) to register evidence-to-cause conditional probabilities for the new root cause type:
```json
{
  "evidenceLikelihoods": {
    "memory-management-error": {
      "memory_limit_exceeded": 0.85,
      "segmentation_fault": 0.70,
      "rapid_resubmission": 0.20
    }
  }
}
```

#### 3. Update Root Cause to Weakness Mapping
Map the new root cause to one of the 4 canonical systemic weaknesses in `src/lib/graph/pagerank.ts`:
```typescript
const ROOT_CAUSE_TO_WEAKNESS: Record<string, { id: string; name: string }> = {
  'boundary-condition-error': { id: 'edge-case-reasoning', name: 'Edge Case Reasoning' },
  'memory-management-error': { id: 'performance-analysis', name: 'Performance Analysis' } // Map new cause
};
```

#### 4. Add Test Coverage
Add unit and integration tests inside the `tests/` directory to verify that submissions with the targeted failure patterns result in the expected root cause classifications:
```typescript
describe('Memory Management Error Classification', () => {
  it('should identify memory leaks from submission events', async () => {
    const event = {
      status: 'Memory Limit Exceeded',
      code: 'def recursive(): return recursive()',
      memory: 512
    };
    const diagnosis = await runBayesianInference(event);
    expect(diagnosis.rootCause).toBe('memory-management-error');
  });
});
```

#### 5. Update Documentation
```markdown
<!-- docs/FAILURE_ONTOLOGY.md -->

### Memory Management Error
**Category**: Resource Error
**Description**: Incorrect handling of memory allocation, deallocation, or access patterns in the submitted code.

**Common Patterns**:
- Memory leaks in recursive functions without proper termination
- Buffer overflows in array or string operations  
- Dangling pointer access after memory deallocation
- Excessive memory allocation for large input sizes

**Detection Signals**:
- Memory Limit Exceeded submission status
- Segmentation fault runtime errors
- Exponential memory growth patterns
- Presence of manual memory management code

**Example Manifestations**:
```python
# Memory leak in recursive function
def fibonacci(n):
    cache = {}  # New cache created each call
    if n in cache:
        return cache[n]
    # ... recursive calls without cache reuse
```
```

### Validation Process

Before merging ontology changes:

1. **Statistical Validation**: Analyze at least 100 historical failures to confirm the new root cause occurs with sufficient frequency (>2%)

2. **Expert Review**: Have the ontology change reviewed by at least 2 domain experts

3. **A/B Testing**: Test classification accuracy with and without the new root cause on a holdout dataset

4. **Integration Testing**: Ensure the new root cause integrates properly with existing weakness mappings and learning strategies

## Performance Guidelines

### Database Query Optimization

#### Efficient Cypher Queries
```cypher
-- Good: Use parameters and indexes
MATCH (u:User {userId: $userId})-[:HAS_FAILURE]->(f:FailureEvent)
WHERE f.timestamp > $startTime
RETURN f
ORDER BY f.timestamp DESC  
LIMIT 50;

-- Avoid: String concatenation and full scans
MATCH (f:FailureEvent) 
WHERE f.userId = "user123" AND f.timestamp > 1674567890
RETURN f;
```

#### Prisma Query Optimization
```typescript
// Good: Include related data in single query
const submissions = await prisma.submission.findMany({
  where: { userId },
  include: {
    analysis: {
      select: { rootCause: true, confidence: true }
    }
  },
  take: 50,
  orderBy: { timestamp: 'desc' }
});

// Avoid: N+1 query pattern
const submissions = await prisma.submission.findMany({ where: { userId } });
for (const submission of submissions) {
  const analysis = await prisma.analysis.findUnique({ 
    where: { submissionId: submission.id } 
  });
}
```

### API Performance Standards

- **Response Times**: 
  - GET endpoints: <200ms (95th percentile)
  - POST endpoints: <500ms (95th percentile)  
  - Analysis endpoints: <5s (95th percentile)

- **Throughput**:
  - Submission ingestion: 1000 requests/minute per instance
  - Query endpoints: 2000 requests/minute per instance

- **Resource Usage**:
  - Memory: <512MB per Node.js process
  - CPU: <70% utilization under normal load

### Code Performance Best Practices

```typescript
// Good: Efficient data processing
const processSubmissions = (submissions: Submission[]) => {
  const groupedByProblem = submissions.reduce((acc, sub) => {
    acc[sub.problemSlug] = acc[sub.problemSlug] || [];
    acc[sub.problemSlug].push(sub);
    return acc;
  }, {} as Record<string, Submission[]>);
  
  return Object.entries(groupedByProblem).map(([slug, subs]) => ({
    problemSlug: slug,
    failureCount: subs.length,
    lastFailure: Math.max(...subs.map(s => s.timestamp))
  }));
};

// Avoid: Inefficient nested operations
const processSubmissions = (submissions: Submission[]) => {
  const problems = [...new Set(submissions.map(s => s.problemSlug))];
  
  return problems.map(slug => {
    const problemSubs = submissions.filter(s => s.problemSlug === slug);
    return {
      problemSlug: slug,
      failureCount: problemSubs.length,
      lastFailure: Math.max(...problemSubs.map(s => s.timestamp))
    };
  });
};
```

## Security Guidelines

### Input Validation
```typescript
// Good: Proper input validation
import { z } from 'zod';

const SubmissionSchema = z.object({
  eventId: z.string().uuid(),
  problemSlug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  submissionCode: z.string().max(50000), // Limit code size
  timestamp: z.number().int().positive()
});

export const validateSubmission = (data: unknown) => {
  return SubmissionSchema.parse(data);
};
```

### Authentication and Authorization
```typescript
// Good: Proper JWT verification
import jwt from 'jsonwebtoken';

export const authenticateUser = (token: string): User => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    return { id: payload.userId, email: payload.email };
  } catch (error) {
    throw new AuthenticationError('Invalid token');
  }
};

// Good: Rate limiting
import rateLimit from 'express-rate-limit';

const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each user to 100 requests per windowMs
  keyGenerator: (req) => req.user.id,
  message: 'Too many submissions, please try again later.'
});
```

## Documentation Standards

### API Documentation
Use OpenAPI/Swagger specifications for all API endpoints:

```yaml
# docs/api-spec.yaml
/api/submissions:
  post:
    summary: Submit failure event
    tags: [Submissions]
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/SubmissionEvent'
    responses:
      201:
        description: Submission created successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubmissionResponse'
```

### Code Documentation
Use JSDoc for TypeScript documentation:

```typescript
/**
 * Analyzes submission failure and infers root cause using Bayesian classification
 * 
 * @param submission - The submission event to analyze
 * @param userHistory - Historical failure data for the user
 * @returns Promise resolving to analysis result with confidence score
 * 
 * @example
 * ```typescript
 * const analysis = await inferRootCause(submission, userHistory);
 * console.log(`Root cause: ${analysis.rootCause} (${analysis.confidence}% confidence)`);
 * ```
 */
export async function inferRootCause(
  submission: SubmissionEvent, 
  userHistory: UserHistory
): Promise<AnalysisResult> {
  // Implementation
}
```

Thank you for contributing to Praxis! Following these guidelines helps maintain code quality and enables effective collaboration across the development team.