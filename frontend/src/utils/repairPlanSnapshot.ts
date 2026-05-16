/** Aligns with backend `RepairPlanSnapshotV1` for display-only parsing. */
export type RepairPlanSnapshotV1 = {
  version: 1
  summary: {
    text: string
    findingCount: number
    maxSeverity: number
    totalEstimatedCost: number
  }
  findings: unknown[]
}

export function parseRepairPlanSnapshot(snapshotJson: unknown): RepairPlanSnapshotV1 | null {
  if (!snapshotJson || typeof snapshotJson !== 'object') return null
  const o = snapshotJson as Record<string, unknown>
  if (o.version !== 1 || typeof o.summary !== 'object' || !Array.isArray(o.findings)) return null
  return snapshotJson as RepairPlanSnapshotV1
}
