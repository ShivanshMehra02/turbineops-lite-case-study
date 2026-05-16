import { describe, expect, it } from '@jest/globals';
import { FindingCategory } from '@prisma/client';
import { validateBladeDamageCrackSeverityRule } from '../validators/finding-rules';

describe('finding-rules', () => {
  it('allows non-blade categories regardless of notes', () => {
    const r = validateBladeDamageCrackSeverityRule({
      category: FindingCategory.EROSION,
      severity: 1,
      notes: 'small crack on hub',
    });
    expect(r.ok).toBe(true);
  });

  it('allows blade damage without crack mention', () => {
    const r = validateBladeDamageCrackSeverityRule({
      category: FindingCategory.BLADE_DAMAGE,
      severity: 2,
      notes: 'Leading edge wear',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects blade damage + crack when severity < 4', () => {
    const r = validateBladeDamageCrackSeverityRule({
      category: FindingCategory.BLADE_DAMAGE,
      severity: 3,
      notes: 'Crack near root',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.path).toEqual(['severity']);
  });

  it('matches crack case-insensitively', () => {
    const r = validateBladeDamageCrackSeverityRule({
      category: FindingCategory.BLADE_DAMAGE,
      severity: 3,
      notes: 'CRACK observed',
    });
    expect(r.ok).toBe(false);
  });

  it('accepts severity 4+ with crack note', () => {
    const r = validateBladeDamageCrackSeverityRule({
      category: FindingCategory.BLADE_DAMAGE,
      severity: 4,
      notes: 'crack',
    });
    expect(r.ok).toBe(true);
  });
});
