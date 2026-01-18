# Worker Service Dockerfile
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
COPY services/worker/package.json ./services/worker/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/worker/node_modules ./services/worker/node_modules

# Copy source files
COPY packages/shared ./packages/shared
COPY services/worker ./services/worker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build shared package first
RUN pnpm --filter @repo/shared build

# Build worker service
RUN pnpm --filter @repo/worker build

# ============================================================================
# Stage 3: Production image
# ============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/services/worker/dist ./services/worker/dist
COPY --from=builder /app/services/worker/package.json ./services/worker/

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/worker/node_modules ./services/worker/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

USER worker

CMD ["node", "services/worker/dist/index.js"]
