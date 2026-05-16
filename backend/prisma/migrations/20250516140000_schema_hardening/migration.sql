-- TurbineOps Lite: production hardening (additive)
-- - RBAC user lifecycle columns + role index
-- - Timestamps on Inspection / Finding / RepairPlan / User
-- - Composite UNIQUE (turbineId, date) for overlap prevention at DB level
-- - FK cascades: delete inspection → delete findings + repair plan
-- - CHECK on Finding.severity (1–5)

-- User: audit + soft-disable + RBAC index
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- Turbine: name lookup (admin UI / search)
CREATE INDEX IF NOT EXISTS "Turbine_name_idx" ON "Turbine"("name");

-- Inspection: updatedAt + replace non-unique composite index with UNIQUE
ALTER TABLE "Inspection" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "Inspection_turbineId_date_idx";

CREATE UNIQUE INDEX "Inspection_turbineId_date_key" ON "Inspection"("turbineId", "date");

-- Finding: updatedAt + category filter index + severity bounds + CASCADE delete from Inspection
ALTER TABLE "Finding" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Finding_category_idx" ON "Finding"("category");

ALTER TABLE "Finding" DROP CONSTRAINT IF EXISTS "Finding_inspectionId_fkey";

ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_inspectionId_fkey"
  FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Finding" DROP CONSTRAINT IF EXISTS "Finding_severity_check";

ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_severity_check"
  CHECK ("severity" >= 1 AND "severity" <= 5);

-- RepairPlan: updatedAt + CASCADE delete from Inspection
ALTER TABLE "RepairPlan" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "RepairPlan" DROP CONSTRAINT IF EXISTS "RepairPlan_inspectionId_fkey";

ALTER TABLE "RepairPlan"
  ADD CONSTRAINT "RepairPlan_inspectionId_fkey"
  FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
