-- Enforce at most one inspection per turbine per UTC calendar day using a DATE column + unique index.
-- Backfill assumes existing TIMESTAMP values follow the app's UTC convention.

ALTER TABLE "Inspection" ADD COLUMN "inspectionDay" DATE;

UPDATE "Inspection" SET "inspectionDay" = CAST("date" AS DATE);

ALTER TABLE "Inspection" ALTER COLUMN "inspectionDay" SET NOT NULL;

DROP INDEX IF EXISTS "Inspection_turbineId_date_key";

CREATE UNIQUE INDEX "Inspection_turbineId_inspectionDay_key" ON "Inspection"("turbineId", "inspectionDay");

CREATE INDEX IF NOT EXISTS "Inspection_turbineId_date_idx" ON "Inspection"("turbineId", "date");

CREATE INDEX IF NOT EXISTS "Inspection_dataSource_idx" ON "Inspection"("dataSource");
