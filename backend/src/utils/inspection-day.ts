/**
 * Normalizes an instant to the UTC calendar date at 00:00:00.000Z for `@db.Date` storage / uniqueness.
 * All overlap checks assume inspections are bucketed by **UTC day**.
 */
export function toUtcInspectionCalendarDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
