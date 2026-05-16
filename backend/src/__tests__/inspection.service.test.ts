import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { HttpError } from '../utils/errors';
import { createInspection, listInspections, updateInspection } from '../services/inspection.service';

function mockResolved(fn: unknown, value: unknown): void {
  (fn as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(value);
}

function mockRejected(fn: unknown, err: unknown): void {
  (fn as { mockRejectedValue: (v: unknown) => void }).mockRejectedValue(err);
}

const inspectionMocks = {
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const turbineMocks = {
  findUnique: jest.fn(),
};

const db = {
  inspection: inspectionMocks,
  turbine: turbineMocks,
} as unknown as PrismaClient;

describe('inspection.service', () => {
  beforeEach(() => {
    inspectionMocks.findMany.mockReset();
    inspectionMocks.count.mockReset();
    inspectionMocks.findUnique.mockReset();
    inspectionMocks.findFirst.mockReset();
    inspectionMocks.create.mockReset();
    inspectionMocks.update.mockReset();
    turbineMocks.findUnique.mockReset();
  });

  it('lists with pagination + filters', async () => {
    mockResolved(inspectionMocks.findMany, []);
    mockResolved(inspectionMocks.count, 0);

    const from = new Date('2025-01-01T00:00:00.000Z');
    const to = new Date('2025-02-01T00:00:00.000Z');
    await listInspections(db, {
      page: 2,
      limit: 5,
      turbineId: 'tid',
      dateFrom: from,
      dateTo: to,
      dataSource: 'MANUAL',
    });

    expect(inspectionMocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          turbineId: 'tid',
          dataSource: 'MANUAL',
          date: { gte: from, lte: to },
        },
        skip: 5,
        take: 5,
      }),
    );
  });

  it('creates with inspectionDay aligned to UTC calendar date', async () => {
    mockResolved(turbineMocks.findUnique, { id: 'tid' });
    mockResolved(inspectionMocks.findFirst, null);
    const created = {
      id: 'i1',
      turbineId: 'tid',
      date: new Date('2025-03-10T15:30:00.000Z'),
      inspectionDay: new Date('2025-03-10T00:00:00.000Z'),
      inspectorName: null,
      dataSource: 'DRONE',
      rawPackageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      turbine: { id: 'tid', name: 'T' },
    };
    mockResolved(inspectionMocks.create, created);

    const row = await createInspection(db, {
      turbineId: 'tid',
      date: new Date('2025-03-10T15:30:00.000Z'),
      dataSource: 'DRONE',
    });

    expect(row.id).toBe('i1');
    expect(inspectionMocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        turbineId: 'tid',
        date: new Date('2025-03-10T15:30:00.000Z'),
        inspectionDay: new Date('2025-03-10T00:00:00.000Z'),
        dataSource: 'DRONE',
      }),
      include: { turbine: true },
    });
  });

  it('maps unique violations to INSPECTION_OVERLAP', async () => {
    mockResolved(turbineMocks.findUnique, { id: 'tid' });
    mockResolved(inspectionMocks.findFirst, null);
    const err = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['turbineId', 'inspectionDay'] },
    });
    mockRejected(inspectionMocks.create, err);

    await expect(
      createInspection(db, {
        turbineId: 'tid',
        date: new Date('2025-03-10T15:30:00.000Z'),
        dataSource: 'DRONE',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'INSPECTION_OVERLAP',
    });
  });

  it('throws HttpError when optimistic overlap check finds a row', async () => {
    mockResolved(turbineMocks.findUnique, { id: 'tid' });
    mockResolved(inspectionMocks.findFirst, { id: 'existing' });

    await expect(
      createInspection(db, {
        turbineId: 'tid',
        date: new Date('2025-03-10T15:30:00.000Z'),
        dataSource: 'DRONE',
      }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('updates inspectionDay when date changes', async () => {
    const existing = {
      id: 'i1',
      turbineId: 'tid',
      date: new Date('2025-03-10T12:00:00.000Z'),
      inspectionDay: new Date('2025-03-10T00:00:00.000Z'),
      inspectorName: null,
      dataSource: 'DRONE',
      rawPackageUrl: null,
    };
    mockResolved(inspectionMocks.findUnique, existing);
    mockResolved(inspectionMocks.findFirst, null);
    mockResolved(inspectionMocks.update, {
      ...existing,
      date: new Date('2025-03-11T12:00:00.000Z'),
      inspectionDay: new Date('2025-03-11T00:00:00.000Z'),
      turbine: { id: 'tid', name: 'T' },
    });

    await updateInspection(db, 'i1', { date: new Date('2025-03-11T12:00:00.000Z') });

    expect(inspectionMocks.update).toHaveBeenCalledWith({
      where: { id: 'i1' },
      data: {
        date: new Date('2025-03-11T12:00:00.000Z'),
        inspectionDay: new Date('2025-03-11T00:00:00.000Z'),
      },
      include: { turbine: true },
    });
  });
});
