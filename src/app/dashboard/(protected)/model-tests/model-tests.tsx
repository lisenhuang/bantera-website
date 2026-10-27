'use client';
import { useEffect, useState } from 'react';

type Model = { id: string; name: string; status: string; revision?: string; quantization?: string; runtime?: string; sizeBytes?: number; license?: string; source?: string; sha256?: string };
type Generation = { maori: string; english: string; wordCount: number; textSeconds: number; audioSeconds?: number; configuredTextModel: string; actualTextModel: string; fallbackTextModel?: string; configuredAudioModel?: string; actualAudioModel?: string; fallbackAudioModel?: string; voice?: string };
type GenerationSettings = { textModel: string; audioModel: string; fallbackTextModel?: string; fallbackAudioModel?: string; minWordCount: number; maxWordCount: number };
type Result = { generated?: Generation; translation?: Result; text: string; sourceText?: string; reference?: string; language?: string; audioSeconds?: number; realTimeFactor?: number; processingSeconds: number; cpuSeconds: number; averageCpuPercent: number; processPeakRssBytes: number; serviceMemoryPeakSampledBytes: number; outputTruncated?: boolean; model: Model; wer?: { rate: number; edits: number; referenceWords: number; normalization: string } };
type Job = { kind?: string; stage?: string; generation?: Generation; hasAudio?: boolean; id: string; model: string; status: string; created: number; result?: Result; error?: string; assessment?: { rating: string; notes: string } };
type Status = { models: Model[]; queued: number; running: number; serviceMemoryBytes: number | null; limits: { cpuCores: number; memoryBytes: number; timeoutSeconds: number } };
const base = '/api/dashboard/model-tests';
const card = 'rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-900';
const field = 'mt-2 w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-white/20';
const button = 'rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40';
const bytes = (n?: number | null) => n == null ? 'Unavailable' : `${(n / 1024 ** 2).toFixed(1)} MiB`;
const pending = (s: string) => ['queued', 'running', 'cancelling'].includes(s);
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(base + path, { ...init, cache: 'no-store', signal: init?.signal ?? AbortSignal.timeout(30000) });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof value.detail === 'string' ? value.detail : value.error || value.message || (response.status === 413 ? 'Upload is too large.' : response.status === 403 ? 'Administrator access is required.' : 'The request could not complete.'));
  return value;
}
function Assessment({ job }: { job: Job }) {
  const [rating, setRating] = useState(job.assessment?.rating ?? 'unassessed');
  const [notes, setNotes] = useState(job.assessment?.notes ?? '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  return <form className="mt-5 border-t border-gray-200 pt-5 dark:border-white/10" onSubmit={async e => {
    e.preventDefault(); setSaving(true); setMessage('');
    try { await api(`/jobs/${job.id}/assessment`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, notes }) }); setMessage('Assessment saved for this test.'); }
    catch (e) { setMessage((e as Error).message); } finally { setSaving(false); }
  }}>
    <h3 className="font-semibold">Manual translation assessment</h3>
    <p className="mt-1 text-sm text-gray-500">Check meaning, omissions, names and natural English with a fluent Māori speaker.</p>
    <label className="mt-3 block text-sm">Quality<select className={field} value={rating} onChange={e => setRating(e.target.value)}><option value="unassessed">Not assessed</option><option value="good">Good</option><option value="mixed">Mixed</option><option value="poor">Poor</option></select></label>
    <label className="mt-3 block text-sm">Assessment notes<textarea className={field} maxLength={2000} rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></label>
    <button className={button + ' mt-3'} disabled={saving}>{saving ? 'Saving…' : 'Save assessment'}</button><p role="status" className="mt-2 text-sm">{message}</p>
  </form>;
}
export default function ModelTests() {
  const [status, setStatus] = useState<Status | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState('whisper-small');
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [wordCount, setWordCount] = useState(20);
  const [generatedModel, setGeneratedModel] = useState('whisper-small');
  const [settings, setSettings] = useState<GenerationSettings | null>(null);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const [s, j, g] = await Promise.all([api<Status>('/status', { signal: controller.signal }), api<Job[]>('/jobs', { signal: controller.signal }), api<GenerationSettings>('/generation-settings', { signal: controller.signal })]);
        setSettings(g);
        setStatus(s); setJobs(j); setPollError('');
      } catch (e) { if (!controller.signal.aborted) setPollError((e as Error).message + ' Reconnecting automatically.'); }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 3000);
    };
    void refresh(); return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  const job = jobs.find(j => j.id === selected) ?? (selected ? undefined : jobs[0]);
  const ready = (id: string) => status?.models.some(m => m.id === id && m.status === 'ready');
  async function submit(translation: boolean) {
    setBusy(true); setError('');
    try {
      const payload: Record<string, string> = { model: translation ? 'madlad' : model };
      if (translation) payload.text = text;
      else {
        if (!file || file.size > 8 * 1024 * 1024 || !file.size) throw new Error('Choose a recording up to 8 MiB.');
        payload.audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Could not read the recording.')); reader.readAsDataURL(file);
        });
        payload.reference = reference;
      }
      const created = await api<{ id: string }>('/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setSelected(created.id); setJobs(await api<Job[]>('/jobs'));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function generate() {
    setBusy(true); setError('');
    try {
      const created = await api<{ id: string }>('/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'generated', model: generatedModel, wordCount }) });
      setSelected(created.id); setJobs(await api<Job[]>('/jobs'));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function cancel(id: string) {
    try { await api(`/jobs/${id}`, { method: 'DELETE' }); setJobs(await api<Job[]>('/jobs')); }
    catch (e) { setError((e as Error).message); }
  }
  return <div className="mx-auto max-w-6xl space-y-6 text-gray-900 dark:text-gray-100">
    <header><div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Admin laboratory · Oracle AU</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Māori model tests</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">Evaluate local speech recognition and Māori-to-English translation. Successful output does not establish language accuracy. Tests are private to your administrator account and expire after 24 hours.</p></header>
    {(error || pollError) && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{error || pollError}</div>}
    <section className={card} aria-label="Service status">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Local model service</h2><span role="status" className="text-sm text-gray-500">{status ? `${status.running} running · ${status.queued} queued · one local inference at a time` : 'Connecting…'}</span></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">{(status?.models ?? []).map(m => <article key={m.id} className="rounded-xl bg-gray-50 p-4 dark:bg-white/5"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-medium">{m.name}</h3><span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{m.status.replaceAll('_', ' ')}</span></div><p className="mt-2 text-sm text-gray-500">{m.quantization ?? 'Pending'} · {bytes(m.sizeBytes)}</p><p className="mt-1 text-xs text-gray-500">{m.runtime}</p><details className="mt-3 text-xs"><summary className="cursor-pointer">Version, source and licence</summary><div className="mt-2 space-y-2 break-all"><p>Revision: {m.revision ?? 'Pending'}</p><p>SHA-256: {m.sha256 ?? 'Pending'}</p><p>Licence: {m.license}</p>{m.source && <a className="underline" href={m.source} target="_blank" rel="noreferrer">Official distribution and model card</a>}</div></details></article>)}</div>
      <p className="mt-4 text-xs leading-5 text-gray-500">Container limit: {status?.limits.cpuCores ?? 2} CPU cores / {bytes(status?.limits.memoryBytes)}. Current total service memory: {bytes(status?.serviceMemoryBytes)} (cgroup, including file cache). Execution limit: {Math.round((status?.limits.timeoutSeconds ?? 900) / 60)} minutes per inference. Maximum two pending tests and 20 tests per hour per admin; six pending and 60 tests per hour globally.</p>
    </section>
    <form className={card + ' border-emerald-200 dark:border-emerald-900'} onSubmit={e => { e.preventDefault(); void generate(); }}>
      <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Generated round-trip test</div>
      <h2 className="mt-2 text-xl font-semibold">Start with a Māori word count</h2>
      <p className="mt-2 text-sm leading-6 text-gray-500">The app’s text model writes Māori and an English reference. Gemini TTS reads the Māori text, Whisper transcribes the audio, then MADLAD translates that transcript into English.</p>
      <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-4" aria-label="Generation stages">{['1. Māori + English reference', '2. Gemini Māori audio', '3. Whisper transcript', '4. MADLAD English'].map(step => <li className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/40" key={step}>{step}</li>)}</ol>
      <div className="mt-4 grid items-end gap-4 sm:grid-cols-[160px_1fr_auto]">
        <label className="block text-sm">Māori word count<input type="number" className={field} min={5} max={60} step={1} required value={wordCount} onChange={e => setWordCount(Number(e.target.value))} /></label>
        <label className="block text-sm">Speech recognition model<select className={field} value={generatedModel} onChange={e => setGeneratedModel(e.target.value)}><option value="whisper-small">Whisper Small · Q5_1</option><option value="whisper-large-v3">Whisper large-v3 · Q5_0</option></select></label>
        <button className={button} disabled={busy || !settings || !Number.isInteger(wordCount) || wordCount < 5 || wordCount > 60 || !ready(generatedModel) || !ready('madlad')}>{busy ? 'Submitting…' : 'Generate and run test'}</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">Choose 5–60 Māori words. The count is checked before TTS; generation stops if it cannot match after three attempts. Audio must remain under 60 seconds. Text and audio generation have a combined 10-minute limit.</p>
      <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs leading-6 dark:bg-white/5"><p>App text model: <strong>{settings?.textModel ?? 'Loading…'}</strong>{settings?.fallbackTextModel ? ` · fallback: ${settings.fallbackTextModel}` : ''}</p><p>App Gemini TTS model: <strong>{settings?.audioModel ?? 'Loading…'}</strong>{settings?.fallbackAudioModel ? ` · fallback: ${settings.fallbackAudioModel}` : ''}</p><p>Uses the shared <a className="underline" href="/dashboard/ai">app Text / TTS settings</a> and Māori Practice voice. Each result records the models actually used.</p></div>
      <p className="mt-3 text-xs leading-5 text-gray-500">The English reference and recording are AI-generated, not human-verified ground truth. Generated audio is retained privately with a completed test for 24 hours so you can listen; failed or cancelled test audio is deleted.</p>
    </form>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <form className={card} onSubmit={e => { e.preventDefault(); void submit(false); }}><h2 className="text-lg font-semibold">Speech recognition</h2><p className="mt-1 text-sm text-gray-500">Māori recognition is explicitly selected: <code>mi</code>.</p><label className="mt-4 block text-sm">Model<select className={field} value={model} onChange={e => setModel(e.target.value)}><option value="whisper-small">Whisper Small · multilingual · Q5_1</option><option value="whisper-large-v3">Whisper large-v3 · multilingual · Q5_0</option></select></label><label className="mt-4 block text-sm">Recording<input className={field} type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac" required onChange={e => setFile(e.target.files?.[0] ?? null)} /></label><p className="mt-1 text-xs text-gray-500">WAV, MP3, M4A, Ogg, WebM or FLAC. Up to 8 MiB and 60 seconds. Temporary audio is deleted after processing or cancellation.</p><label className="mt-4 block text-sm">Reference transcript <span className="text-gray-500">(optional)</span><textarea className={field} rows={3} maxLength={3000} value={reference} onChange={e => setReference(e.target.value)} lang="mi" /></label><p className="mt-1 text-xs leading-5 text-gray-500">Word error rate compares the transcript against your reference. It measures transcription accuracy, not pronunciation quality.</p><button className={button + ' mt-4'} disabled={busy || !file || !ready(model)}>{busy ? 'Submitting…' : 'Queue transcription'}</button></form>
      <form className={card} onSubmit={e => { e.preventDefault(); void submit(true); }}><h2 className="text-lg font-semibold">Māori → English</h2><p className="mt-1 text-sm text-gray-500">Google MADLAD-400-3B-MT · Q4_K · local CPU</p><label className="mt-4 block text-sm">Māori text<textarea className={field} rows={7} maxLength={1000} required value={text} onChange={e => setText(e.target.value)} lang="mi" placeholder="Enter a short Māori passage" /></label><p className="mt-1 text-xs text-gray-500">{text.length}/1,000 characters. Maximum 256 input tokens and 128 output tokens. Greedy decoding with an English target.</p><button className={button + ' mt-4'} disabled={busy || !text.trim() || !ready('madlad')}>{busy ? 'Submitting…' : 'Queue translation'}</button></form>
    </div>
    <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
      <section className={card}><h2 className="font-semibold">Your test history</h2><p className="mt-1 text-xs text-gray-500">Latest 50 tests · retained for 24 hours</p><div className="mt-4 space-y-2">{jobs.length === 0 && <p className="text-sm text-gray-500">Queue a test to begin.</p>}{jobs.map(j => <button key={j.id} onClick={() => setSelected(j.id)} aria-pressed={job?.id === j.id} className={`w-full rounded-xl border p-3 text-left text-sm ${job?.id === j.id ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'border-gray-200 dark:border-white/10'}`}><span className="block font-medium">{j.kind === 'generated' ? 'Generated · ' : ''}{j.model}</span><span className="mt-1 block text-xs capitalize">{j.status} · {new Date(j.created * 1000).toLocaleTimeString()}</span></button>)}</div></section>
      <section className={card} aria-label="Selected test result">{!job ? <p className="text-sm text-gray-500">{selected ? 'Waiting for the new test to appear…' : 'Results and resource measurements will appear here.'}</p> : <><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{job.model}</h2><span role="status" className="text-sm capitalize">{job.status}{job.kind === 'generated' && pending(job.status) ? ` · ${job.stage === 'text' ? 'Generating text' : job.stage === 'tts' ? 'Generating audio' : job.stage === 'stt' ? 'Transcribing' : job.stage === 'translation' ? 'Translating' : job.stage}` : ''}</span></div><p className="mt-1 break-all font-mono text-xs text-gray-500">{job.id}</p>{pending(job.status) && <div className="mt-5"><p className="text-sm text-gray-500">{job.status === 'queued' ? 'Waiting for the current job to finish.' : job.status === 'cancelling' ? 'Stopping the inference process and removing temporary files.' : job.kind === 'generated' && ['text', 'tts'].includes(job.stage ?? '') ? 'Generating with the app’s configured provider. You can leave this page and return to the job.' : 'Processing locally. You can leave this page and return to the job.'}</p><button className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/20" disabled={job.status === 'cancelling'} onClick={() => void cancel(job.id)}>Cancel test</button></div>}{job.generation && <div className="mt-5 rounded-xl border border-emerald-200 p-4 dark:border-emerald-900"><h3 className="font-semibold">Generated passage · {job.generation.wordCount} Māori words</h3><h4 className="mt-3 text-xs font-semibold uppercase text-gray-500">Original Māori</h4><p lang="mi" className="mt-2 whitespace-pre-wrap leading-7">{job.generation.maori}</p><h4 className="mt-4 text-xs font-semibold uppercase text-gray-500">Generated English reference</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{job.generation.english}</p><p className="mt-2 text-xs text-gray-500">Machine-generated reference. Human review is still needed.</p><dl className="mt-4 space-y-1 break-words text-xs text-gray-500"><div><dt className="inline">Actual text model: </dt><dd className="inline">{job.generation.actualTextModel} · {job.generation.textSeconds.toFixed(2)} s</dd></div>{job.generation.actualAudioModel && <div><dt className="inline">Actual TTS model: </dt><dd className="inline">{job.generation.actualAudioModel} · {job.generation.audioSeconds?.toFixed(2)} s · voice {job.generation.voice}</dd></div>}</dl>{job.hasAudio && <audio className="mt-4 w-full" controls preload="none" src={`${base}/jobs/${job.id}/audio`} aria-label="Generated Māori recording" />}</div>}{job.error && <p role="alert" className="mt-4 text-sm text-amber-700 dark:text-amber-400">{job.error}</p>}{job.result && <>
        {job.result.sourceText && <div className="mt-5"><h3 className="text-xs font-semibold uppercase text-gray-500">Māori source</h3><p lang="mi" className="mt-2 whitespace-pre-wrap text-sm">{job.result.sourceText}</p></div>}
        <h3 className="mt-5 text-xs font-semibold uppercase text-gray-500">{job.model === 'madlad' ? 'English translation' : 'Māori transcript'}</h3><p lang={job.model === 'madlad' ? 'en' : 'mi'} className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-base leading-7 dark:bg-white/5">{job.result.text || '(No speech recognised)'}</p>
        {job.result.outputTruncated && <p className="mt-2 text-sm text-amber-700">Output reached the token limit and may be incomplete.</p>}
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">{[
          ['Inference wall time', `${job.result.processingSeconds.toFixed(2)} s`],
          ...(job.result.audioSeconds != null ? [['Audio duration', `${job.result.audioSeconds.toFixed(2)} s`], ['Real-time factor', `${job.result.realTimeFactor?.toFixed(2)}×`]] : []),
          ['Process CPU time', `${job.result.cpuSeconds.toFixed(2)} CPU s`], ['Average process CPU', `${job.result.averageCpuPercent.toFixed(1)}%`],
          ['Inference process peak RSS', bytes(job.result.processPeakRssBytes)], ['Total service memory peak (sampled)', bytes(job.result.serviceMemoryPeakSampledBytes)],
        ].map(([label, value]) => <div key={label}><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
        <p className="mt-4 text-xs leading-5 text-gray-500">Wall time includes model loading and inference, excludes queue waiting and audio conversion. Real-time factor is wall time ÷ audio duration; below 1× is faster than playback. CPU: 100% means one core, 200% means two. Peak RSS is measured for the inference process by Linux time; total service memory includes file cache and is sampled every 100 ms. These are different measurements.</p>
        {job.result.reference && <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-white/10"><h3 className="text-sm font-semibold">Word error rate: {job.result.wer ? `${(job.result.wer.rate * 100).toFixed(1)}%` : 'Unavailable: reference has no words'}</h3><p className="mt-2 text-xs text-gray-500">{job.result.wer && `${job.result.wer.edits} edits / ${job.result.wer.referenceWords} reference words. ${job.result.wer.normalization}. `}WER can exceed 100%. This is not a pronunciation score.</p><p lang="mi" className="mt-3 whitespace-pre-wrap text-sm">Reference: {job.result.reference}</p></div>}
        {job.result.translation && <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-white/10"><h3 className="font-semibold">MADLAD English translation</h3><p className="mt-1 text-xs text-gray-500">Translated from the Whisper transcript above, so speech recognition errors can affect this result.</p><p lang="en" className="mt-3 whitespace-pre-wrap leading-7">{job.result.translation.text}</p><p className="mt-3 text-xs leading-6 text-gray-500">{job.result.translation.processingSeconds.toFixed(2)} s · {job.result.translation.cpuSeconds.toFixed(2)} CPU s · {job.result.translation.averageCpuPercent.toFixed(1)}% average CPU · {bytes(job.result.translation.processPeakRssBytes)} process peak RSS · {bytes(job.result.translation.serviceMemoryPeakSampledBytes)} total service memory peak (sampled).</p>{job.result.translation.outputTruncated && <p className="mt-2 text-sm text-amber-700">Translation reached the output token limit and may be incomplete.</p>}</div>}
        {(job.model === 'madlad' || job.kind === 'generated') && job.status === 'completed' && <Assessment key={job.id} job={job} />}
        <button className="mt-5 text-sm text-emerald-700 underline dark:text-emerald-400" onClick={() => { const blob = new Blob([JSON.stringify(job, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `model-test-${job.id}.json`; a.click(); URL.revokeObjectURL(url); }}>Download this test as JSON</button>
      </>}</>}</section>
    </div>
  </div>;
}
