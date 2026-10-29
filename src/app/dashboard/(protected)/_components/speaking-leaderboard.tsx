import { UserAvatar } from './user-avatar';
import { getSpeakingLeaderboard, getSpeakingLeaderboardSettings } from '@/lib/dashboard-api';
import { leaderboardPeriodLabel } from '@/lib/speaking-leaderboard-settings';
import { SpeakingLeaderboardSettingsForm } from './speaking-leaderboard-settings-form';

const names = new Intl.DisplayNames(['en'], { type: 'language' });
function language(code: string) {
  if (!code) return 'Unspecified language';
  let name = code;
  try { name = code === 'yue' ? 'Cantonese' : names.of(code) ?? code; } catch { /* Retain an unknown code without guessing its country. */ }
  let region = '';
  try { region = new Intl.Locale(code).region ?? (code === 'ja' ? 'JP' : code === 'ko' ? 'KR' : ''); } catch { /* Unknown locale has no invented flag. */ }
  const flag = /^[A-Z]{2}$/.test(region) && !['ZZ', 'EU', 'UN'].includes(region) ? String.fromCodePoint(...[...region].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65)) : '';
  return `${name}${flag ? ` ${flag}` : ''}`;
}

export async function SpeakingLeaderboard({ token }: { token: string }) {
  const [settingsResult, reportResult] = await Promise.allSettled([
    getSpeakingLeaderboardSettings(token),
    getSpeakingLeaderboard(token),
  ]);
  const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
  const report = reportResult.status === 'fulfilled' ? reportResult.value : null;
  return <section id="speaking-leaderboard" className="rounded-2xl border border-violet-200 bg-white p-5 dark:border-violet-900 dark:bg-gray-900 sm:p-6" aria-labelledby="speaking-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><h2 id="speaking-title" className="text-lg font-semibold">Speaking leaderboard</h2><span className="text-sm text-gray-500">App leaderboard preview</span></div>
    <SpeakingLeaderboardSettingsForm settings={settings} />
    {report ? <>
    <p className="mt-1 text-sm font-medium text-violet-700 dark:text-violet-300">{leaderboardPeriodLabel(report.periodDays)}</p>
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{report.fromDate} to {report.throughDate} · {report.timeZone}</p>
    <p className="my-4 text-sm text-gray-600 dark:text-gray-400">Every conversation counts. Top {report.limit} learners; equal word totals share a rank.</p>
    <ol className="max-h-[36rem] space-y-2 overflow-y-auto pr-1" aria-label="Speaking rankings">
      {report.rows.map(row => <li key={row.key} className={`rounded-xl border p-3 ${row.isMe ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30' : 'border-gray-100 dark:border-white/10'}`}>
        <div className="flex items-center gap-3"><span className={`w-8 shrink-0 text-center font-semibold tabular-nums ${row.rank === 1 ? 'text-yellow-700 dark:text-yellow-400' : row.rank === 2 ? 'text-slate-600 dark:text-slate-300' : row.rank === 3 ? 'text-amber-800 dark:text-amber-400' : 'text-gray-500'}`}>{row.rank}</span>
          <UserAvatar avatarUrl={row.avatarUrl} name={row.name} size={36} />
          <span className="min-w-0 flex-1 break-words font-semibold">{row.name?.trim() || 'Learner'}{row.isMe ? ' · You' : ''}</span><span className="font-semibold tabular-nums">{row.spokenWords.toLocaleString('en')}</span>
        </div>
        {row.learningLanguage && <p className="ml-[5.25rem] mt-1 text-xs text-gray-600 dark:text-gray-400">Learning {language(row.learningLanguage)}</p>}
      </li>)}
    </ol>
    {report.rows.length === 0 && <p role="status" className="py-6 text-sm text-gray-500">No speaking activity in this window yet.</p>}
    <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">Names and profile photos are shown for every learner. Offline activity appears after syncing. Refresh the page to update without automatic reordering.</p>
    {report.includesLegacyDates && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Earlier activity keeps its original recorded calendar date; new activity uses UTC.</p>}
    </> : <p role="status" className="mt-2 text-sm text-gray-600 dark:text-gray-400">Rankings are temporarily unavailable. Refresh to try again.</p>}
  </section>;
}
