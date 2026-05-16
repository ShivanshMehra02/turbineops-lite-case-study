import { describe, expect, it } from '@jest/globals';
import { FindingCategory } from '@prisma/client';
import {
  buildRepairPlanSummary,
  computeTotalEstimatedCost,
  priorityFromMaxSeverity,
} from '../utils/repair-plan-logic';

describe('repair-plan-logic', () => {
  it('priority tiers by max severity', () => {
    expect(priorityFromMaxSeverity(0)).toBe('LOW');
    expect(priorityFromMaxSeverity(2)).toBe('LOW');
    expect(priorityFromMaxSeverity(3)).toBe('MEDIUM');
    expect(priorityFromMaxSeverity(4)).toBe('MEDIUM');
    expect(priorityFromMaxSeverity(5)).toBe('HIGH');
  });

  it('sums estimated costs', () => {
    expect(computeTotalEstimatedCost([{ estimatedCost: 1.5 }, { estimatedCost: 2 }])).toBe(3.5);
  });

  it('builds summary with categories', () => {
    const findings = [
      {
        id: 'a',
        category: FindingCategory.BLADE_DAMAGE,
        severity: 4,
        estimatedCost: 100,
        notes: null,
        inspectionId: 'i',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'b',
        category: FindingCategory.EROSION,
        severity: 2,
        estimatedCost: 50,
        notes: 'x',
        inspectionId: 'i',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const s = buildRepairPlanSummary(findings);
    expect(s.findingCount).toBe(2);
    expect(s.maxSeverity).toBe(4);
    expect(s.totalEstimatedCost).toBe(150);
    expect(s.text).toContain('BLADE_DAMAGE');
  });
});
