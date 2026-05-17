# Database schema (PostgreSQL / Prisma)

Prisma schema: **`backend/prisma/schema.prisma`**. SQL migrations: **`backend/prisma/migrations/`**.

---

## Entities

### User

| Field | Notes |
|-------|--------|
| `id` | `cuid` PK |
| `email` | Unique login |
| `name`, `role` | `Role`: `ADMIN` \| `ENGINEER` \| `VIEWER` |
| `passwordHash` | bcrypt |
| `disabledAt` | Soft-disable; login and token resolution reject |

### Turbine

Asset root: `name`, optional `manufacturer`, `mwRating`, `lat`, `lng`. **`Inspection`** rows reference turbine; turbine delete restricted while dependents exist.

### Inspection

| Field | Notes |
|-------|--------|
| `date` | `DateTime` — canonical instant (UTC convention in app) |
| `inspectionDay` | `DATE` — **UTC calendar day** derived from `date`; kept in sync on writes |
| `dataSource` | `DRONE` \| `MANUAL` |
| `inspectorName`, `rawPackageUrl` | Optional |
| `turbineId` | FK → Turbine (`Restrict` delete) |

**Children**: `Finding[]`, optional **`RepairPlan`** (1:1 via unique `inspectionId`).

### Finding

| Field | Notes |
|-------|--------|
| `category` | `BLADE_DAMAGE` \| `LIGHTNING` \| `EROSION` \| `UNKNOWN` |
| `severity` | Integer **1–5** (DB `CHECK`; app validators clamp/coerce where relevant) |
| `estimatedCost` | Numeric |
| `notes` | Optional |
| `inspectionId` | FK → Inspection (**cascade** delete) |

### RepairPlan

| Field | Notes |
|-------|--------|
| `inspectionId` | **Unique** — at most one plan per inspection |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH` — derived from findings (see below) |
| `totalEstimatedCost` | Sum of finding estimates |
| `snapshotJson` | Versioned JSON snapshot (findings slice + summary metadata) |

---

## Relationships (summary)

```
User          (standalone auth)

Turbine 1──* Inspection 1──* Finding
                  │
                  └── 0..1 RepairPlan
```

---

## Indexes (implemented)

| Index | Purpose |
|-------|---------|
| `User(role)` | Role-scoped queries |
| `Turbine(name)` | Name lookup / filter |
| **`Inspection(turbineId, inspectionDay)` UNIQUE** | **Overlap prevention** (below) |
| `Inspection(turbineId, date)` | Listing / sort by instant |
| `Inspection(dataSource)` | Filter by source |
| `Finding(inspectionId)` | Load findings per inspection |
| `Finding(category)`, `Finding(severity)`, `(inspectionId, category)` | Filter workloads |
| `RepairPlan(inspectionId)` UNIQUE | One plan row per inspection |

---

## Overlap prevention strategy

**Business rule**: At most **one inspection per turbine per UTC calendar day**.

**Implementation**:

1. Persist **`inspectionDay`** as PostgreSQL **`DATE`** (not full timestamp).
2. **`@@unique([turbineId, inspectionDay])`** — duplicate insert/update raises unique violation; service layer maps to HTTP conflict where applicable.
3. Application derives **`inspectionDay`** from **`date`** using shared UTC calendar helpers (`toUtcInspectionCalendarDate`) so API semantics stay aligned with the constraint.

Historical migration replaced an earlier `(turbineId, date)` uniqueness model with the calendar-day model (`20250517121500_inspection_calendar_overlap`).

---

## Repair plan rules

Computed in **`backend/src/utils/repair-plan-logic.ts`** (and orchestrated by **`repair-plan.service.ts`**):

| Output | Rule |
|--------|------|
| **`priority`** | From **max severity** among findings on the inspection: ≥5 → `HIGH`; ≥3 → `MEDIUM`; else `LOW` (including zero findings → max 0 → `LOW`). |
| **`totalEstimatedCost`** | Sum of `estimatedCost` on findings. |
| **`snapshotJson`** | Versioned structure (`RepairPlanSnapshotV1`): serialized findings + summary (`text`, counts by category, max severity, totals). |

Plans are regenerated/replaced according to service semantics when **`POST /api/repair-plans/generate`** runs successfully.

---

## Seed behavior

**`npm run seed`** (after build): upserts three users, one turbine (`seed-turbine`), one inspection keyed by turbine + **`inspectionDay`**, replaces findings for that inspection (`deleteMany` + `createMany`) so repeats stay deterministic.

---

## MongoDB

Not modeled in Prisma. Used optionally from application code for logging around repair-plan generation; **no transactional coupling** with Postgres schema above.
