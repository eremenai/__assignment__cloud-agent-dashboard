# Ingest API Service Dockerfile
# Multi-stage build for pnpm monorepo

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ============================================================================
# Stage 1: Install dependencies
# ============================================================================
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files for dependency resolution
COPY packages/shared/package.json ./packages/shared/
COPY services/ingest/package.json ./services/ingest/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/ingest/node_modules ./services/ingest/node_modules

# Copy source files
COPY packages/shared ./packages/shared
COPY services/ingest ./services/ingest
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build shared package first
RUN pnpm --filter @repo/shared build

# Build ingest service
RUN pnpm --filter @repo/ingest build

# ============================================================================
# Stage 3: Production image
# ============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ingest

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/services/ingest/dist ./services/ingest/dist
COPY --from=builder /app/services/ingest/package.json ./services/ingest/

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/ingest/node_modules ./services/ingest/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

USER ingest

EXPOSE 3001

CMD ["node", "services/ingest/dist/server.js"]
