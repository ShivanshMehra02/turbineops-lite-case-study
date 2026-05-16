# Database schema (Postgres via Prisma)

## Entities

- **User** — login identity; **RBAC** via `Role` (`ADMIN` | `ENGINEER` | `VIEWER`). Optional `disabledAt` for soft-disable.
- **Turbine** — asset; **restrict** delete while inspections reference it.
- **Inspection** — belongs to one turbine; **`@@unique([turbineId, date])`** prevents duplicate inspections at the **same stored timestamp** for the same turbine.
- **Finding** — belongs to one inspection; **cascade** delete with inspection. **`severity` CHECK (1–5)** at the database.
- **RepairPlan** — optional child of inspection (at most one via `inspectionId @unique`); **cascade** delete with inspection.

## Indexes (summary)

| Location | Purpose |
|----------|---------|
| `User(role)` | Admin/reporting queries by role |
| `Turbine(name)` | Lookup / admin search by display name |
| `Inspection(turbineId, date)` **unique** | Overlap prevention + efficient listing by turbine + time |
| `Finding(inspectionId)` | Load all findings for an inspection |
| `Finding(category)` | Filter/group findings by category |
| `RepairPlan(inspectionId)` **unique** | Enforce one plan row per inspection |

## Migrations

- SQL lives under `backend/prisma/migrations/`.
- **Local dev:** `cd backend && npm run prisma:migrate` (applies pending migrations).
- **CI / Docker:** `npm run prisma:deploy`.

## Seed

- `npm run seed` — idempotent-ish for dev: upserts users + turbine; upserts **one** inspection keyed by `(turbineId, date)`; replaces findings for that inspection (`deleteMany` + `createMany`) so re-runs stay consistent.

Mongo ingestion logs remain separate (see architecture docs).
