/**
 * BLADE_DAMAGE + notes mentioning "crack" ⇒ severity must be >= 4 (aligns with repair-plan heuristics).
 * Matching is case-insensitive on the full notes string.
 */
export function validateBladeDamageCrackSeverityRule(params) {
    if (params.category !== 'BLADE_DAMAGE')
        return { ok: true };
    const text = params.notes ?? '';
    if (!text.toLowerCase().includes('crack'))
        return { ok: true };
    if (params.severity >= 4)
        return { ok: true };
    return {
        ok: false,
        message: 'For BLADE_DAMAGE findings, when notes contain "crack", severity must be at least 4 (scale 1–5).',
        path: ['severity'],
    };
}
