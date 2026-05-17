# Architecture

## Modular monolith (backend)

Single Express process; boundaries by **folder/module**, not separate deployables:

| Area | Path (under `backend/src`) | Role |
|------|---------------------------|------|
| HTTP wiring | `app.ts`, `main.ts` | CORS, JSON body, route mounting, shutdown |
| Modules | `modules/*` | REST routers (auth, turbines, inspections, findings, repair-plans, events, health) |
| GraphQL | `graphql/` | Apollo Server 3, SDL `schema.graphql`, resolvers delegating to services |
| Services | `services/*` | Prisma-backed workflows shared by REST and GraphQL |
| Middleware | `middleware/*` | JWT parsing (`authenticate`), RBAC gate (`require-permission`), errors |
| Validation | `validators/*` | Zod schemas aligned with REST bodies / GraphQL inputs |
| Config | `config/env.ts` | Zod-validated `process.env` at boot |

**Rule of thumb**: add behavior in **services + validators**, call from thin REST/GraphQL layers.

---

## REST + GraphQL

- **REST**: `/api/*` JSON APIs; OpenAPI describe in `backend/openapi.yaml`; Swagger UI at **`/api-docs`**.
- **GraphQL**: `POST /graphql` with SDL in `backend/src/graphql/schema.graphql`. Same JWT middleware applies (`/graphql` stack uses `authenticate`).
- **RBAC alignment**: REST uses `requirePermission('read'|'write'|'admin')`; GraphQL uses equivalent guards so roles behave consistently.

---

## SSE flow

1. Client opens **`GET /api/events`** with auth (header Bearer **or** `?access_token=` bridge for browser `EventSource`).
2. Connection stays open; server sends periodic/ping-style bootstrap then domain events.
3. After **`POST /api/repair-plans/generate`** persists a plan in Postgres, **`notifyRepairPlanGenerated`** broadcasts JSON payloads to all connected SSE clients.
4. Frontend **`useRepairPlanSse`** listens for `repair_plan_generated` and invalidates TanStack Query keys (`repairPlan`, `inspection`, `inspections`).

Tokens in query strings can surface in logs — acceptable for demo; production would tighten logging or use cookie/session patterns.

---

## RBAC flow

1. **`POST /api/auth/login`** validates credentials, returns JWT with user id + role.
2. **`createAuthenticateMiddleware`**: reads `Authorization: Bearer`; resolves user from DB (`disabledAt`, current role).
3. **`requirePermission`**: ensures `req.authUser` exists and `roleAllowsPermission(role, read|write|admin)` matches route needs.

GraphQL context carries `authUser`; field-level operations enforce the same permission model.

---

## Prisma / Postgres

- **Source of truth** for users, turbines, inspections, findings, repair plans.
- **Migrations**: `backend/prisma/migrations/`; **`prisma migrate dev`** locally, **`prisma migrate deploy`** in CI/Docker.
- **Inspection uniqueness**: `(turbineId, inspectionDay)` where `inspectionDay` is a UTC calendar date column — prevents double-booking the same turbine/day.

---

## MongoDB (optional)

- Backend **`connectMongo`** fail-open: if Mongo is down at startup, `mongoClient` is `null`.
- **Repair plan generation** accepts optional Mongo client for ingestion/logging-style writes (service-layer dependency injection).
- Compose runs Mongo for parity with production-minded demos; core CRUD works without it.

---

## Frontend architecture

| Piece | Detail |
|-------|--------|
| Entry | `src/main.tsx` → `App.tsx` |
| Routing | React Router; **`ProtectedRoute`** redirects unauthenticated users to `/login` |
| API | Axios instance (`src/api/client.ts`) with `VITE_API_BASE`, Bearer injection, 401 → logout |
| State | TanStack Query for server state; minimal local UI state per page |
| Realtime | `SseBridge` mounts SSE subscription when authenticated |
| UI | MUI layout (`AppLayout` drawer + main); pages under `src/pages/` |

---

## Docker architecture

| Image | Role |
|-------|------|
| `postgres:16-alpine` | Primary DB |
| `mongo:7` | Optional auxiliary DB |
| Backend Dockerfile | Alpine Node 20, OpenSSL for Prisma, `npm ci --ignore-scripts`, `prisma generate`, `tsc` + **esbuild** bundles → **`dist/main.mjs`**, **`dist/seed.mjs`**, copies **`openapi.yaml`** / **`dist/schema.graphql`** for runtime |
| Frontend Dockerfile | Multi-stage: Node build with **`ARG VITE_API_BASE`**, nginx serves SPA + **`try_files`** for client routing |

Published ports: **3000** (frontend), **4000** (backend), **5432**, **27017**.
