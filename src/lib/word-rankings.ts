export type RankingQuery = Record<string, string | string[] | undefined>;
export type RankingFilters = { period: 'today' | 'week' | 'total'; metric: 'listened' | 'spoken'; offset: number };

export function rankingFilters(query: RankingQuery): RankingFilters {
  const period = query.wordPeriod === 'week' || query.wordPeriod === 'total' ? query.wordPeriod : 'today';
  const metric = query.wordMetric === 'listened' ? 'listened' : 'spoken';
  const value = typeof query.wordOffset === 'string' ? Number(query.wordOffset) : 0;
  const offset = Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 ? value : 0;
  return { period, metric, offset };
}

export function rankingHref(query: RankingQuery, changes: Partial<RankingFilters> = {}) {
  const filters = { ...rankingFilters(query), ...changes };
  if (changes.period !== undefined || changes.metric !== undefined) filters.offset = 0;
  const params = new URLSearchParams();
  if (typeof query.range === 'string') params.set('range', query.range);
  params.set('wordPeriod', filters.period);
  params.set('wordMetric', filters.metric);
  if (filters.offset) params.set('wordOffset', String(filters.offset));
  return `/dashboard?${params}#word-rankings`;
}
