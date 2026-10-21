import test from 'node:test';
import assert from 'node:assert/strict';
import { rankingFilters, rankingHref } from '../src/lib/word-rankings.ts';

test('malformed, repeated and unbounded ranking parameters use safe defaults', () => {
  for (const wordOffset of ['-20', '1.5', 'NaN', 'Infinity', '1000001', ['20']]) {
    assert.deepEqual(rankingFilters({ wordPeriod: ['week'], wordMetric: 'unknown', wordOffset }), { period: 'today', metric: 'listened', offset: 0 });
  }
});
test('changing rank or period resets pagination but preserves the independent trend range', () => {
  const query = { range: '90', wordPeriod: 'week', wordMetric: 'spoken', wordOffset: '40' };
  assert.equal(rankingHref(query, { period: 'total' }), '/dashboard?range=90&wordPeriod=total&wordMetric=spoken#word-rankings');
  assert.equal(rankingHref(query, { metric: 'listened' }), '/dashboard?range=90&wordPeriod=week&wordMetric=listened#word-rankings');
  assert.equal(rankingHref(query, { offset: 60 }), '/dashboard?range=90&wordPeriod=week&wordMetric=spoken&wordOffset=60#word-rankings');
});
