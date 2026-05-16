import type { DataSource, Prisma } from '@prisma/client';

export type InspectionListFilters = {
  turbineId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dataSource?: DataSource;
};

/**
 * Composable `where` for inspection lists — keeps REST/GraphQL/service filtering aligned.
 */
export function buildInspectionWhere(filters: InspectionListFilters): Prisma.InspectionWhereInput {
  const where: Prisma.InspectionWhereInput = {};
  if (filters.turbineId) where.turbineId = filters.turbineId;
  if (filters.dataSource) where.dataSource = filters.dataSource;
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = filters.dateFrom;
    if (filters.dateTo) where.date.lte = filters.dateTo;
  }
  return where;
}
