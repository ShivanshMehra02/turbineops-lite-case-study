import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { generateRepairPlanForInspection } from '../services/repair-plan.service';

function mockResolved(fn: unknown, value: unknown): void {
  (fn as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(value);
}

const inspectionMocks = { findUnique: jest.fn() };
const repairPlanMocks = { upsert: jest.fn(), update: jest.fn() };

const db = {
  inspection: inspectionMocks,
  repairPlan: repairPlanMocks,
} as unknown as PrismaClient;

describe('repair-plan.service', () => {
  const notify = jest.fn();

  beforeEach(() => {
    inspectionMocks.findUnique.mockReset();
    repairPlanMocks.upsert.mockReset();
    repairPlanMocks.update.mockReset();
    notify.mockReset();
  });

  it('generates plan from findings and notifies', async () => {
    mockResolved(inspectionMocks.findUnique, {
      id: 'in1',
      findings: [
        {
          id: 'f1',
          inspectionId: 'in1',
          category: 'LIGHTNING',
          severity: 5,
          estimatedCost: 10,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    mockResolved(repairPlanMocks.upsert, {
      id: 'p1',
      inspectionId: 'in1',
      priority: 'HIGH',
      totalEstimatedCost: 10,
      snapshotJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const plan = await generateRepairPlanForInspection(db, 'in1', {
      mongoClient: null,
      mongoDbName: 'test',
      notifyRepairPlanGenerated: notify,
    });

    expect(plan.id).toBe('p1');
    expect(repairPlanMocks.upsert).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        inspectionId: 'in1',
        repairPlanId: 'p1',
        priority: 'HIGH',
      }),
    );
  });
});
