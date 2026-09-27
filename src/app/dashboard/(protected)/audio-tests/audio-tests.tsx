'use client';

import { useEffect, useState } from 'react';
import type { BanteraLearningLanguage } from '@/lib/bantera-api';
import type { AudioTest, AudioTestDetail, AudioTestHistory } from '@/lib/audio-tests';

const panel = 'rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5';
const field = 'mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-white/15 dark:bg-gray-900 dark:text-white disabled:opacity-60';
const button = 'rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/5';
const muted = 'text-sm text-gray-500 dark:text-gray-400';
const active = (test: AudioTest) => test.status === 'queued' || test.status === 'running';
const when = (value: string) => new Date(value).toLocaleString();
function duration(ms: number) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
async function read<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(
    response.status === 401 || response.status === 403 ? 'Your admin session expired. Please sign in again.' :
      body?.error ?? body?.message ?? `Request failed (${response.status}).`);
  return body as T;
}
function Status({ test }: { test: AudioTest }) {
  const color = test.status === 'done' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
    test.status === 'failed' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
    {test.status === 'done' ? 'Ready' : test.status === 'running' ? `Generating · ${test.stage}` :
      test.status === 'queued' ? 'Queued' : `Failed · ${test.stage}`}
  </span>;
}
function JsonDetails({ title, value, open = false }: { title: string; value: unknown; open?: boolean }) {
  return <details open={open} className="mt-4 rounded-xl border border-gray-200 dark:border-white/10">
    <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{title}</summary>
    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all border-t border-gray-200 p-4 text-xs dark:border-white/10">{JSON.stringify(value, null, 2)}</pre>
  </details>;
}

export default function AudioTests({ models, defaultModel, textModel, modelListAvailable, languages }: {
  models: string[]; defaultModel: string; textModel: string | null;
  modelListAvailable: boolean; languages: BanteraLearningLanguage[];
}) {
  const [languageCode, setLanguageCode] = useState(languages.some(l => l.identifier === 'en-US') ? 'en-US' : languages[0]?.identifier ?? '');
  const [minutes, setMinutes] = useState(1);
  const [model, setModel] = useState(defaultModel);
  const [source, setSource] = useState<AudioTest | null>(null);
  const [history, setHistory] = useState<AudioTestHistory | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AudioTestDetail | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [detailError, setDetailError] = useState('');
  const selected = detail?.id === selectedId ? detail : null;

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const data = await read<AudioTestHistory>(await fetch(`/api/dashboard/audio-tests?offset=${offset}`, { signal: controller.signal, cache: 'no-store' }));
        if (controller.signal.aborted) return;
        setHistory(data);
        setHistoryError('');
      } catch (e) {
        if (!controller.signal.aborted) setHistoryError(e instanceof Error ? e.message : 'Could not load history.');
      }
      if (!controller.signal.aborted) timer = setTimeout(load, 5000);
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [offset, refresh]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const data = await read<AudioTestDetail>(await fetch(`/api/dashboard/audio-tests/${selectedId}`, { signal: controller.signal, cache: 'no-store' }));
        if (controller.signal.aborted) return;
        setDetail(data);
        setDetailError('');
        if (active(data)) timer = setTimeout(load, 3000);
      } catch (e) {
        if (!controller.signal.aborted) {
          setDetailError(e instanceof Error ? e.message : 'Could not load this test.');
          timer = setTimeout(load, 5000);
        }
      }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [selectedId, refresh]);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await read<AudioTestDetail>(await fetch('/api/dashboard/audio-tests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languageCode, durationSeconds: minutes * 60, audioModel: model.trim(), sourceTestId: source?.id ?? null }),
      }));
      setSelectedId(result.id);
      setDetail(result);
      setOffset(0);
      setRefresh(value => value + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the test.'); }
    finally { setPending(false); }
  }

  return <div className="space-y-6 text-gray-900 dark:text-white">
    <header>
      <h1 className="text-2xl font-bold tracking-tight">Audio tests</h1>
      <p className={`mt-2 ${muted}`}>Compare TTS models with random, two-speaker dialogues. Listen to the full recording and keep every result.</p>
    </header>

    <form onSubmit={generate} className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">New test</h2>
          <p className={`mt-1 ${muted}`}>One attempt per model. No fallback, transcription, or word timing.</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">Admin only · Saved privately</span>
      </div>
      {source && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-900/25 dark:text-indigo-200">
        <span>Reusing “{source.title ?? 'Saved dialogue'}” · {source.language} · {source.targetDurationSeconds / 60} min. The script and voices stay the same.</span>
        <button type="button" onClick={() => setSource(null)} className="underline">Use a random dialogue</button>
      </div>}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">Language
          <select className={field} value={source?.languageCode ?? languageCode} onChange={e => setLanguageCode(e.target.value)} disabled={!!source}>
            {languages.map(language => <option key={language.identifier} value={language.identifier}>{language.displayName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Target duration
          <select className={field} value={source ? source.targetDurationSeconds / 60 : minutes} onChange={e => setMinutes(Number(e.target.value))} disabled={!!source}>
            {[1, 2, 3, 4].map(value => <option key={value} value={value}>{value} minute{value > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">TTS model
          <input className={field} list="tts-models" value={model} onChange={e => setModel(e.target.value)} required placeholder="Choose or enter a model ID" />
          <datalist id="tts-models">{models.map(value => <option key={value} value={value} />)}</datalist>
        </label>
      </div>
      <p className={`mt-3 ${muted}`}>Text model: <span className="break-all">{source?.textModel ?? textModel ?? 'Current admin setting'}</span>. Actual audio length may vary.</p>
      {languages.length === 0 && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">Could not load languages. Refresh the page to try again.</p>}
      {!modelListAvailable && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">The live model list is unavailable. You can enter a TTS model ID.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button disabled={pending || !model.trim() || (!source && !languageCode)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          {pending ? 'Starting…' : source ? 'Test this dialogue' : 'Generate random dialogue & audio'}
        </button>
        <p className={muted}>Tests continue if you leave this page.</p>
      </div>
    </form>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className={panel} aria-label="Test history">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Test history {history && <span className="font-normal text-gray-500">({history.total})</span>}</h2>
          <button className={button} onClick={() => setRefresh(value => value + 1)}>Refresh</button>
        </div>
        {historyError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{historyError}</p>}
        {!history && !historyError && <p className={`py-8 ${muted}`}>Loading history…</p>}
        {history?.total === 0 && <p className={`py-8 ${muted}`}>No tests yet. Choose a model above to make the first recording.</p>}
        <ul className="mt-3 space-y-2">
          {history?.items.map(test => <li key={test.id}>
            <button onClick={() => { setSelectedId(test.id); setDetailError(''); }} aria-pressed={selectedId === test.id}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedId === test.id ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/20' : 'border-gray-100 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2"><Status test={test} /><time className="text-xs text-gray-500">{when(test.createdAt)}</time></div>
              <p className="mt-2 font-medium">{test.title ?? 'Random dialogue'}</p>
              <p className={`mt-1 ${muted}`}>{test.language} · {test.targetDurationSeconds / 60} min target{test.audioDurationMs != null ? ` · ${duration(test.audioDurationMs)} audio` : ''}</p>
              <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">{test.audioModel}</p>
            </button>
          </li>)}
        </ul>
        {history && history.total > 20 && <div className="mt-4 flex items-center justify-between">
          <button className={button} disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - 20))}>Newer</button>
          <span className="text-xs text-gray-500">{offset + 1}–{Math.min(offset + 20, history.total)} of {history.total}</span>
          <button className={button} disabled={offset + 20 >= history.total} onClick={() => setOffset(value => value + 20)}>Older</button>
        </div>}
      </section>

      <section className={panel} aria-label="Test details">
        <h2 className="font-semibold">Test details</h2>
        {!selectedId && <p className={`py-8 ${muted}`}>Select a test to listen, read the dialogue, and inspect its generation details.</p>}
        {selectedId && !selected && !detailError && <p className={`py-8 ${muted}`}>Loading test…</p>}
        {detailError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{detailError}</p>}
        {selected && <>
          <div className="mt-4"><Status test={selected} /></div>
          <h3 className="mt-3 text-lg font-semibold">{selected.title ?? 'Random dialogue'}</h3>
          <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">TTS model</dt><dd className="break-all">{selected.audioModel}</dd>
            <dt className="text-gray-500">Text model</dt><dd className="break-all">{selected.textModel}{selected.sourceTestId ? ' (saved dialogue)' : ''}</dd>
            <dt className="text-gray-500">Language</dt><dd>{selected.language}</dd>
            <dt className="text-gray-500">Target / actual</dt><dd>{selected.targetDurationSeconds / 60} min / {selected.audioDurationMs != null ? duration(selected.audioDurationMs) : active(selected) ? 'Pending' : 'Not generated'}</dd>
            <dt className="text-gray-500">Created</dt><dd>{when(selected.createdAt)}</dd>
            {selected.startedAt && <><dt className="text-gray-500">Started</dt><dd>{when(selected.startedAt)}</dd></>}
            {selected.completedAt && <><dt className="text-gray-500">Completed</dt><dd>{when(selected.completedAt)}</dd></>}
            {selected.startedAt && selected.completedAt && <><dt className="text-gray-500">Processing time</dt><dd>{duration(new Date(selected.completedAt).getTime() - new Date(selected.startedAt).getTime())}</dd></>}
          </dl>
          {active(selected) && <p role="status" className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-900/25 dark:text-indigo-200">
            {selected.status === 'queued' ? 'Waiting for an available worker.' : selected.stage === 'dialogue' ? 'Writing a random dialogue…' : selected.stage === 'tts' ? 'Generating audio with the selected model…' : 'Saving the recording…'} This page updates automatically.
          </p>}
          {selected.hasAudio && <div className="mt-5">
            <audio key={selected.id} controls preload="none" src={`/api/dashboard/audio-tests/${selected.id}/audio`} className="w-full" aria-label="Generated test audio" />
          </div>}
          {selected.error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
            <p className="font-semibold">Test failed at {selected.stage}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{selected.error.message ?? 'See the error details below.'}</p>
            <p className="mt-2">No automatic retry or model fallback was used.</p>
          </div>}
          {selected.dialogue && <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Dialogue</h3>
              <button className={button} onClick={() => { setSource(selected); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Reuse this dialogue</button>
            </div>
            <p className={`mt-2 ${muted}`}>Speaker 1: {selected.dialogue.voice1} · Speaker 2: {selected.dialogue.voice2}</p>
            <ol className="mt-3 max-h-96 space-y-3 overflow-y-auto rounded-xl bg-gray-50 p-3 dark:bg-black/15">
              {selected.dialogue.lines.map((line, index) => <li key={index} className="text-sm">
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">{line.speaker}: </span>{line.text}
              </li>)}
            </ol>
          </div>}
          {selected.error && <JsonDetails title="Full error details" value={selected.error} open />}
          <JsonDetails title={`Provider requests & responses (${selected.diagnostics.length})`} value={selected.diagnostics} />
          <p className="mt-3 text-xs text-gray-500">Diagnostics include provider status, response headers, prompts, and response details. API keys and audio data are removed.</p>
          <p className="mt-2 break-all text-xs text-gray-400">Test ID: {selected.id}</p>
        </>}
      </section>
    </div>
  </div>;
}
