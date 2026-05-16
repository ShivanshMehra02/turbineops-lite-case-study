-- Support filter-heavy workloads (severity / inspection+category lists).
CREATE INDEX IF NOT EXISTS "Finding_severity_idx" ON "Finding"("severity");

CREATE INDEX IF NOT EXISTS "Finding_inspectionId_category_idx" ON "Finding"("inspectionId", "category");
