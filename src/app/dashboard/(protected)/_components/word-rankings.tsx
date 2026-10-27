import Link from 'next/link';
import { getWordRankings, type WordRankingReport } from '@/lib/dashboard-api';
import { rankingFilters, rankingHref, type RankingQuery } from '@/lib/word-rankings';

const periods = [{ key: 'today', label: 'Today' }, { key: 'week', label: 'This week' }, { key: 'total', label: 'All time' }] as const;
const metrics = [{ key: 'spoken', label: 'Words spoken' }, { key: 'listened', label: 'Words listened' }] as const;
const tabStyle = (active: boolean) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active
  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'}`;

export async function WordRankings({ token, query }: { token: string; query: RankingQuery }) {
  const filters = rankingFilters(query);
  let report: WordRankingReport | null = null;
  try { report = await getWordRankings(token, filters); } catch { /* Keep the rest of the overview available. */ }
  return (
    <section id="word-rankings" aria-labelledby="word-rankings-title" className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="word-rankings-title" className="text-lg font-semibold text-gray-900 dark:text-white">Word activity rankings</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Users ranked by synced speaking or listening activity across all languages.</p>
          </div>
          <a href={rankingHref(query)} className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">Refresh</a>
        </div>
        <div className="flex flex-wrap gap-3">
          <nav aria-label="Word activity period" className="inline-flex flex-wrap rounded-xl border border-gray-200 p-1 dark:border-white/10">
            {periods.map(period => <Link key={period.key} scroll={false} href={rankingHref(query, { period: period.key })} aria-current={filters.period === period.key ? 'page' : undefined} className={tabStyle(filters.period === period.key)}>{period.label}</Link>)}
          </nav>
          <nav aria-label="Rank users by" className="inline-flex flex-wrap rounded-xl border border-gray-200 p-1 dark:border-white/10">
            {metrics.map(metric => <Link key={metric.key} scroll={false} href={rankingHref(query, { metric: metric.key })} aria-current={filters.metric === metric.key ? 'page' : undefined} className={tabStyle(filters.metric === metric.key)}>{metric.label}</Link>)}
          </nav>
        </div>
        {report && <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
          {report.fromDate ? `${report.fromDate} to ${report.throughDate}` : 'All recorded dates'}. Reporting date: {report.throughDate} ({report.dateReference}).
          {' '}Activity uses each device’s recorded local date. Weeks start Monday. Offline activity appears after syncing.
        </p>}
      </div>
      {!report ? <p role="status" className="border-t border-gray-100 p-6 text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">Rankings are temporarily unavailable. Try refreshing.</p>
        : report.users.length === 0 ? <p role="status" className="border-t border-gray-100 p-6 text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">{filters.offset ? 'No users on this page.' : `No synced ${filters.metric === 'spoken' ? 'speaking' : 'listening'} activity for this period yet.`}</p>
        : <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">User rankings by {filters.metric === 'spoken' ? 'words spoken' : 'words listened'}. Equal counts share a rank.</caption>
            <thead className="border-y border-gray-100 bg-gray-50 text-xs text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
              <tr><th scope="col" className="px-5 py-3 sm:px-6">Rank</th><th scope="col" className="px-3 py-3">User</th>
                {metrics.map(metric => <th key={metric.key} scope="col" aria-sort={filters.metric === metric.key ? 'descending' : 'none'} className="whitespace-nowrap px-5 py-3 text-right sm:px-6"><Link scroll={false} href={rankingHref(query, { metric: metric.key })}>{metric.label}{filters.metric === metric.key ? ' ↓' : ''}</Link></th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {report.users.map(user => <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="px-5 py-4 tabular-nums text-gray-500 sm:px-6 dark:text-gray-400">{user.rank.toLocaleString('en')}</td>
                <th scope="row" className="min-w-40 px-3 py-4 font-medium"><Link href={`/dashboard/users/${user.userId}`} className="break-words text-indigo-600 hover:underline dark:text-indigo-400">{user.name?.trim() || 'Unnamed user'}<span className="mt-0.5 block font-mono text-xs font-normal text-gray-500 dark:text-gray-400">{user.userId.slice(0, 8)}</span></Link></th>
                <td className={`px-5 py-4 text-right tabular-nums sm:px-6 ${filters.metric === 'spoken' ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{user.spokenWords.toLocaleString('en')}</td>
                <td className={`px-5 py-4 text-right tabular-nums sm:px-6 ${filters.metric === 'listened' ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{user.listenedWords.toLocaleString('en')}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      {report && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-xs text-gray-500 sm:px-6 dark:border-white/10 dark:text-gray-400">
        <span>Equal counts share a rank. Updated {new Date(report.asOf).toLocaleString('en-NZ', { timeZone: report.dateReference, dateStyle: 'medium', timeStyle: 'short' })} NZ time.</span>
        <nav aria-label="Ranking pages" className="flex gap-4 text-sm font-medium">
          {report.offset > 0 && <Link scroll={false} className="text-indigo-600 dark:text-indigo-400" href={rankingHref(query, { offset: Math.max(0, report.offset - report.limit) })}>Previous</Link>}
          {report.hasMore && <Link scroll={false} className="text-indigo-600 dark:text-indigo-400" href={rankingHref(query, { offset: report.offset + report.limit })}>Next</Link>}
        </nav>
      </div>}
    </section>
  );
}
