# Dashboard Service Dockerfile (Next.js)
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
COPY services/dashboard/package.json ./services/dashboard/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/dashboard/node_modules ./services/dashboard/node_modules

# Copy source files
COPY packages/shared ./packages/shared
COPY services/dashboard ./services/dashboard
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build shared package first
RUN pnpm --filter @repo/shared build

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @repo/dashboard build

# ============================================================================
# Stage 3: Production image
# ============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Copy Next.js standalone build
COPY --from=builder /app/services/dashboard/.next/standalone ./
COPY --from=builder /app/services/dashboard/.next/static ./services/dashboard/.next/static
COPY --from=builder /app/services/dashboard/public ./services/dashboard/public

# Copy node_modules for shared package
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "services/dashboard/server.js"]
