import type { Finding, FindingCategory, Priority } from '@prisma/client';

/** Persisted shape for `RepairPlan.snapshotJson` (versioned for forward compatibility). */
export type RepairPlanSnapshotV1 = {
  version: 1;
  summary: RepairPlanSummary;
  findings: SerializedFindingSnapshot[];
};

export type SerializedFindingSnapshot = Pick<
  Finding,
  'id' | 'category' | 'severity' | 'estimatedCost' | 'notes'
>;

export type RepairPlanSummary = {
  /** Short human-readable synopsis for APIs/Mongo/SSE. */
  text: string;
  findingCount: number;
  maxSeverity: number;
  countsByCategory: Partial<Record<FindingCategory, number>>;
  totalEstimatedCost: number;
};

/**
 * Plan priority from the **maximum** finding severity on the inspection:
 * - HIGH if any finding has severity ≥ 5
 * - MEDIUM if max severity is 3 or 4
 * - LOW otherwise (including no findings → max 0)
 */
export function priorityFromMaxSeverity(maxSeverity: number): Priority {
  if (maxSeverity >= 5) return 'HIGH';
  if (maxSeverity >= 3) return 'MEDIUM';
  return 'LOW';
}

export function computeTotalEstimatedCost(findings: Pick<Finding, 'estimatedCost'>[]): number {
  return findings.reduce((sum, f) => sum + Number(f.estimatedCost ?? 0), 0);
}

export function buildRepairPlanSummary(findings: Finding[]): RepairPlanSummary {
  const findingCount = findings.length;
  const totalEstimatedCost = computeTotalEstimatedCost(findings);
  const maxSeverity = findingCount === 0 ? 0 : Math.max(...findings.map((f) => f.severity));

  const countsByCategory: Partial<Record<FindingCategory, number>> = {};
  for (const f of findings) {
    countsByCategory[f.category] = (countsByCategory[f.category] ?? 0) + 1;
  }

  const topCategories = Object.entries(countsByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, n]) => `${n}× ${cat}`)
    .join(', ');

  const text =
    findingCount === 0
      ? 'No findings — empty repair scope.'
      : `${findingCount} finding(s); max severity ${maxSeverity}; total est. cost ${totalEstimatedCost.toFixed(2)}. Categories: ${topCategories || 'n/a'}.`;

  return {
    text,
    findingCount,
    maxSeverity,
    countsByCategory,
    totalEstimatedCost,
  };
}

export function serializeFindingsForSnapshot(findings: Finding[]): SerializedFindingSnapshot[] {
  return findings.map((f) => ({
    id: f.id,
    category: f.category,
    severity: f.severity,
    estimatedCost: f.estimatedCost,
    notes: f.notes,
  }));
}

export function buildRepairPlanSnapshotV1(findings: Finding[]): RepairPlanSnapshotV1 {
  return {
    version: 1,
    summary: buildRepairPlanSummary(findings),
    findings: serializeFindingsForSnapshot(findings),
  };
}

export function parseRepairPlanSnapshot(snapshotJson: unknown): RepairPlanSnapshotV1 | null {
  if (!snapshotJson || typeof snapshotJson !== 'object') return null;
  const o = snapshotJson as Record<string, unknown>;
  if (o.version !== 1 || typeof o.summary !== 'object' || !Array.isArray(o.findings)) return null;
  return snapshotJson as RepairPlanSnapshotV1;
}
