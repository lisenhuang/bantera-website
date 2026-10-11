import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccessToken, getAdminPipelineRun } from '@/lib/dashboard-api';
import { timestamp as dateTime } from '@/lib/pipeline-timeline';

import { GenerationTimeline } from './generation-timeline';

export const dynamic = 'force-dynamic';

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

  const { run } = detail;
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

      <GenerationTimeline detail={detail} />
    </div>
  );
}
