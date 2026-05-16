/** Defaults aligned with `turbineListQuerySchema`. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function computeSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
