export function buildFindingWhere(filters) {
    const where = {};
    if (filters.inspectionId)
        where.inspectionId = filters.inspectionId;
    if (filters.category)
        where.category = filters.category;
    if (filters.severity !== undefined)
        where.severity = filters.severity;
    if (filters.notesContains?.trim()) {
        where.notes = { contains: filters.notesContains.trim(), mode: 'insensitive' };
    }
    return where;
}
