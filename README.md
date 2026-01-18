# Cloud Agent Dashboard

## Running the Application

### Option 1: Full Docker (Recommended for Demo/Testing)

Run all services in Docker containers with ephemeral database:

```bash
# Start all services (db, mock-auth, ingest, worker, dashboard)
docker compose --profile dashboard up -d

# Generate mock data (1 year of events)
docker compose --profile generator run --rm generator

# Or generate custom amount:
docker compose --profile generator run --rm generator --days 30
```

Access the dashboard at http://localhost:3000

To stop all services:
```bash
docker compose --profile dashboard down
```

### Option 2: Local Development (Hot Reload)

Run only the database in Docker, all services locally with hot reload:

```bash
# 1. Start PostgreSQL (ephemeral)
pnpm db:start

# 2. Install dependencies (first time only)
pnpm install

# 3. Start all services with hot reload
pnpm dev:local
```

This runs concurrently:
- **mock-auth** on http://localhost:3002
- **ingest** on http://localhost:3001
- **worker** (background processor)
- **dashboard** on http://localhost:3000

To generate mock data locally:
```bash
pnpm generate -- --days 30
```

To stop:
- Press `Ctrl+C` to stop all services
- Run `pnpm db:stop` to stop the database

### Services Overview

| Service | Port | Description |
|---------|------|-------------|
| dashboard | 3000 | Next.js web UI |
| mock-auth | 3002 | Authentication service |
| ingest | 3001 | Event ingestion API |
| worker | - | Event processor (no HTTP) |
| db | 7000 | PostgreSQL database |
