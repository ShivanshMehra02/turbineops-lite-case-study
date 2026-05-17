# INSTALL

## Prerequisites

- **Docker & Docker Compose** (for DBs or full stack)
- **Node.js 20+** and **npm**
- Optional: **`make`** (targets mirror common workflows)

---

## Full stack with Docker Compose

From the repository root:

```bash
docker compose up --build
```

**URLs**

| What | URL |
|------|-----|
| Frontend | http://localhost:3000 |
| Backend REST | http://localhost:4000/api |
| Swagger UI | http://localhost:4000/api-docs |
| GraphQL | http://localhost:4000/graphql |
| Postgres | `localhost:5432` |
| Mongo | `localhost:27017` |

**Startup order**: Postgres and Mongo must pass Docker healthchecks → backend runs `prisma migrate deploy`, `node dist/seed.mjs`, then `node dist/main.mjs`. Frontend waits until the backend healthcheck passes (`GET /api/healthz`).

**Custom API URL for the SPA** (LAN IP, etc.):

```bash
docker compose build --build-arg VITE_API_BASE=http://YOUR_HOST:4000 frontend
docker compose up -d frontend
```

---

## Local development (non-Docker backend/frontend)

### 1. Start databases only

```bash
docker compose up -d postgres mongo
```

Wait until Postgres accepts connections (`pg_isready` / ~few seconds).

### 2. Environment

Copy **`.env.example`** from the repo root to **`backend/.env`** when running `npm run dev` from `backend/` (Node `cwd` loads dotenv there). For Vite, copy **`frontend/.env.example`** → **`frontend/.env`** if you override defaults.

Alternatively export the same variables in your shell.

See **Environment variables** below.

### 3. Backend

```bash
cd backend
npm install          # runs prisma generate (postinstall)
npm run prisma:migrate   # dev migrations
npm run dev          # ts-node-dev on src/main.ts, default PORT 4000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev          # Vite, http://localhost:5173
```

### 5. Seed data

```bash
cd backend && npm run seed
```

(`preseed` runs `npm run build`; seed executes **`node dist/seed.mjs`**.)

---

## Makefile shortcuts

| Target | Effect |
|--------|--------|
| `make dev-up` | `docker compose up -d postgres mongo` |
| `make migrate` | `cd backend && npm run prisma:migrate` |
| `make seed` | `cd backend && npm run seed` |
| `make backend` | Install + dev server |
| `make frontend` | Install + dev server |
| `make test` | Backend Jest + frontend Vitest |

---

## Environment variables

Validated at backend startup (`backend/src/config/env.ts`). Typical **`.env.example`** (repo root):

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Postgres URL for Prisma |
| `JWT_SECRET` | Yes | **≥32 characters when `NODE_ENV=production`** (Docker Compose sets this) |
| `PORT` | No | Default `4000` |
| `JWT_EXPIRES_IN` | No | Default `8h` |
| `JWT_ISSUER`, `JWT_AUDIENCE` | No | If set, tokens must match on verify |
| `MONGO_URL` | No | Default `mongodb://localhost:27017` |
| `MONGO_DB` | No | Default `turbineops` |

Frontend:

| Variable | Notes |
|----------|--------|
| `VITE_API_BASE` | Base URL **without** trailing `/api`, e.g. `http://localhost:4000`. Used by Axios and SSE URL builder. |

---

## Troubleshooting

| Symptom | Likely cause | What to try |
|---------|----------------|-------------|
| `Invalid environment` / JWT error on Docker | Short `JWT_SECRET` in production | Use ≥32 chars when `NODE_ENV=production`. |
| Prisma “schema not found” during `npm ci` in Docker | Lifecycle scripts before copy | Dockerfile uses `npm ci --ignore-scripts` then `prisma generate` after copy — rebuild image. |
| Backend exits after seed | Old `dist/*.js` ESM resolve issues | Use current Dockerfile/build: **`dist/main.mjs`** / **`dist/seed.mjs`** via esbuild bundle. |
| `ECONNREFUSED` DB | Postgres not ready | Wait for healthcheck / `pg_isready`. |
| Frontend 401 / CORS looks wrong | Wrong `VITE_API_BASE` | Rebuild frontend or fix `.env`; ensure Bearer token attached after login. |
| Swagger 404 | Wrong path | Use **http://localhost:4000/api-docs** (`/api/docs` redirects). |
| Mongo “unavailable” log | Fail-open connect | Backend continues; repair-plan Mongo logging is optional when client is null. |

---

## Running tests

### Backend

```bash
cd backend
npm install
npm test
```

- Default run: unit/service tests (mocked Prisma).
- Integration smoke (Supertest + real DB): set `INTEGRATION_TESTS=1`, valid `DATABASE_URL` / `JWT_SECRET`, migrated DB + seed — see **`docs/TESTING.md`**.

### Frontend

```bash
cd frontend
npm install
npm test
```

### CI

GitHub Actions (`.github/workflows/ci.yml`): Postgres service → backend `npm ci`, `npm run build`, `prisma migrate deploy`, `node dist/seed.mjs`, `npm test`; frontend `npm ci`, `npm run build`, `npm test`.
