import { describe, expect, it } from '@jest/globals';
import { toUtcInspectionCalendarDate } from '../utils/inspection-day';

describe('inspection-day', () => {
  it('buckets by UTC calendar date', () => {
    const late = new Date('2025-06-01T23:00:00.000Z');
    const earlyNext = new Date('2025-06-02T01:00:00.000Z');
    expect(toUtcInspectionCalendarDate(late).toISOString()).toBe('2025-06-01T00:00:00.000Z');
    expect(toUtcInspectionCalendarDate(earlyNext).toISOString()).toBe('2025-06-02T00:00:00.000Z');
  });
});
