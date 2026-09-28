import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAccessToken, getWebsiteAnalytics, type WebsiteCount } from '@/lib/dashboard-api';

export const metadata: Metadata = { title: 'Website Analytics | Bantera Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
const card = 'rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5';
const names: Record<string, string> = { page_view: 'Page views', lesson_play: 'Lesson playback started', lesson_listened_30s: 'Listened for 30 seconds', download_ios: 'App Store clicks', download_android: 'Android APK clicks' };
function Counts({ title, rows }: { title: string; rows: WebsiteCount[] }) {
  return <section className={card}><h2 className="font-semibold">{title}</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th scope="col">Name</th><th scope="col" className="text-right">Sessions</th><th scope="col" className="text-right">Events</th></tr></thead><tbody>{rows.map(r => <tr key={r.label} className="border-t border-gray-100 dark:border-white/10"><th scope="row" className="max-w-64 break-words py-3 text-left font-normal">{names[r.label] || r.label}</th><td className="text-right tabular-nums">{r.sessions}</td><td className="text-right tabular-nums">{r.events}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-5 text-sm text-gray-500">No recorded activity in this range.</p>}</div></section>;
}
export default async function WebsiteAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string; source?: string; language?: string }> }) {
  const token = await getAccessToken(); if (!token) redirect('/dashboard/login');
  const p = await searchParams;
  const days = [7, 30, 90].includes(Number(p.days)) ? Number(p.days) : 30;
  const source = (p.source || '').slice(0, 253), language = (p.language || '').slice(0, 16);
  let report;
  try { report = await getWebsiteAnalytics(token, days, source, language); } catch {
    return <div className="p-6"><h1 className="text-2xl font-bold">Website analytics</h1><p className="mt-5 rounded-xl bg-amber-50 p-5 text-amber-900">Website reports are unavailable. Deploy the backend with the analytics migration, then try again. Existing app analytics remain on Overview.</p></div>;
  }
  const value = (name: string) => report.events.find(e => e.label === name);
  const max = Math.max(1, ...report.daily.map(d => d.sessions));
  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
    <div><h1 className="text-3xl font-bold">Website discovery & practice</h1><p className="mt-2 text-sm text-gray-500">How language learners find Bantera and start listening or speaking practice.</p></div>
    {(!report.ingestionConfigured || !process.env.BANTERA_ANALYTICS_INGEST_KEY) && <p role="status" className="rounded-xl bg-amber-50 p-4 text-amber-900">Collection is not configured on both servers. Set the matching analytics ingest key on the website and backend before relying on these reports.</p>}
    <form className={`${card} flex flex-wrap items-end gap-4`}>
      <label className="text-sm">Period<select name="days" defaultValue={days} className="mt-1 block rounded border p-2 dark:bg-gray-900">{[7, 30, 90].map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
      <label className="text-sm">Exact source<input name="source" defaultValue={source} placeholder="e.g. chatgpt.com" className="mt-1 block rounded border p-2" /></label>
      <label className="text-sm">Language code<input name="language" defaultValue={language} placeholder="e.g. es-es" className="mt-1 block w-36 rounded border p-2" /></label>
      <button className="rounded-lg bg-indigo-600 px-5 py-2 text-white">Apply</button><a className="px-2 py-2 text-sm underline" href="/dashboard/website">Reset</a>
    </form>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      ['Recorded sessions', report.sessions], ['Page views', value('page_view')?.events || 0],
      ['Sessions playing a lesson', value('lesson_play')?.sessions || 0],
      ['Download clicks', (value('download_ios')?.events || 0) + (value('download_android')?.events || 0)],
    ].map(([label, n]) => <div key={label} className={card}><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-semibold">{n}</p></div>)}</div>
    <p className="text-sm leading-6 text-gray-500">Consented browser sessions only, not unique people. A session expires after 30 minutes of inactivity. Dates are UTC; raw records are retained for 90 days. Blockers, declined consent and browser privacy settings reduce coverage. Download clicks are not confirmed installs. Sources are reported referrers or campaign tags, not independently verified origins. Search impressions, Google queries and private AI prompts are unavailable.</p>
    <section className={card}><h2 className="font-semibold">Daily recorded sessions</h2><div className="mt-4 flex h-36 items-end gap-1" role="img" aria-label="Daily session counts; exact values in the table below">{report.daily.map(d => <div key={d.date} title={`${d.date.slice(0,10)}: ${d.sessions}`} className="min-w-1 flex-1 rounded-t bg-indigo-500" style={{ height: `${100 * d.sessions / max}%` }} />)}</div><details className="mt-3 text-sm"><summary className="cursor-pointer">View daily values</summary><table className="mt-3 w-full"><thead><tr><th className="text-left">UTC date</th><th>Sessions</th><th>Events</th></tr></thead><tbody>{report.daily.map(d => <tr key={d.date}><th className="text-left font-normal">{d.date.slice(0,10)}</th><td className="text-center">{d.sessions}</td><td className="text-center">{d.events}</td></tr>)}</tbody></table></details></section>
    <section className={card}><h2 className="font-semibold">Sources and outcomes</h2><p className="mt-1 text-xs text-gray-500">Session counts per action, not a sequential conversion funnel. “Direct / unknown” includes links that did not pass a referrer.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Source', 'Evidence', 'Sessions', 'Played', 'Download intent'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{report.sources.map(r => <tr key={r.label + r.evidence} className="border-t border-gray-200 dark:border-white/10"><th className="p-2 font-normal"><a className="underline" href={`?days=${days}&source=${encodeURIComponent(r.label)}`}>{r.label}</a></th><td className="p-2">{r.evidence}</td><td className="p-2">{r.sessions}</td><td className="p-2">{r.plays}</td><td className="p-2">{r.downloads}</td></tr>)}</tbody></table>{report.sources.length === 0 && <p className="py-5 text-gray-500">No visits recorded yet. Collection begins after deployment and consent.</p>}</div></section>
    <div className="grid gap-6 lg:grid-cols-2"><Counts title="Practice and download actions" rows={report.events} /><Counts title="Learning languages" rows={report.languages} /><Counts title="Most viewed pages (top 50)" rows={report.pages} /><Counts title="Entry pages (top 50)" rows={report.landings} /><Counts title="Device types" rows={report.devices} /><Counts title="Campaigns (top 50)" rows={report.campaigns.map(r => ({ ...r, label: `${r.label} · ${r.source} / ${r.medium || 'unspecified'}` }))} /></div>
    <section className={card}><h2 className="font-semibold">Latest 100 recorded events</h2><p className="mt-1 text-xs text-gray-500">Random session references group visits within one tab. They do not identify a person.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['UTC time', 'Session', 'Action', 'Page', 'Source', 'Language'].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{report.recent.map(e => <tr key={e.id} className="border-t border-gray-100 dark:border-white/10"><td className="whitespace-nowrap p-2">{e.receivedAt.replace('T',' ').slice(0,19)}</td><td className="p-2" title={e.sessionId}>{e.sessionId.slice(0,8)}</td><td className="p-2">{names[e.name] || e.name}</td><td className="max-w-64 break-words p-2">{e.path}</td><td className="p-2">{e.source}</td><td className="p-2">{e.language || 'Unknown'}</td></tr>)}</tbody></table></div></section>
    <p className="text-xs text-gray-500">Updated {report.asOf.replace('T', ' ').slice(0, 19)} UTC. Refresh to load new events. Counts across languages and days may include the same session more than once.</p>
  </main>;
}
