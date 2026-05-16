import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FindingCategory, Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { HttpError } from '../utils/errors';
import { createFinding, deleteFinding, listFindings, updateFinding } from '../services/finding.service';

function mockResolved(fn: unknown, value: unknown): void {
  (fn as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(value);
}

function mockRejected(fn: unknown, err: unknown): void {
  (fn as { mockRejectedValue: (v: unknown) => void }).mockRejectedValue(err);
}

const findingMocks = {
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const inspectionMocks = {
  findUnique: jest.fn(),
};

const db = {
  finding: findingMocks,
  inspection: inspectionMocks,
} as unknown as PrismaClient;

describe('finding.service', () => {
  beforeEach(() => {
    findingMocks.findMany.mockReset();
    findingMocks.count.mockReset();
    findingMocks.findUnique.mockReset();
    findingMocks.create.mockReset();
    findingMocks.update.mockReset();
    inspectionMocks.findUnique.mockReset();
  });

  it('lists with pagination + filters', async () => {
    mockResolved(findingMocks.findMany, []);
    mockResolved(findingMocks.count, 0);

    await listFindings(db, {
      page: 2,
      limit: 10,
      inspectionId: 'i1',
      category: FindingCategory.BLADE_DAMAGE,
      severity: 3,
      notesContains: 'foo',
    });

    expect(findingMocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          inspectionId: 'i1',
          category: FindingCategory.BLADE_DAMAGE,
          severity: 3,
          notes: { contains: 'foo', mode: 'insensitive' },
        },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('creates after inspection exists check + rule pass', async () => {
    mockResolved(inspectionMocks.findUnique, { id: 'i1' });
    const row = {
      id: 'f1',
      inspectionId: 'i1',
      category: FindingCategory.BLADE_DAMAGE,
      severity: 4,
      estimatedCost: 100,
      notes: 'crack',
      createdAt: new Date(),
      updatedAt: new Date(),
      inspection: { id: 'i1' },
    };
    mockResolved(findingMocks.create, row);

    const out = await createFinding(db, {
      inspectionId: 'i1',
      category: FindingCategory.BLADE_DAMAGE,
      severity: 4,
      estimatedCost: 100,
      notes: 'crack',
    });

    expect(out.id).toBe('f1');
    expect(inspectionMocks.findUnique).toHaveBeenCalledWith({
      where: { id: 'i1' },
      select: { id: true },
    });
  });

  it('rejects blade crack at low severity before create', async () => {
    mockResolved(inspectionMocks.findUnique, { id: 'i1' });

    await expect(
      createFinding(db, {
        inspectionId: 'i1',
        category: FindingCategory.BLADE_DAMAGE,
        severity: 2,
        estimatedCost: 1,
        notes: 'visible crack',
      }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('validates merged state on update', async () => {
    mockResolved(findingMocks.findUnique, {
      id: 'f1',
      inspectionId: 'i1',
      category: FindingCategory.LIGHTNING,
      severity: 2,
      estimatedCost: 1,
      notes: null,
    });

    await expect(
      updateFinding(db, 'f1', {
        category: FindingCategory.BLADE_DAMAGE,
        notes: 'small Crack here',
      }),
    ).rejects.toBeInstanceOf(HttpError);

    expect(findingMocks.update).not.toHaveBeenCalled();
  });

  it('maps P2025 on delete', async () => {
    mockRejected(
      findingMocks.delete,
      new Prisma.PrismaClientKnownRequestError('x', { code: 'P2025', clientVersion: 't' }),
    );
    await expect(deleteFinding(db, 'missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});
