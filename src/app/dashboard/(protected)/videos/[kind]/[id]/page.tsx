import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccessToken, getAdminPipelineRun, type AiPipelineEvent } from '@/lib/dashboard-api';

export const dynamic = 'force-dynamic';

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

function eventDetail(event: AiPipelineEvent) {
  if (!event.detailJson) return null;
  try {
    return JSON.stringify(JSON.parse(event.detailJson), null, 2);
  } catch {
    return event.detailJson;
  }
}

export default async function PipelineRunPage({ params }: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const { kind, id } = await params;
  if (!['video', 'job'].includes(kind) || !/^[a-f0-9-]{36}$/i.test(id)) {
    return <p className="text-sm text-red-600">Invalid generation link.</p>;
  }

  let detail;
  try {
    detail = await getAdminPipelineRun(token, kind, id);
  } catch {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/videos" className="text-sm text-indigo-600 dark:text-indigo-400">← Audio &amp; Videos</Link>
        <p className="text-sm text-red-600 dark:text-red-400">Could not load this item&apos;s generation history.</p>
      </div>
    );
  }

  const { run, events } = detail;
  const modelAttempts = events.filter(event =>
    ['model_attempt_started', 'model_attempt_succeeded', 'key_failed', 'model_fallback_attempted', 'model_fallback_succeeded'].includes(event.code));
  const card = 'rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 shadow-sm';

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/dashboard/videos" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Audio &amp; Videos</Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-words">{run.name}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{run.status} · {dateTime(run.createdAt)}</p>
      </div>

      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Item</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
          <div><dt className="text-gray-500">Creator</dt><dd className="text-gray-900 dark:text-white"><Link href={`/dashboard/users/${run.userId}`} className="hover:underline">{run.creatorName ?? run.userId}</Link></dd></div>
          <div><dt className="text-gray-500">Language</dt><dd className="text-gray-900 dark:text-white">{run.languageCode ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Scenario ID</dt><dd className="text-gray-900 dark:text-white">{detail.scenarioId ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Completed</dt><dd className="text-gray-900 dark:text-white">{dateTime(detail.completedAt)}</dd></div>
          <div><dt className="text-gray-500">Job ID</dt><dd className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">{detail.jobId ?? 'No generation job recorded'}</dd></div>
          <div><dt className="text-gray-500">Video ID</dt><dd className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">{run.videoId ?? 'No video created'}</dd></div>
          {run.durationMs != null && <div><dt className="text-gray-500">Duration</dt><dd className="text-gray-900 dark:text-white">{(run.durationMs / 1000).toFixed(1)} seconds</dd></div>}
        </dl>
        {detail.errorMessage && <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{detail.errorMessage}</p>}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Model attempts and fallbacks</h2>
        {modelAttempts.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No model attempt details were recorded for this item.</p>
        ) : (
          <ol className="mt-3 space-y-2 text-sm">
            {modelAttempts.map(event => (
              <li key={event.id} className="flex flex-wrap gap-x-2 gap-y-1 text-gray-700 dark:text-gray-300">
                <span className="text-gray-500">{dateTime(event.createdAt)}</span>
                <span className="font-medium">{event.stage}</span>
                <span>{event.code.replaceAll('_', ' ')}</span>
                {event.model && <code className="text-xs text-indigo-700 dark:text-indigo-300">{event.model}</code>}
                {event.keyHint && <code className="text-xs text-gray-500">{event.keyHint}</code>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Full generation timeline</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pipeline events are kept for {detail.eventRetentionDays} days. Older items may have no events.</p>
        {detail.eventsTruncated && <p className="mt-2 text-xs text-amber-700">Showing the first 1,000 events.</p>}
        {events.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No pipeline events are available for this item.</p>
        ) : (
          <ol className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
            {events.map(event => (
              <li key={event.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <time className="text-xs text-gray-500">{dateTime(event.createdAt)}</time>
                  <span className={event.severity === 'error' ? 'text-red-600 dark:text-red-400' : event.severity === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500'}>{event.severity}</span>
                  <span className="text-gray-500">{event.stage} /</span>
                  <strong className="font-medium text-gray-900 dark:text-white">{event.code}</strong>
                  {event.model && <code className="text-xs text-indigo-700 dark:text-indigo-300">{event.model}</code>}
                  {event.keyHint && <code className="text-xs text-gray-500">{event.keyHint}</code>}
                  {event.durationMs != null && <span className="text-xs text-gray-500">{event.durationMs} ms</span>}
                </div>
                {event.message && <p className="mt-1 text-gray-700 dark:text-gray-300 break-words">{event.message}</p>}
                {eventDetail(event) && <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 dark:bg-white/5 p-3 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{eventDetail(event)}</pre>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
