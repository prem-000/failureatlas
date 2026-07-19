# Praxis Local Development Setup

## Prerequisites

Before setting up Praxis locally, ensure you have the following installed:

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

#### Groq API Key
Get a free API key from [console.groq.com](https://console.groq.com) — no local installation required.

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

# AI/ML API Keys (Groq — get yours at https://console.groq.com)
GROQ_API_KEY="gsk_your_groq_api_key_here"

# Application Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret_at_least_32_chars"
JWT_SECRET="your_jwt_signing_secret_at_least_32_chars"

# Optional: Development features
DEBUG="true"
LOG_LEVEL="debug"
USE_MOCK_EMBEDDINGS="true"
```

#### Environment Variable Descriptions

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `GROQ_API_KEY` | Groq API key for LLM inference | `gsk_...` |
| `NEXTAUTH_URL` | Base URL for authentication | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for session encryption | Random 32+ character string |
| `JWT_SECRET` | JWT token signing secret | Random 32+ character string |
| `USE_MOCK_EMBEDDINGS` | Use mock embeddings (no API cost) | `true` / `false` |

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



### 4. Development Server Startup

#### Start All Services
```bash
# Development mode with hot reloading
pnpm dev

# This starts:
# - Next.js web app on http://localhost:3000
# - API server on http://localhost:3000/api
# - Practice Tracking and auto-reload
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
1. Click the Praxis extension icon
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
    "redis": "connected"
  }
}
```

#### Database Connectivity
```bash
# Test PostgreSQL connection
pnpm prisma db push --preview-feature
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
      POSTGRES_DB: praxis_dev
      POSTGRES_USER: praxis
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data


  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:

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

### 2. Groq API Issues

**Problem:** Groq API calls failing

**Solutions:**
```bash
# Verify GROQ_API_KEY is set in .env.local
echo $GROQ_API_KEY | head -c 10

# Test Groq API key validity
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# Check environment file loading
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.GROQ_API_KEY?.substring(0,10))"
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

### 5. Groq API Key Issues

**Problem:** Groq LLM API calls failing or returning errors

**Solutions:**
```bash
# Verify GROQ_API_KEY is set
echo $GROQ_API_KEY | head -c 10

# Test Groq API key validity
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# Check environment file loading
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.GROQ_API_KEY?.substring(0,10))"
```

## Development Workflow

### Recommended Development Flow
1. Start database services (`docker-compose up` or individual services)
2. Run database migrations (`pnpm prisma migrate dev`)
3. Start development server (`pnpm dev`)
4. Load Chrome extension in developer mode
5. Test with submissions
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

This setup provides a complete local development environment for Praxis with all necessary Growth Opportunities, proper configuration, and debugging capabilities.