import { describe, expect, it } from '@jest/globals';
import { computeSkip } from '../utils/pagination';
describe('pagination utils', () => {
    it('computes skip from page/limit', () => {
        expect(computeSkip(1, 20)).toBe(0);
        expect(computeSkip(3, 10)).toBe(20);
    });
});
