import type { FindingCategory, Prisma } from '@prisma/client';

export type FindingListFilters = {
  inspectionId?: string;
  category?: FindingCategory;
  /** Exact match on stored severity (DB allows 1–5). */
  severity?: number;
  /** Case-insensitive substring match on `notes` (null notes never match). */
  notesContains?: string;
};

export function buildFindingWhere(filters: FindingListFilters): Prisma.FindingWhereInput {
  const where: Prisma.FindingWhereInput = {};
  if (filters.inspectionId) where.inspectionId = filters.inspectionId;
  if (filters.category) where.category = filters.category;
  if (filters.severity !== undefined) where.severity = filters.severity;
  if (filters.notesContains?.trim()) {
    where.notes = { contains: filters.notesContains.trim(), mode: 'insensitive' };
  }
  return where;
}
