import { describe, expect, it } from '@jest/globals';
import { DataSource } from '@prisma/client';
import { buildInspectionWhere } from '../utils/inspection-filter';
describe('inspection-filter', () => {
    it('builds combined filters', () => {
        const from = new Date('2025-01-01T00:00:00.000Z');
        const to = new Date('2025-01-31T23:59:59.999Z');
        const where = buildInspectionWhere({
            turbineId: 't1',
            dateFrom: from,
            dateTo: to,
            dataSource: DataSource.DRONE,
        });
        expect(where).toEqual({
            turbineId: 't1',
            dataSource: DataSource.DRONE,
            date: { gte: from, lte: to },
        });
    });
});
