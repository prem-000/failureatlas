# Dockerfile for FailureAtlas Next.js Application
# Optimized for small size, security, and fast builds using multi-stage builds and BuildKit cache.

# --- Stage 1: Base Image ---
FROM node:22-alpine AS base

# Install libc6-compat for native node modules (such as Prisma and Sharp on Alpine)
RUN apk add --no-cache libc6-compat

# Set environment variables for package manager and Next.js telemetry
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1

# Install pnpm globally (using npm instead of corepack to ensure proxy compatibility)
RUN npm install -g pnpm@9

WORKDIR /app

# --- Stage 2: Install Dependencies ---
FROM base AS deps

# Copy only files required for dependency resolution to maximize layer cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/extension/package.json ./apps/extension/

# Install dependencies using BuildKit cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# --- Stage 3: Build Application ---
FROM base AS builder

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/extension/node_modules ./apps/extension/node_modules

# Copy application source code (filtered by .dockerignore)
COPY . .

# Set environment variables for production build
ENV NODE_ENV=production
# Set dummy database URL to prevent build failures during Prisma generation / static page generation
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Run Prisma client generation and Next.js production build
RUN pnpm run build

# --- Stage 4: Production Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets (not included in standalone build)
COPY --from=builder /app/public ./public

# Copy built standalone server files and public static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and generated Prisma client engine files
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma/client ./node_modules/.prisma/client

# Set permissions to run as the non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Start the standalone Next.js server
CMD ["node", "server.js"]
