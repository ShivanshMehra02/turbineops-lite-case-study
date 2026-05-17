# Testing

Philosophy: **fast unit coverage** on domain/services by default; **small integration smoke** where confidence in HTTP + JWT + RBAC matters; **minimal frontend RTL** for critical auth routing. No E2E harness in-repo.

---

## Backend

```bash
cd backend
npm install    # postinstall: prisma generate
npm test
```

### Unit / service tests (default)

- **Jest** + **ts-jest**, Prisma mocked per suite.
- Covers validators, RBAC helpers, JWT helpers, pagination, inspection/finding/repair-plan/turbine services, auth service behavior.
- Runs **without** a live Postgres instance.

### HTTP integration smoke (optional)

Set **`INTEGRATION_TESTS=1`** plus valid **`DATABASE_URL`**, **`JWT_SECRET`**, migrated DB with **seed** (`viewer@example.com` / `viewer123`):

```bash
export DATABASE_URL=postgresql://app:app@localhost:5432/turbineops
export JWT_SECRET=local-test-jwt-secret-32chars-minimum!!
export NODE_ENV=test
export INTEGRATION_TESTS=1
cd backend && npm test
```

This suite uses **Supertest** against **`createApp`**, exercises **`POST /api/auth/login`**, **`GET /api/turbines`** (VIEWER), **`POST /api/turbines`** → **403**. **`graphql/apollo`** is **jest.mock**’d in that file only so ts-jest does not compile **`import.meta`** in Apollo glue — intentionally **REST-focused** smoke.

---

## Frontend

```bash
cd frontend
npm install
npm test
```

- **Vitest** + **jsdom** + **Testing Library**.
- **`src/test/setup.ts`**: `@testing-library/jest-dom/vitest`, **`cleanup()`** between tests for isolation (e.g. `sessionStorage`).
- Current focused tests: **`ProtectedRoute`** (unauthenticated redirect vs session hydration).

---

## CI flow

File: **`.github/workflows/ci.yml`**.

1. Job **`env`**: `DATABASE_URL`, `JWT_SECRET`, **`INTEGRATION_TESTS=1`**, `NODE_ENV=test`.
2. **Postgres 16** service with healthcheck.
3. **Backend**: `npm ci` → `npm run build` → `prisma migrate deploy` → **`node dist/seed.mjs`** → **`npm test`**.
4. **Frontend**: `npm ci` → `npm run build` → **`npm test`**.

Mirrors production-ish backend bundle + migrations + seed before integration assertions.

---

## Smoke checklist (manual)

After **`docker compose up --build`** or local migrate + seed:

- `GET http://localhost:4000/api/healthz` → `{ ok: true }`
- `POST /api/auth/login` with seeded user → JWT + user payload
- Swagger loads at **`http://localhost:4000/api-docs`**

---

## Maintainer notes

- **`rules.test.ts`** vs **`finding-rules.test.ts`**: overlapping concerns at different layers; consolidate only if they drift.
- Integration suite gated by **`INTEGRATION_TESTS`** so **`npm test`** stays usable on laptops without Docker.
