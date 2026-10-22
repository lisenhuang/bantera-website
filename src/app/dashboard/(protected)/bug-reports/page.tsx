import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccessToken, listBugReports, type AdminBugReport, type AdminPagedResult } from '@/lib/dashboard-api';

export const dynamic = 'force-dynamic';
const sources: Record<string, string> = { voice_message: 'Voice message', text_chat: 'Text chat', live_call: 'In-app live call', callkit: 'CallKit callback' };
const categories: Record<string, string> = { audio: 'Audio', calls: 'Calls', practice: 'Practice', translation: 'Translation', vocabulary: 'Vocabulary', account: 'Account', payments: 'Payments', website: 'Website', other: 'Other' };

export default async function BugReportsPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const query = await searchParams;
  const requested = Number(query.offset ?? 0);
  const offset = Number.isSafeInteger(requested) && requested >= 0 && requested <= 1000000 ? requested : 0;
  let result: AdminPagedResult<AdminBugReport> | null = null;
  try { result = await listBugReports(token, offset); } catch { /* Show an explicit error, never an empty inbox on failure. */ }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bug reports</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Issues users agreed to share through Bantera AI. Reports include their account identity and confirmation, not the full conversation.</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Newest first · All times UTC{result ? ` · ${result.total} total` : ''}</p>
      </header>
      {!result ? <p role="alert" className="rounded-xl border border-red-300 p-4 text-red-700 dark:text-red-400">Bug reports could not be loaded. Refresh to try again.</p> : <>
        {result.items.length === 0 ? <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-white/10 dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-white">{offset ? 'No reports on this page' : 'No bug reports yet'}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Confirmed reports will appear here after Bantera AI submits them successfully.</p>
        </div> : <ol className="space-y-4" aria-label="Submitted bug reports">
          {result.items.map(report => <li key={report.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-900 sm:p-6">
            <article className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{categories[report.category] ?? report.category}</span>
                <span>{sources[report.source] ?? report.source}</span><span aria-hidden>·</span>
                <time dateTime={report.createdAt}>{new Date(report.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</time>
              </div>
              <h2 className="break-words text-lg font-semibold text-gray-900 dark:text-white">{report.summary}</h2>
              <Link href={`/dashboard/users/${report.userId}`} className="inline-block break-all text-sm text-indigo-600 hover:underline dark:text-indigo-400">{report.userName || 'Unnamed user'} · {report.userId}</Link>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-gray-200">{report.details}</p>
              <details className="border-t border-gray-100 pt-3 text-sm dark:border-white/10">
                <summary className="cursor-pointer text-gray-500 dark:text-gray-400">Submission details</summary>
                <p className="mt-2 whitespace-pre-wrap break-words text-gray-600 dark:text-gray-300">User confirmation: “{report.consentQuote}”</p>
                <p className="mt-2 break-all text-xs text-gray-400">Report ID: {report.id}</p>
              </details>
            </article>
          </li>)}
        </ol>}
        <nav aria-label="Bug report pages" className="flex items-center justify-between text-sm font-medium text-indigo-600 dark:text-indigo-400">
          {offset > 0 ? <Link href={`/dashboard/bug-reports?offset=${Math.max(0, offset - 20)}`} className="rounded-lg border border-gray-200 px-4 py-2 dark:border-white/10">Previous</Link> : <span />}
          {offset + 20 < result.total ? <Link href={`/dashboard/bug-reports?offset=${offset + 20}`} className="rounded-lg border border-gray-200 px-4 py-2 dark:border-white/10">Next</Link> : null}
        </nav>
      </>}
    </div>
  );
}
