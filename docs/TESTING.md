# Testing

## Backend

```bash
cd backend
npm install    # runs prisma generate via postinstall
npm test
```

By default, Jest runs **unit / service tests** (mocked Prisma) plus a **skipped** HTTP integration suite unless `INTEGRATION_TESTS=1`.

### Optional: HTTP integration smoke (Supertest)

Requires PostgreSQL with migrations applied and **seed data** (`viewer@example.com` / `viewer123`):

```bash
export DATABASE_URL=postgresql://app:app@localhost:5432/turbineops
export JWT_SECRET=local-test-jwt-secret-32chars-minimum!!
export INTEGRATION_TESTS=1
npm test
```

CI enables this automatically (Postgres service + `prisma migrate deploy` + `node dist/seed.js`).

The integration file boots the real Express app and exercises login, JWT middleware, and REST RBAC. GraphQL Apollo startup is stubbed in that suite only so ts-jest does not need to compile `import.meta` in `graphql/apollo.ts`—transport coverage is REST-focused by design.

## Frontend

```bash
cd frontend
npm test
```

Uses Vitest + jsdom + Testing Library. `src/test/setup.ts` registers `jest-dom` matchers and RTL `cleanup` between tests (sessionStorage isolation).

`npm run build` plus `npm test` mirror CI.

## Maintainer notes

- **`rules.test.ts` vs `finding-rules.test.ts`**: both touch overlap/severity-style rules at different layers; acceptable duplication for clarity, or consolidate later if they drift.
- **Integration tests** intentionally stay behind `INTEGRATION_TESTS` so a laptop without Docker still gets fast, meaningful unit feedback.
