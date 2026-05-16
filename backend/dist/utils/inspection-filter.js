/**
 * Composable `where` for inspection lists — keeps REST/GraphQL/service filtering aligned.
 */
export function buildInspectionWhere(filters) {
    const where = {};
    if (filters.turbineId)
        where.turbineId = filters.turbineId;
    if (filters.dataSource)
        where.dataSource = filters.dataSource;
    if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom)
            where.date.gte = filters.dateFrom;
        if (filters.dateTo)
            where.date.lte = filters.dateTo;
    }
    return where;
}
