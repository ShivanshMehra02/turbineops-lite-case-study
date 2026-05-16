import type { Finding, Inspection, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { computeSkip } from '../utils/pagination';
import { HttpError } from '../utils/errors';
import { buildFindingWhere, type FindingListFilters } from '../utils/finding-filter';
import { validateBladeDamageCrackSeverityRule } from '../validators/finding-rules';
import type { FindingCreateInput, FindingUpdateInput } from '../validators/finding.validator';

export type ListFindingsParams = FindingListFilters & {
  page: number;
  limit: number;
};

export type FindingWithInspection = Finding & { inspection: Inspection };

export type FindingConnection = {
  items: FindingWithInspection[];
  totalCount: number;
  page: number;
  limit: number;
};

function assertFindingBusinessRules(params: {
  category: Finding['category'];
  severity: number;
  notes: string | null | undefined;
}): void {
  const r = validateBladeDamageCrackSeverityRule(params);
  if (!r.ok) {
    throw new HttpError(400, r.message, 'VALIDATION_ERROR', { path: r.path });
  }
}

async function ensureInspectionExists(db: PrismaClient, inspectionId: string): Promise<void> {
  const row = await db.inspection.findUnique({ where: { id: inspectionId }, select: { id: true } });
  if (!row) throw new HttpError(404, 'Inspection not found', 'NOT_FOUND');
}

export async function listFindings(db: PrismaClient, params: ListFindingsParams): Promise<FindingConnection> {
  const where = buildFindingWhere(params);
  const skip = computeSkip(params.page, params.limit);

  const [items, totalCount] = await Promise.all([
    db.finding.findMany({
      where,
      orderBy: [{ id: 'asc' }],
      skip,
      take: params.limit,
      include: { inspection: true },
    }),
    db.finding.count({ where }),
  ]);

  return {
    items,
    totalCount,
    page: params.page,
    limit: params.limit,
  };
}

export async function findFindingById(db: PrismaClient, id: string): Promise<FindingWithInspection | null> {
  return db.finding.findUnique({
    where: { id },
    include: { inspection: true },
  });
}

export async function getFindingById(db: PrismaClient, id: string): Promise<FindingWithInspection> {
  const row = await findFindingById(db, id);
  if (!row) throw new HttpError(404, 'Finding not found', 'NOT_FOUND');
  return row;
}

export async function createFinding(db: PrismaClient, input: FindingCreateInput): Promise<FindingWithInspection> {
  await ensureInspectionExists(db, input.inspectionId);
  assertFindingBusinessRules({
    category: input.category,
    severity: input.severity,
    notes: input.notes,
  });

  try {
    return await db.finding.create({
      data: {
        inspectionId: input.inspectionId,
        category: input.category,
        severity: input.severity,
        estimatedCost: input.estimatedCost,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: { inspection: true },
    });
  } catch (e) {
    handleFindingWriteError(e);
  }
}

export async function updateFinding(
  db: PrismaClient,
  id: string,
  input: FindingUpdateInput,
): Promise<FindingWithInspection> {
  const existing = await db.finding.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Finding not found', 'NOT_FOUND');

  const merged = {
    category: input.category ?? existing.category,
    severity: input.severity ?? existing.severity,
    notes: input.notes !== undefined ? input.notes : existing.notes,
  };
  assertFindingBusinessRules(merged);

  try {
    return await db.finding.update({
      where: { id },
      data: {
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        ...(input.estimatedCost !== undefined ? { estimatedCost: input.estimatedCost } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: { inspection: true },
    });
  } catch (e) {
    handleFindingWriteError(e);
  }
}

export async function deleteFinding(db: PrismaClient, id: string): Promise<void> {
  try {
    await db.finding.delete({ where: { id } });
  } catch (e) {
    handleFindingWriteError(e);
  }
}

function handleFindingWriteError(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
    throw new HttpError(404, 'Finding not found', 'NOT_FOUND');
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
    throw new HttpError(409, 'Related inspection record conflict', 'CONFLICT');
  }
  throw e;
}
