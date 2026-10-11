import type { AdminPipelineRunDetail, AiPipelineEvent } from '@/lib/dashboard-api';
import { callOutcome, duration, eventData, eventFacts, eventTitle, stageName, timelineSteps, timestamp } from '@/lib/pipeline-timeline';

function Facts({ event }: { event: AiPipelineEvent }) {
  return <div className="mt-2 flex flex-wrap gap-2">{eventFacts(event).map(fact =>
    <span key={fact} className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-300 break-all">{fact}</span>)}</div>;
}
function tone(severity: string) {
  return severity === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
    : severity === 'warning' ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300';
}

export function GenerationTimeline({ detail }: { detail: AdminPipelineRunDetail }) {
  const { events, run } = detail;
  const steps = timelineSteps(events);
  const started = events.find(e => e.code === 'generation_started')?.createdAt;
  const elapsed = started && detail.completedAt ? Date.parse(detail.completedAt) - Date.parse(started) : null;
  const models = [...new Set(events.flatMap(e => e.model ? [e.model] : []))];
  const hasDialogueRecord = events.some(e => e.model && ['dialogue', 'dialogue_web_search'].includes(e.stage));
  const hasCalls = steps.some(step => step.call);
  const warnings = events.filter(e => e.severity !== 'info').length;
  return <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900">
    <div className="border-b border-gray-100 p-5 sm:p-6 dark:border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generation process</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Model requests, responses, validation and fallbacks in order.</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone(warnings ? 'warning' : 'info')}`}>{warnings ? `${warnings} warnings / errors recorded` : 'No warnings recorded'}</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div><dt className="text-gray-500">Total generation time</dt><dd className="mt-1 font-semibold text-gray-900 dark:text-white">{elapsed == null && run.status === 'processing' ? 'Still running' : duration(elapsed)}</dd></div>
        <div><dt className="text-gray-500">Recorded API calls</dt><dd className="mt-1 font-semibold text-gray-900 dark:text-white">{hasCalls ? steps.filter(s => s.call).length : 'Not recorded'}</dd></div>
        <div className="col-span-2 sm:col-span-1"><dt className="text-gray-500">Started</dt><dd className="mt-1 text-gray-900 dark:text-white">{timestamp(started ?? null)}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">{models.map(model => <code key={model} className="max-w-full break-all rounded-md border border-indigo-100 px-2 py-1 text-xs text-indigo-700 dark:border-indigo-500/20 dark:text-indigo-300">{model}</code>)}</div>
      {run.isAiGenerated && (!hasCalls || !hasDialogueRecord) && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        <p className="font-medium">This history is incomplete</p>
        <p className="mt-1">{!hasDialogueRecord ? 'The dialogue model was not recorded for this run. ' : ''}Older generations may omit successful GPT calls and request details. Missing records do not mean a model was skipped. Current settings cannot establish which model an older run used.</p>
      </div>}
      {detail.eventsTruncated && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">History truncated: only the first 1,000 events are shown. Some calls may have no recorded outcome here.</p>}
    </div>
    {steps.length === 0 ? <p className="p-6 text-sm text-gray-500">No generation events are available for this item.</p> :
      <ol className="space-y-1 p-4 sm:p-6">{steps.map((step, index) => {
        const first = step.events[0];
        const last = step.events.at(-1)!;
        const failed = step.events.some(e => e.severity !== 'info');
        const outcome = step.call ? callOutcome(step, run.status === 'processing') : null;
        const offset = started ? Math.max(0, Date.parse(first.createdAt) - Date.parse(started)) : null;
        const callDuration = step.events.findLast(e => ['model_call_succeeded', 'model_call_failed', 'provider_response_failed'].includes(e.code))?.durationMs;
        return <li key={step.id} className="relative flex min-w-0 gap-3 pb-5 sm:gap-4">
          <div className="flex w-8 shrink-0 flex-col items-center"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${tone(failed ? 'warning' : 'info')}`}>{index + 1}</span>
            {index < steps.length - 1 && <span className="mt-2 w-px flex-1 bg-gray-200 dark:bg-white/10" />}</div>
          <div className={`min-w-0 flex-1 rounded-xl ${step.call ? 'border border-gray-200 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/[0.02]' : 'py-1'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{step.call ? `${stageName(first.stage)} · ${eventData(first).kind === 'poll' ? 'Status check' : 'Model call'}` : `${stageName(first.stage)} · ${eventTitle(first)}`}</h3>
              <span className="font-mono text-xs text-gray-500">{offset != null ? `+${duration(offset)}` : timestamp(first.createdAt)}{step.call && callDuration != null ? ` · took ${duration(callDuration)}` : !step.call && first.durationMs != null ? ` · ${duration(first.durationMs)}` : ''}</span>
            </div>
            {first.model && <code className="mt-1 block break-all text-xs text-indigo-700 dark:text-indigo-300">{first.model}</code>}
            {outcome && <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone(outcome === 'Failed' ? 'warning' : 'info')}`}>{outcome}</span>}
            {!step.call && first.message && <p className="mt-1 break-words text-sm text-gray-600 dark:text-gray-300">{first.message}</p>}
            <Facts event={first} />
            {step.call && <ol className="mt-3 space-y-2 border-l border-gray-200 pl-3 dark:border-white/10">{step.events.slice(1).map(event => <li key={event.id} className="text-sm">
              <div className="flex flex-wrap justify-between gap-2"><span className={event.severity !== 'info' ? 'text-amber-800 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}>{eventTitle(event)}</span><span className="font-mono text-xs text-gray-500">+{duration(Date.parse(event.createdAt) - Date.parse(first.createdAt))}</span></div>
              {event.message && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{event.message}</p>}<Facts event={event} />
            </li>)}</ol>}
            <details className="mt-3 text-xs text-gray-500 dark:text-gray-400"><summary className="w-fit cursor-pointer hover:text-indigo-600">Event details · {timestamp(first.createdAt)}</summary>
              <div className="mt-2 space-y-2">{step.events.map(event => <div key={event.id}><p className="break-all">{stageName(event.stage)} / {event.code}{event.durationMs != null ? ` · ${duration(event.durationMs)}` : ''}</p>
                {event.detailJson && <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-100 p-3 text-gray-700 dark:bg-black/20 dark:text-gray-300">{JSON.stringify(eventData(event), null, 2)}</pre>}</div>)}</div>
            </details>
            {step.call && first !== last && <span className="sr-only">Last event {timestamp(last.createdAt)}</span>}
          </div>
        </li>;
      })}</ol>}
    <p className="border-t border-gray-100 px-6 py-4 text-xs text-gray-500 dark:border-white/10">Times are UTC. Events are retained for {detail.eventRetentionDays} days. A provider response can still fail subsequent content or timing validation.</p>
  </section>;
}
