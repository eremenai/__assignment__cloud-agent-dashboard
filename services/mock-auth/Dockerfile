# Mock Auth Service Dockerfile
FROM node:24-alpine

WORKDIR /app

# Install pnpm and typescript globally
RUN corepack enable && corepack prepare pnpm@latest --activate && npm install -g typescript

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY services/mock-auth/package.json ./services/mock-auth/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY services/mock-auth ./services/mock-auth

# Build packages using pnpm from root (proper workspace resolution)
WORKDIR /app
RUN pnpm --filter @repo/shared exec tsc && pnpm --filter @repo/mock-auth exec tsc

# Run
WORKDIR /app/services/mock-auth
ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "dist/server.js"]
