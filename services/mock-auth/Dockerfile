# Mock Auth Service Dockerfile
# Multi-stage build for pnpm monorepo

FROM node:24-alpine AS base
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
COPY services/mock-auth/package.json ./services/mock-auth/

# Install dependencies with shamefully-hoist to avoid symlinks
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --shamefully-hoist

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM base AS builder
WORKDIR /app

# Copy only root node_modules (shamefully-hoist puts everything there)
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY packages/shared ./packages/shared
COPY services/mock-auth ./services/mock-auth
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build shared package first using root tsc
RUN ./node_modules/.bin/tsc -p packages/shared/tsconfig.json

# Build mock-auth service
RUN ./node_modules/.bin/tsc -p services/mock-auth/tsconfig.json

# ============================================================================
# Stage 3: Production image
# ============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mockauth

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/services/mock-auth/dist ./services/mock-auth/dist
COPY --from=builder /app/services/mock-auth/package.json ./services/mock-auth/

# Copy dependencies (only runtime deps from root)
COPY --from=deps /app/node_modules ./node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

USER mockauth

EXPOSE 3002

CMD ["node", "services/mock-auth/dist/server.js"]
