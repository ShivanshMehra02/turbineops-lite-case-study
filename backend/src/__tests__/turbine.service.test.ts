import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  createTurbine,
  deleteTurbine,
  listTurbines,
  updateTurbine,
} from '../services/turbine.service';

function mockResolved(fn: unknown, value: unknown): void {
  // Prisma delegate mocks are awkward to type precisely under strict TS + jest.
  (fn as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(value);
}

const turbineMocks = {
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const db = { turbine: turbineMocks } as unknown as PrismaClient;

describe('turbine.service', () => {
  beforeEach(() => {
    turbineMocks.findMany.mockReset();
    turbineMocks.count.mockReset();
    turbineMocks.create.mockReset();
    turbineMocks.update.mockReset();
    turbineMocks.delete.mockReset();
    turbineMocks.findUnique.mockReset();
  });

  it('lists with pagination + filter', async () => {
    mockResolved(turbineMocks.findMany, []);
    mockResolved(turbineMocks.count, 0);

    const result = await listTurbines(db, { page: 2, limit: 10, name: 'T-' });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.totalCount).toBe(0);
    expect(turbineMocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { contains: 'T-', mode: 'insensitive' } },
        skip: 10,
        take: 10,
      }),
    );
    expect(turbineMocks.count).toHaveBeenCalledWith({
      where: { name: { contains: 'T-', mode: 'insensitive' } },
    });
  });

  it('creates turbine', async () => {
    const row = rowMinimal();
    mockResolved(turbineMocks.create, row);

    const created = await createTurbine(db, { name: 'X' });

    expect(created.id).toBe('1');
    expect(turbineMocks.create).toHaveBeenCalledWith({
      data: { name: 'X' },
    });
  });

  it('updates turbine', async () => {
    const row = { ...rowMinimal(), name: 'Y' };
    mockResolved(turbineMocks.update, row);

    await updateTurbine(db, '1', { name: 'Y' });

    expect(turbineMocks.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { name: 'Y' },
    });
  });

  it('deletes turbine', async () => {
    mockResolved(turbineMocks.delete, rowMinimal());

    await deleteTurbine(db, '1');

    expect(turbineMocks.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });
});

function rowMinimal() {
  return {
    id: '1',
    name: 'X',
    manufacturer: null as string | null,
    mwRating: null as number | null,
    lat: null as number | null,
    lng: null as number | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
