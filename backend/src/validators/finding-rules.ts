import type { FindingCategory } from '@prisma/client';

export type FindingRuleFailure = {
  ok: false;
  message: string;
  /** Zod-style path segment(s) for field targeting */
  path: (string | number)[];
};

export type FindingRuleResult = { ok: true } | FindingRuleFailure;

/**
 * BLADE_DAMAGE + notes mentioning "crack" ⇒ severity must be >= 4 (aligns with repair-plan heuristics).
 * Matching is case-insensitive on the full notes string.
 */
export function validateBladeDamageCrackSeverityRule(params: {
  category: FindingCategory;
  severity: number;
  notes: string | null | undefined;
}): FindingRuleResult {
  if (params.category !== 'BLADE_DAMAGE') return { ok: true };
  const text = params.notes ?? '';
  if (!text.toLowerCase().includes('crack')) return { ok: true };
  if (params.severity >= 4) return { ok: true };
  return {
    ok: false,
    message:
      'For BLADE_DAMAGE findings, when notes contain "crack", severity must be at least 4 (scale 1–5).',
    path: ['severity'],
  };
}
