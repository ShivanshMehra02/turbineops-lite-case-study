import { describe, expect, it } from '@jest/globals';
import { FindingCategory } from '@prisma/client';
import { buildFindingWhere } from '../utils/finding-filter';
describe('finding-filter', () => {
    it('builds combined filters', () => {
        const where = buildFindingWhere({
            inspectionId: 'in1',
            category: FindingCategory.BLADE_DAMAGE,
            severity: 4,
            notesContains: 'crack',
        });
        expect(where).toEqual({
            inspectionId: 'in1',
            category: FindingCategory.BLADE_DAMAGE,
            severity: 4,
            notes: { contains: 'crack', mode: 'insensitive' },
        });
    });
});
