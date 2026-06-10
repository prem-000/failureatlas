# FailureAtlas Local Development Setup

## Prerequisites

Before setting up FailureAtlas locally, ensure you have the following installed:

### Required Software

#### Node.js (v18.0.0 or higher)
```bash
# Check current version
node --version

# Install via Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

Or install from [nodejs.org](https://nodejs.org)

#### pnpm Package Manager
```bash
# Install pnpm globally
npm install -g pnpm@latest

# Verify installation
pnpm --version
```

#### PostgreSQL (v14.0 or higher)
```bash
# macOS with Homebrew
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-14 postgresql-client-14

# Windows
# Download installer from https://www.postgresql.org/download/windows/
```

#### Neo4j (v5.0 or higher)
```bash
# macOS with Homebrew
brew install neo4j
brew services start neo4j

# Ubuntu/Debian
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt update
sudo apt install neo4j

# Windows
# Download installer from https://neo4j.com/download/
```

### Optional but Recommended

#### Docker & Docker Compose
For containerized database setup:
```bash
# macOS
brew install docker docker-compose

# Ubuntu/Debian  
sudo apt install docker.io docker-compose

# Windows
# Install Docker Desktop from https://docker.com/products/docker-desktop
```

#### Redis (for caching)
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server

# Windows via WSL or Docker recommended
```

## Local Development Setup

### 1. Repository Clone and Dependencies

```bash
# Clone repository
git clone https://github.com/your-org/failureatlas.git
cd failureatlas

# Install dependencies for all workspaces
pnpm install

# Verify workspace structure
pnpm ls --depth=0
```

### 2. Environment Configuration

#### Create Environment File
```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your specific values
nano .env.local  # or code .env.local
```

#### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/failureatlas_dev"
NEO4J_URI="bolt://localhost:7687"
NEO4J_USERNAME="neo4j"
NEO4J_PASSWORD="your_neo4j_password"

# AI/ML API Keys
OPENAI_API_KEY="sk-your_openai_api_key_here"
ANTHROPIC_API_KEY="sk-ant-your_anthropic_key_here"

# Application Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret_at_least_32_chars"
JWT_SECRET="your_jwt_signing_secret_at_least_32_chars"

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"

# Optional: Development features
DEBUG="true"
LOG_LEVEL="debug"
ANALYTICS_ENABLED="false"
```

#### Environment Variable Descriptions

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEO4J_URI` | Neo4j database URI | `bolt://localhost:7687` |
| `NEO4J_USERNAME` | Neo4j authentication username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j authentication password | `securepassword` |
| `OPENAI_API_KEY` | OpenAI API key for embeddings/LLM | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | `sk-ant-...` |
| `NEXTAUTH_URL` | Base URL for authentication | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for session encryption | Random 32+ character string |
| `JWT_SECRET` | JWT token signing secret | Random 32+ character string |

### 3. Database Setup

#### PostgreSQL Database Creation
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE failureatlas_dev;
CREATE USER failureatlas WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE failureatlas_dev TO failureatlas;

# Enable required extensions
\c failureatlas_dev
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;  -- for pgvector

\q
```

#### Prisma Database Migration
```bash
# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev --name init

# Verify schema
pnpm prisma db push

# Optional: Seed database with sample data
pnpm prisma db seed
```

#### Neo4j Database Setup
```bash
# Start Neo4j (if not using systemd)
neo4j start

# Access Neo4j browser at http://localhost:7474
# Initial login: neo4j/neo4j (change password on first login)

# Create constraints and indexes
cypher-shell -u neo4j -p your_password < scripts/neo4j-setup.cypher
```

#### Neo4j Schema Initialization Script
Create `scripts/neo4j-setup.cypher`:
```cypher
// Create unique constraints
CREATE CONSTRAINT problem_id_unique FOR (p:Problem) REQUIRE p.problemId IS UNIQUE;
CREATE CONSTRAINT failure_event_id_unique FOR (f:FailureEvent) REQUIRE f.eventId IS UNIQUE;
CREATE CONSTRAINT evidence_id_unique FOR (e:Evidence) REQUIRE e.evidenceId IS UNIQUE;
CREATE CONSTRAINT root_cause_id_unique FOR (r:RootCause) REQUIRE r.causeId IS UNIQUE;
CREATE CONSTRAINT weakness_id_unique FOR (w:Weakness) REQUIRE w.weaknessId IS UNIQUE;
CREATE CONSTRAINT strategy_id_unique FOR (l:LearningStrategy) REQUIRE l.strategyId IS UNIQUE;

// Create performance indexes
CREATE INDEX failure_user_idx FOR (f:FailureEvent) ON (f.userId);
CREATE INDEX failure_timestamp_idx FOR (f:FailureEvent) ON (f.timestamp);
CREATE INDEX weakness_pagerank_idx FOR (w:Weakness) ON (w.pageRankScore);

// Insert initial ontology data
CREATE (r1:RootCause {
  causeId: "boundary-condition-error",
  name: "Boundary Condition Error", 
  category: "Logic Error",
  description: "Incorrect handling of edge cases and boundary conditions"
});

CREATE (w1:Weakness {
  weaknessId: "edge-case-reasoning",
  name: "Edge Case Reasoning",
  domain: "Algorithmic Thinking",
  description: "Difficulty with boundary conditions and edge cases"
});

CREATE (r1)-[:INDICATES {strength: 0.9}]->(w1);
```

### 4. Development Server Startup

#### Start All Services
```bash
# Development mode with hot reloading
pnpm dev

# This starts:
# - Next.js web app on http://localhost:3000
# - API server on http://localhost:3000/api
# - File watching and auto-reload
```

#### Start Individual Services
```bash
# Web app + API (unified — Next.js handles both)
npm run dev

# Extension development build with watch mode
cd apps/extension
npm run dev
```

### 5. Chrome Extension Development Setup

#### Extension Installation
```bash
# Build extension for development
cd apps/extension
pnpm build:dev

# Extension files will be in dist/ folder
```

#### Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle (top-right)
3. Click "Load unpacked"
4. Select the `apps/extension/dist` folder
5. Extension should appear in toolbar

#### Extension Configuration
1. Click the FailureAtlas extension icon
2. Enter your local development API URL: `http://localhost:3000/api`
3. Create a test account or use existing credentials
4. Extension will now send data to your local instance

### 6. Verification Steps

#### Health Check Endpoints
```bash
# Check API health
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "neo4j": "connected"
  }
}
```

#### Database Connectivity
```bash
# Test PostgreSQL connection
pnpm prisma db push --preview-feature

# Test Neo4j connection
echo "RETURN 'Neo4j connected' AS message" | cypher-shell -u neo4j -p your_password
```

#### Sample API Requests
```bash
# Register test user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword","name":"Test User"}'

# Login and get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

## Docker Setup (Alternative)

For a containerized development environment:

### Docker Compose Configuration
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: failureatlas_dev
      POSTGRES_USER: failureatlas
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  neo4j:
    image: neo4j:5.5-community
    environment:
      NEO4J_AUTH: neo4j/dev_password
      NEO4J_PLUGINS: '["apoc"]'
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  neo4j_data: 
  redis_data:
```

#### Start Docker Services
```bash
# Start all database services
docker-compose -f docker-compose.dev.yml up -d

# Check service status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

## Troubleshooting Common Issues

### 1. PostgreSQL Connection Issues

**Problem:** `ECONNREFUSED` errors connecting to PostgreSQL

**Solutions:**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Restart PostgreSQL service
brew services restart postgresql@14   # macOS  
sudo systemctl restart postgresql    # Linux

# Check port availability
lsof -i :5432

# Reset PostgreSQL if corrupted
rm -rf /usr/local/var/postgres
initdb /usr/local/var/postgres -E utf8
```

### 2. Neo4j Authentication Errors

**Problem:** Authentication failed connecting to Neo4j

**Solutions:**
```bash
# Reset Neo4j password
neo4j-admin set-initial-password new_password

# Check Neo4j status
neo4j status

# Clear Neo4j data and restart
neo4j stop
rm -rf data/
neo4j start
```

### 3. pnpm Install Failures

**Problem:** Package installation fails with dependency conflicts

**Solutions:**
```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Use legacy peer deps if needed
pnpm install --legacy-peer-deps
```

### 4. Chrome Extension Not Loading

**Problem:** Extension fails to load or connect to API

**Solutions:**
```bash
# Rebuild extension
cd apps/extension
rm -rf dist/
pnpm build:dev

# Check Chrome console for errors
# Open chrome://extensions/ and check for error messages

# Verify manifest.json syntax
cat dist/manifest.json | jq '.'

# Check CORS settings in development
# Ensure API allows localhost:3000 origin
```

### 5. API Key Configuration Issues

**Problem:** OpenAI/Anthropic API calls failing

**Solutions:**
```bash
# Verify API keys are set
echo $OPENAI_API_KEY | head -c 20

# Test API key validity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | head

# Check environment file loading
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY?.substring(0,10))"
```

## Development Workflow

### Recommended Development Flow
1. Start database services (`docker-compose up` or individual services)
2. Run database migrations (`pnpm prisma migrate dev`)
3. Start development server (`pnpm dev`)
4. Load Chrome extension in developer mode
5. Test with LeetCode submissions
6. Monitor logs and debug as needed

### Useful Development Commands
```bash
# Reset entire development environment
pnpm run dev:reset

# Run tests
pnpm test

# Lint and format code
pnpm lint
pnpm format

# Generate Prisma client after schema changes
pnpm prisma generate

# View database in Prisma Studio
pnpm prisma studio

# Neo4j browser access
open http://localhost:7474
```

### Performance Monitoring
```bash
# Monitor API response times
pnpm run monitor:api

# Check database query performance  
pnpm run monitor:db

# Profile memory usage
node --inspect apps/web/server.js
```

This setup provides a complete local development environment for FailureAtlas with all necessary services, proper configuration, and debugging capabilities.