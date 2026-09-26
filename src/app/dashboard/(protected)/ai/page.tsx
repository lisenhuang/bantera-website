import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getAccessToken,
  getAiPipelineSummary,
  getAiSettings,
  listAiPipelineEvents,
  type AiPipelineEvent,
  type AiPipelineSeverity,
  type AiPipelineSummary,
  type AiSettings,
} from '@/lib/dashboard-api';
import { ColumnChart } from '../_components/charts';
import { ModelSettingsForm } from './model-settings-form';
import { PlaybackSettingsForm } from './playback-settings-form';
import { AlignmentSettingsForm } from './alignment-settings-form';

export const dynamic = 'force-dynamic';

const RANGES = [7, 30, 90] as const;
const PAGE_SIZE = 50;

/** Plain-English meaning of each event code, shown next to it. */
const CODE_HELP: Record<string, string> = {
  key_failed: 'A Gemini key failed; the next key was tried.',
  all_keys_failed: 'Every Gemini key failed for this step.',
  transcription_completed: 'Gemini returned timed words; the details show their count and timing range.',
  transcription_failed: 'Gemini did not return usable timed words; the details show the error type and HTTP status when available.',
  transcription_timing_rejected: 'The direct transcript had invalid timing; the details show why and which word failed.',
  transcription_timing_repaired: 'Gemini returned zero-length word timestamps; estimated timing for those words and kept the rest.',
  transcription_incomplete: 'The transcript missed part of the dialogue; transcribed again.',
  transcription_retry_improved: 'The second transcription heard more words.',
  transcription_retry_not_improved: 'The second transcription was no better.',
  transcription_retry_failed: 'The second transcription request failed.',
  lines_missing_after_retry: 'Whole lines still missing after the retry: the transcriber dropped them.',
  tts_speech_possibly_missing: 'Audio ends right after the last heard word: the TTS likely skipped the last line(s).',
  ai_alignment_failed: 'The AI word matching failed; exact matches only.',
  timing_rejected: 'Too many words not found; used the fallback timing instead.',
  script_cues_unmatched: 'The timed words could not produce cues for every dialogue line.',
  cue_alignment_failed: 'No valid cue timing was produced; the details show which matching attempts failed.',
  timing_failed: 'Word timing failed; used the fallback timing instead.',
  timing_fallback: 'Saved with Rev.ai or estimated timing instead of Gemini word timing.',
  timing_completed: 'Word timing finished (quality summary).',
  short_cues_unmatched: 'Short practice cues could not be lined up with the words.',
  mp3_encode_failed: 'MP3 encoding failed; the audio was stored as WAV.',
  mp3_encoder_missing: 'No MP3 encoder on the server; the audio was stored as WAV.',
  content_rejected: 'The topic was refused by the content policy.',
  generation_failed: 'The generation failed and the user saw an error.',
  generation_timeout: 'The generation timed out.',
};

const SEVERITY: Record<AiPipelineSeverity, { icon: string; label: string; className: string }> = {
  error: { icon: '✕', label: 'Error', className: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/30' },
  warning: { icon: '!', label: 'Warning', className: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30' },
  info: { icon: 'i', label: 'Info', className: 'bg-gray-50 text-gray-600 ring-gray-500/20 dark:bg-white/5 dark:text-gray-300 dark:ring-white/15' },
};

function SeverityBadge({ severity }: { severity: AiPipelineSeverity }) {
  const s = SEVERITY[severity] ?? SEVERITY.info;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}>
      <span aria-hidden className="font-bold">{s.icon}</span>{s.label}
    </span>
  );
}

function Card({ title, subtitle, children, id }: { title: string; subtitle?: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-6 scroll-mt-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-5">
      <p className="label-xs">{label}</p>
      <p className="text-3xl font-semibold mt-1 text-gray-900 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');
const when = (iso: string) => new Date(iso).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
const countOf = (summary: AiPipelineSummary, code: string) =>
  summary.byCode.filter((c) => c.code === code).reduce((a, c) => a + c.count, 0);

type Filters = { days: number; severity?: string; stage?: string; code?: string; page: number };

function hrefFor(f: Filters, change: Partial<Filters>) {
  const next = { ...f, page: 0, ...change };
  const qs = new URLSearchParams({ days: String(next.days) });
  if (next.severity) qs.set('severity', next.severity);
  if (next.stage) qs.set('stage', next.stage);
  if (next.code) qs.set('code', next.code);
  if (next.page > 0) qs.set('page', String(next.page));
  return `/dashboard/ai?${qs}#events`;
}

function prettyDetail(json: string | null) {
  if (!json) return null;
  try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; }
}

function EventRow({ event }: { event: AiPipelineEvent }) {
  const detail = prettyDetail(event.detailJson);
  const context = [
    event.languageCode,
    event.model,
    event.keyHint && `key ${event.keyHint}`,
    event.endpoint,
    event.durationMs != null && `${(event.durationMs / 1000).toFixed(1)}s`,
  ].filter(Boolean).join(' · ');
  return (
    <li className="py-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-start gap-x-3 gap-y-1">
          <span className="w-36 shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">{when(event.createdAt)}</span>
          <SeverityBadge severity={event.severity} />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            <span className="text-gray-500 dark:text-gray-400">{event.stage} / </span>{event.code}
          </span>
          {context && <span className="text-xs text-gray-500 dark:text-gray-400">{context}</span>}
          {event.message && <span className="basis-full pl-0 md:pl-39 text-sm text-gray-700 dark:text-gray-300 line-clamp-2 group-open:line-clamp-none">{event.message}</span>}
        </summary>
        <div className="mt-2 md:pl-39 space-y-2 text-xs">
          <p className="text-gray-500 dark:text-gray-400">
            {event.userId && <>User <Link className="text-indigo-600 dark:text-indigo-400 hover:underline" href={`/dashboard/users/${event.userId}`}>{event.userId.slice(0, 8)}</Link> · </>}
            {event.jobId && <>Job {event.jobId.slice(0, 8)} · </>}
            {CODE_HELP[event.code] ?? ''}
          </p>
          {detail && (
            <pre className="max-h-72 overflow-auto rounded-lg bg-gray-50 dark:bg-black/40 p-3 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300">{detail}</pre>
          )}
        </div>
      </details>
    </li>
  );
}

export default async function AiPipelinePage({ searchParams }: {
  searchParams: Promise<{ days?: string; severity?: string; stage?: string; code?: string; page?: string }>;
}) {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  const sp = await searchParams;
  const filters: Filters = {
    days: RANGES.find((d) => String(d) === sp.days) ?? 7,
    severity: sp.severity || undefined,
    stage: sp.stage || undefined,
    code: sp.code || undefined,
    page: Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0),
  };

  const [settings, summary, events] = await Promise.all([
    getAiSettings(token).catch(() => null as AiSettings | null),
    getAiPipelineSummary(token, filters.days).catch(() => null as AiPipelineSummary | null),
    listAiPipelineEvents(token, {
      days: filters.days,
      severity: filters.severity,
      stage: filters.stage,
      code: filters.code,
      limit: PAGE_SIZE,
      offset: filters.page * PAGE_SIZE,
    }).catch(() => null),
  ]);
  if (!settings && !summary && !events) redirect('/dashboard/login');

  const timingDone = summary ? countOf(summary, 'timing_completed') : 0;
  const timingFellBack = summary ? ['timing_rejected', 'timing_failed', 'transcription_timing_rejected', 'script_cues_unmatched']
    .reduce((total, code) => total + countOf(summary, code), 0) : 0;
  const incomplete = summary ? countOf(summary, 'transcription_incomplete') : 0;
  const improved = summary ? countOf(summary, 'transcription_retry_improved') : 0;
  const issues = summary?.byCode.filter((c) => c.code !== 'timing_completed' && c.code !== 'transcription_completed') ?? [];
  const filtered = filters.severity || filters.stage || filters.code;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Audio</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Models for AI practice audio, and what went wrong in the pipeline: dialogue → TTS → MP3 → transcription → word timing.
          </p>
        </div>
        <nav aria-label="Time range" className="inline-flex rounded-xl bg-gray-100 dark:bg-white/10 p-1">
          {RANGES.map((d) => (
            <Link key={d} href={hrefFor(filters, { days: d }).replace('#events', '')}
              aria-current={d === filters.days ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${d === filters.days ? 'bg-white dark:bg-white/20 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {d} days
            </Link>
          ))}
        </nav>
      </div>

      {/* Models */}
      <Card title="Models"
        subtitle={settings?.modelListAvailable === false
          ? 'Gemini could not be reached to list models, so saving is disabled. Reload to try again.'
          : 'Choices are listed live from Gemini each time this page loads.'}>
        {settings ? (
          <div className="space-y-5">
            <ModelSettingsForm settings={settings} />
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-gray-50 dark:bg-white/5 p-4 text-xs">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Web search (latest news, custom topics)</dt>
                <dd className="mt-0.5 text-gray-900 dark:text-white"><code>{settings.fixedModels.webSearchModel}</code>, using only keys starting with <code>{settings.fixedModels.webSearchKeyPrefix}</code></dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Transcription with word timestamps</dt>
                <dd className="mt-0.5 text-gray-900 dark:text-white"><code>{settings.fixedModels.transcribeModel}</code></dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">Could not load the model settings.</p>
        )}
      </Card>

      {/* Word highlighting */}
      {settings?.alignment && (
        <Card title="Word highlighting" subtitle="How new AI audio gets its displayed words and timestamps.">
          <AlignmentSettingsForm alignment={settings.alignment} />
        </Card>
      )}

      {/* Sentence timing */}
      {settings?.playback && (
        <Card title="Sentence timing" subtitle="Where each sentence of AI audio starts when played in the app.">
          <PlaybackSettingsForm playback={settings.playback} />
        </Card>
      )}

      {summary && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pipeline health · last {filters.days} days</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatTile label="Generations" value={summary.generations.total.toLocaleString('en')}
              sub={`${summary.generations.done.toLocaleString('en')} done · ${summary.generations.processing} in progress`} />
            <StatTile label="Failed generations" value={summary.generations.failed.toLocaleString('en')}
              sub={`${pct(summary.generations.failed, summary.generations.total)} of generations`} />
            <StatTile label="Gemini word timing" value={pct(timingDone, timingDone + timingFellBack)}
              sub={`${timingDone} succeeded · ${timingFellBack} fell back`} />
            <StatTile label="Transcription retries" value={incomplete.toLocaleString('en')}
              sub={incomplete ? `${improved} improved by the retry` : 'No transcript missed words'} />
            <StatTile label="Failed key attempts" value={countOf(summary, 'key_failed').toLocaleString('en')}
              sub={`${countOf(summary, 'all_keys_failed')} steps where every key failed`} />
          </div>

          <Card title="Errors and warnings per day" subtitle="Info events (such as the per-generation quality summary) are not counted.">
            <ColumnChart
              label={`Pipeline errors and warnings per day over the last ${filters.days} days`}
              bucket="day"
              height={180}
              series={[
                { key: 'errors', label: 'Errors', color: 'var(--viz-bad)' },
                { key: 'warnings', label: 'Warnings', color: 'var(--viz-2)' },
              ]}
              data={summary.daily.map((d) => ({ date: d.date, values: [d.errors, d.warnings] }))}
            />
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title="Issues by type" subtitle="Click a row to see those events.">
              {issues.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Nothing went wrong in this range.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500 dark:text-gray-400">
                      <tr><th className="px-2 py-2 font-medium">Severity</th><th className="px-2 py-2 font-medium">What</th><th className="px-2 py-2 font-medium text-right">Count</th></tr>
                    </thead>
                    <tbody>
                      {issues.map((c) => (
                        <tr key={`${c.severity}-${c.stage}-${c.code}`} className="border-t border-gray-100 dark:border-white/5 align-top">
                          <td className="px-2 py-2"><SeverityBadge severity={c.severity} /></td>
                          <td className="px-2 py-2">
                            <Link href={hrefFor(filters, { stage: c.stage, code: c.code, severity: undefined })} className="font-medium text-gray-900 dark:text-white hover:underline">
                              <span className="text-gray-500 dark:text-gray-400">{c.stage} / </span>{c.code}
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {CODE_HELP[c.code] ? `${CODE_HELP[c.code]} ` : ''}Last {when(c.lastAt)}.
                            </p>
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums font-semibold text-gray-900 dark:text-white">{c.count.toLocaleString('en')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Word timing quality by language"
              subtitle="Share of script words heard exactly, fixed by AI (heard differently), or estimated (not found).">
              {summary.quality.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No generations with Gemini word timing yet.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm tabular-nums">
                    <thead className="text-left text-xs text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-2 py-2 font-medium">Language</th>
                        <th className="px-2 py-2 font-medium text-right">Audio</th>
                        <th className="px-2 py-2 font-medium text-right">Exact</th>
                        <th className="px-2 py-2 font-medium text-right">AI fixed</th>
                        <th className="px-2 py-2 font-medium text-right">Estimated</th>
                        <th className="px-2 py-2 font-medium text-right">Retried</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.quality.map((q) => (
                        <tr key={q.languageCode} className="border-t border-gray-100 dark:border-white/5">
                          <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">{q.languageCode}</td>
                          <td className="px-2 py-2 text-right">{q.generations}</td>
                          <td className="px-2 py-2 text-right">{pct(q.exact, q.words)}</td>
                          <td className="px-2 py-2 text-right">{pct(q.corrected, q.words)}</td>
                          <td className="px-2 py-2 text-right">{pct(q.estimated, q.words)}</td>
                          <td className="px-2 py-2 text-right">{q.retried}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {summary.keyFailures.length > 0 && (
            <Card title="Failing Gemini keys" subtitle="Masked keys with failed attempts in this range. A key that keeps failing is likely out of quota or revoked.">
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-gray-500 dark:text-gray-400">
                    <tr><th className="px-2 py-2 font-medium">Key</th><th className="px-2 py-2 font-medium text-right">Failed attempts</th><th className="px-2 py-2 font-medium text-right">Last failure</th></tr>
                  </thead>
                  <tbody>
                    {summary.keyFailures.map((k) => (
                      <tr key={k.key} className="border-t border-gray-100 dark:border-white/5">
                        <td className="px-2 py-2"><code className="text-gray-900 dark:text-white">{k.key}</code></td>
                        <td className="px-2 py-2 text-right tabular-nums font-semibold text-gray-900 dark:text-white">{k.count.toLocaleString('en')}</td>
                        <td className="px-2 py-2 text-right text-xs text-gray-500 dark:text-gray-400">{when(k.lastAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      )}

      {/* Event log */}
      <Card id="events" title="Event log"
        subtitle={events ? `${events.total.toLocaleString('en')} events in the last ${filters.days} days${filtered ? ' matching the filter' : ''}. Kept for 90 days.` : undefined}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {([undefined, 'error', 'warning', 'info'] as const).map((sev) => (
            <Link key={sev ?? 'all'} href={hrefFor(filters, { severity: sev })}
              aria-current={filters.severity === sev ? 'page' : undefined}
              className={`rounded-full px-3 py-1 font-medium ring-1 ring-inset ${filters.severity === sev ? 'bg-indigo-600 text-white ring-indigo-600' : 'text-gray-600 dark:text-gray-300 ring-gray-200 dark:ring-white/15 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
              {sev ? SEVERITY[sev].label : 'All'}
            </Link>
          ))}
          {(filters.stage || filters.code) && (
            <Link href={hrefFor(filters, { stage: undefined, code: undefined })}
              className="rounded-full px-3 py-1 font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200">
              {filters.stage}{filters.code ? ` / ${filters.code}` : ''} <span aria-hidden>✕</span><span className="sr-only">Clear filter</span>
            </Link>
          )}
        </div>

        {!events ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">Could not load the events.</p>
        ) : events.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No events.</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-white/5">
              {events.items.map((e) => <EventRow key={e.id} event={e} />)}
            </ul>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{filters.page * PAGE_SIZE + 1}–{Math.min(events.total, (filters.page + 1) * PAGE_SIZE)} of {events.total.toLocaleString('en')}</span>
              <div className="flex gap-2">
                {filters.page > 0 && <Link className="rounded-lg px-3 py-1.5 ring-1 ring-gray-200 dark:ring-white/15 hover:bg-gray-50 dark:hover:bg-white/5" href={hrefFor(filters, { page: filters.page - 1 })}>← Newer</Link>}
                {(filters.page + 1) * PAGE_SIZE < events.total && <Link className="rounded-lg px-3 py-1.5 ring-1 ring-gray-200 dark:ring-white/15 hover:bg-gray-50 dark:hover:bg-white/5" href={hrefFor(filters, { page: filters.page + 1 })}>Older →</Link>}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
