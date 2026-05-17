# TurbineOps Lite

> **Turbine → Inspection → Findings → Repair Plan** — a full-stack case-study app with a modular Node backend, React SPA, Postgres + optional Mongo, REST + GraphQL, and SSE-driven plan refresh.

![Node 20](https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=white)
![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-required-4169E1?logo=postgresql&logoColor=white)
![License MIT](https://img.shields.io/badge/license-MIT-green)

---

## What is this?

Operators inspect turbines, record findings, and generate a derived repair plan per inspection. Auth is JWT-based with three coarse roles (`ADMIN` / `ENGINEER` / `VIEWER`). Primary persistence is **PostgreSQL** via Prisma; **MongoDB** is optional for supplementary logging during repair-plan generation. The UI uses TanStack Query with SSE invalidation whenever a plan is created or updated.

---

## Tech stack

| Layer | Choices |
|-------|---------|
| Backend | Node 20, Express, Apollo Server (GraphQL), Prisma |
| Database | PostgreSQL (required) · MongoDB (optional) |
| Auth | JWT `Bearer` · bcrypt password hashes |
| Frontend | React 18, TypeScript, Vite, MUI, TanStack Query, React Router |
| Docs | OpenAPI 3 (`backend/openapi.yaml`), Swagger UI |
| Testing | Jest (backend) · Vitest + RTL (frontend) · GitHub Actions CI |

---

## Quick start

### Full stack (Docker)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend (nginx) | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Swagger UI | http://localhost:4000/api-docs |
| GraphQL | http://localhost:4000/graphql |
| Postgres | `localhost:5432` (user/db: `app` / `turbineops`) |
| Mongo | `localhost:27017` |

Compose runs healthchecks, `prisma migrate deploy`, `node dist/seed.mjs`, then starts the API. The frontend image bakes `VITE_API_BASE=http://localhost:4000` — pass `--build-arg` if your API host differs.

### DBs only (local dev)

```bash
docker compose up -d postgres mongo
# then in a separate terminal:
npm run migrate && npm run seed && npm run dev
```

Local dev: API on **:4000**, UI on **:5173**.

Full details in [`docs/INSTALL.md`](docs/INSTALL.md).

---

## Seeded users

Available after `npm run seed` or Docker startup:

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `admin123` | `ADMIN` |
| `eng@example.com` | `engineer123` | `ENGINEER` |
| `viewer@example.com` | `viewer123` | `VIEWER` |

---

## API surface

**Base URL:** `http://localhost:4000/api`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Obtain a JWT |
| `GET` | `/api/healthz` | Health check |
| `GET` | `/api/events` | SSE stream — Bearer token or `?access_token` query param |
| `POST` | `/graphql` | GraphQL endpoint (Bearer required) |
| `GET` | `/api-docs` | Swagger UI |

Full examples and curl snippets: [`docs/API.md`](docs/API.md). OpenAPI source: [`backend/openapi.yaml`](backend/openapi.yaml).

---

## Architecture

The backend is a **modular monolith**: feature modules live under `backend/src/modules/*`, with shared services, validators, and utils alongside. REST handlers and GraphQL resolvers both delegate to those shared services — no duplicated business logic.

SSE (`GET /api/events`) broadcasts after repair-plan persistence; the frontend subscribes and uses TanStack Query invalidation to refresh the UI without polling.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for diagrams and deeper detail.

---

## Design decisions

| Decision | Rationale |
|----------|-----------|
| Modular monolith over microservices | Single deployable unit with clear module boundaries — no orchestration overhead for a case study. |
| REST + GraphQL together | Demonstrates dual ingress while keeping business logic in shared services. |
| Coarse RBAC (`ADMIN` / `ENGINEER` / `VIEWER`) | Maps cleanly to middleware guards and GraphQL field-level checks without needing a policy engine. |
| MongoDB optional | Illustrates hybrid persistence (relational source of truth + document logging) without blocking core CRUD. |
| SSE over WebSockets | One-way server push is a natural fit for "plan generated" notifications; simpler ops profile than WS at this scope. |
| esbuild production bundle | Avoids broken extensionless ESM paths under `"type":"module"` when running `node dist/*.mjs` in Docker. |

---

## Documentation index

| File | Contents |
|------|----------|
| [`docs/INSTALL.md`](docs/INSTALL.md) | Local + Docker setup, env vars, troubleshooting, running tests |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Module structure, SSE flow, RBAC, DB layers, frontend, Docker |
| [`docs/API.md`](docs/API.md) | Auth flow, REST + GraphQL examples, SSE details |
| [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md) | Entities, indexes, overlap rules, repair-plan generation logic |
| [`docs/TESTING.md`](docs/TESTING.md) | Test layers, coverage strategy, and CI setup |

---

