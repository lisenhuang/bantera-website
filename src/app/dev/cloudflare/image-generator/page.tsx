'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { generateImageAction, listModelsAction, type CfModel, type PriceEntry } from './actions';

// ── Size presets ──────────────────────────────────────────────────
const SIZE_PRESETS = [
  { label: '512 × 512',   w: 512,  h: 512  },
  { label: '768 × 768',   w: 768,  h: 768  },
  { label: '1024 × 1024', w: 1024, h: 1024 },
  { label: '1024 × 576',  w: 1024, h: 576  },
  { label: '576 × 1024',  w: 576,  h: 1024 },
];

// ── Pricing ───────────────────────────────────────────────────────
// Cloudflare bills image models per step and/or per 512×512 tile. The API only
// publishes a price list for some models; the rest show as "n/a".
function tileCount(w: number, h: number) {
  return Math.ceil(w / 512) * Math.ceil(h / 512);
}

function shortUnit(unit: string) {
  const u = unit.toLowerCase();
  if (u.includes('tile')) return 'tile';
  if (u.includes('step')) return 'step';
  return unit;
}

function formatUsd(n: number) {
  if (n === 0) return '$0';
  // Unit prices are tiny (e.g. $0.000132) — keep precision, drop trailing zeros.
  return '$' + n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

type CostEstimate = { total: number; lines: string[] };

function estimateCost(price: PriceEntry[] | null, steps: number, w: number, h: number): CostEstimate | null {
  if (!price) return null;
  const lines: string[] = [];
  let total = 0;
  for (const p of price) {
    const kind = shortUnit(p.unit);
    const qty = kind === 'step' ? steps : kind === 'tile' ? tileCount(w, h) : 1;
    const sub = p.price * qty;
    total += sub;
    lines.push(`${qty} ${kind}${qty === 1 ? '' : 's'} × ${formatUsd(p.price)} = ${formatUsd(sub)}`);
  }
  return { total, lines };
}

function priceSummary(price: PriceEntry[] | null) {
  if (!price) return 'price n/a';
  if (price.every((p) => p.price === 0)) return 'free';
  return price.map((p) => `${formatUsd(p.price)}/${shortUnit(p.unit)}`).join(' + ');
}

// ── Batch ("All models") mode ─────────────────────────────────────
const ALL_MODELS = '__all__';

type BatchItem = {
  model: CfModel;
  status: 'pending' | 'done' | 'error';
  elapsedMs: number | null;
  imageSrc: string | null;
  mimeType: string | null;
  usedParams: Record<string, unknown> | null;
  error: string | null;
};

function fmtSeconds(ms: number | null) {
  return ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`;
}

// ── Theme ─────────────────────────────────────────────────────────
type Theme = 'system' | 'dark' | 'light';
const THEME_OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: 'system', icon: '💻', label: 'System' },
  { value: 'light',  icon: '☀️',  label: 'Light'  },
  { value: 'dark',   icon: '🌙', label: 'Dark'   },
];

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10">
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            theme === opt.value
              ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function CloudflareImageGeneratorPage() {
  const [isPending, startTransition] = useTransition();

  // Theme
  const [theme, setTheme] = useState<Theme>('system');

  // Dynamic model list — always fetched live from Cloudflare, never hardcoded
  const [models, setModels]               = useState<CfModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError]     = useState<string | null>(null);

  // Form state
  const [model, setModel] = useState('');
  const [prompt,         setPrompt]         = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [sizeIdx,        setSizeIdx]        = useState(0);
  const [steps,          setSteps]          = useState(20);

  // Result state
  const [imageSrc,   setImageSrc]   = useState<string | null>(null);
  const [mimeType,   setMimeType]   = useState<string>('image/png');
  const [usedParams, setUsedParams] = useState<Record<string, unknown> | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [elapsed,    setElapsed]    = useState<number | null>(null);

  // Batch state — one entry per model when "All" is selected
  const [batch,        setBatch]        = useState<BatchItem[] | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  // Sequential = one model at a time, so each stopwatch is pure generation
  // time. Parallel fires all at once, but Cloudflare's per-account concurrency
  // limit then queues them and the timings include waiting in line.
  const [batchMode, setBatchMode] = useState<'sequential' | 'parallel'>('sequential');
  const [batchModeUsed, setBatchModeUsed] = useState<'sequential' | 'parallel'>('sequential');

  const selectedSize = SIZE_PRESETS[sizeIdx];
  const isAll = model === ALL_MODELS;
  const selectedModel = isAll ? null : (models.find((m) => m.id === model) ?? null);

  // Pre-flight estimate from the form; actual cost re-derived from the params
  // the model really accepted (FLUX drops size and caps steps, for example).
  const estimate = estimateCost(selectedModel?.price ?? null, steps, selectedSize.w, selectedSize.h);

  // Batch estimate: sum of every model that publishes a price; count the rest.
  const batchEstimate = isAll
    ? models.reduce(
        (acc, m) => {
          const e = estimateCost(m.price, steps, selectedSize.w, selectedSize.h);
          if (e) acc.total += e.total; else acc.unpriced += 1;
          return acc;
        },
        { total: 0, unpriced: 0 },
      )
    : null;

  const batchDone = batch ? batch.filter((b) => b.status !== 'pending').length : 0;
  const batchSorted = batch
    ? [...batch].sort((a, b) => (a.elapsedMs ?? Infinity) - (b.elapsedMs ?? Infinity))
    : null;
  const actualCost = usedParams && selectedModel
    ? estimateCost(
        selectedModel.price,
        Number(usedParams.steps ?? usedParams.num_steps ?? steps),
        Number(usedParams.width ?? selectedSize.w),
        Number(usedParams.height ?? selectedSize.h),
      )
    : null;

  // ── Apply dark class to <html> ────────────────────────────────────
  useEffect(() => {
    const html = document.documentElement;
    const applyDark = (dark: boolean) => {
      if (dark) html.classList.add('dark');
      else html.classList.remove('dark');
    };
    if (theme === 'dark') {
      applyDark(true);
    } else if (theme === 'light') {
      applyDark(false);
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyDark(mq.matches);
      const listener = (e: MediaQueryListEvent) => applyDark(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [theme]);

  // ── Fetch the live model list from Cloudflare ────────────────────
  const applyModels = useCallback((res: Awaited<ReturnType<typeof listModelsAction>>) => {
    setModelsLoading(false);
    if (!res.success) {
      setModels([]);
      setModel('');
      setModelsError(res.error);
      return;
    }
    setModels(res.models);
    setModel((current) => (res.models.some((m) => m.id === current) ? current : res.models[0].id));
  }, []);

  // `modelsLoading` starts true, so nothing is set synchronously here — state
  // only changes once the server action resolves.
  useEffect(() => {
    let cancelled = false;
    listModelsAction().then((res) => { if (!cancelled) applyModels(res); });
    return () => { cancelled = true; };
  }, [applyModels]);

  function retryModels() {
    setModelsLoading(true);
    setModelsError(null);
    listModelsAction().then(applyModels);
  }

  // ── Generate: every model, each timed on its own ──────────────────
  async function handleGenerateAll() {
    if (!prompt.trim() || models.length === 0) return;
    setError(null);
    setImageSrc(null);
    setUsedParams(null);
    setElapsed(null);
    setBatchRunning(true);
    setBatchModeUsed(batchMode);
    setBatch(models.map((m) => ({
      model: m, status: 'pending', elapsedMs: null, imageSrc: null, mimeType: null, usedParams: null, error: null,
    })));

    const common = {
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      steps,
      width:  selectedSize.w,
      height: selectedSize.h,
    };

    const runOne = async (m: CfModel) => {
      const t0 = Date.now();
      let patch: Partial<BatchItem>;
      try {
        const res = await generateImageAction({ ...common, model: m.id });
        patch = res.success
          ? { status: 'done', imageSrc: `data:${res.mimeType};base64,${res.imageBase64}`, mimeType: res.mimeType, usedParams: res.usedParams }
          : { status: 'error', error: res.error };
      } catch (err) {
        patch = { status: 'error', error: err instanceof Error ? err.message : String(err) };
      }
      const elapsedMs = Date.now() - t0;
      setBatch((prev) => prev?.map((b) => (b.model.id === m.id ? { ...b, ...patch, elapsedMs } : b)) ?? prev);
    };

    if (batchMode === 'sequential') {
      for (const m of models) await runOne(m);
    } else {
      await Promise.all(models.map(runOne));
    }

    setBatchRunning(false);
  }

  // ── Generate ──────────────────────────────────────────────────────
  function handleGenerate() {
    if (!prompt.trim()) return;
    if (isAll) { void handleGenerateAll(); return; }
    setError(null);
    setImageSrc(null);
    setUsedParams(null);
    setElapsed(null);
    setBatch(null);
    const t0 = Date.now();

    startTransition(async () => {
      const res = await generateImageAction({
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        model,
        steps,
        width:  selectedSize.w,
        height: selectedSize.h,
      });
      setElapsed(Date.now() - t0);
      if (res.success) {
        setImageSrc(`data:${res.mimeType};base64,${res.imageBase64}`);
        setMimeType(res.mimeType);
        setUsedParams(res.usedParams);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 text-gray-900 dark:text-white font-sans transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-12 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-lg">🖼️</div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Test · Cloudflare Workers AI</p>
              <h1 className="text-2xl font-bold tracking-tight">Image Generator</h1>
            </div>
          </div>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* ── Controls ── */}
          <div className="space-y-5">

            {/* Model */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={modelsLoading || !!modelsError || models.length === 0}
                className={`w-full bg-white dark:bg-black/30 border ${
                  modelsError ? 'border-red-400 dark:border-red-500/50' : 'border-gray-200 dark:border-white/10'
                } text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {modelsLoading && <option value="">Loading models…</option>}
                {!modelsLoading && modelsError && <option value="">Failed to load models</option>}
                {!modelsLoading && !modelsError && models.length === 0 && <option value="">No models found</option>}
                {!modelsLoading && !modelsError && models.length > 0 && (
                  <option value={ALL_MODELS}>★ All models — run every one and compare timing ({models.length})</option>
                )}
                {!modelsLoading && !modelsError && models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} · {priceSummary(m.price)}{m.partner ? ' · partner' : ''}{m.beta ? ' · beta' : ''}
                  </option>
                ))}
              </select>
              {modelsError && (
                <div className="mt-1.5 flex items-start gap-2">
                  <p className="text-xs text-red-500 dark:text-red-400 flex-1">{modelsError}</p>
                  <button
                    type="button"
                    onClick={retryModels}
                    className="text-xs text-orange-600 dark:text-orange-300 underline shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!modelsLoading && !modelsError && models.length > 0 && (
                <p className="mt-1.5 text-xs text-gray-400">
                  {models.length} models · live from Cloudflare
                </p>
              )}
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2" htmlFor="cf-prompt">
                Prompt <span className="normal-case text-gray-400 dark:text-gray-600">(describe what to generate)</span>
              </label>
              <textarea
                id="cf-prompt"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A cinematic wide shot of a misty mountain valley at dawn, golden light, hyper-realistic photography…"
                className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60 transition-all resize-none"
              />
            </div>

            {/* Negative prompt */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2" htmlFor="cf-neg-prompt">
                Negative Prompt <span className="normal-case text-gray-400 dark:text-gray-600">(optional)</span>
              </label>
              <textarea
                id="cf-neg-prompt"
                rows={2}
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, watermark, text, ugly…"
                className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all resize-none"
              />
            </div>

            {/* Size */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Output Size</label>
              <div className="flex gap-2 flex-wrap">
                {SIZE_PRESETS.map((s, i) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setSizeIdx(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      sizeIdx === i
                        ? 'bg-orange-500/10 dark:bg-orange-600/30 border-orange-400 dark:border-orange-500/60 text-orange-600 dark:text-orange-200'
                        : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-orange-300 dark:hover:border-white/30 hover:text-gray-700 dark:hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Steps</label>
                <span className="text-xs font-mono text-orange-500 dark:text-orange-300">{steps}</span>
              </div>
              <input
                type="range" min={4} max={50} value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>4 (fast)</span><span>50 (quality)</span>
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-600">
                Steps and size are auto-adjusted to whatever the selected model accepts (FLUX caps steps at 8 and ignores size).
              </p>
            </div>

            {/* Cost estimate */}
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estimated cost</span>
                <span className="text-sm font-semibold font-mono text-gray-900 dark:text-white">
                  {batchEstimate
                    ? (batchEstimate.total === 0 ? 'Free' : formatUsd(batchEstimate.total))
                    : !selectedModel ? '—' : !estimate ? 'n/a' : estimate.total === 0 ? 'Free' : formatUsd(estimate.total)}
                </span>
              </div>
              {!isAll && estimate && estimate.total > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-[11px] font-mono text-gray-500 dark:text-gray-400">
                  {estimate.lines.map((l) => <li key={l}>{l}</li>)}
                </ul>
              )}
              <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-600">
                {batchEstimate
                  ? `Sum over the ${models.length - batchEstimate.unpriced} models that publish a price${batchEstimate.unpriced ? ` — ${batchEstimate.unpriced} more have no published price and are not included` : ''}.`
                  : selectedModel && !estimate
                  ? 'Cloudflare does not publish a price for this model via the API — see the Workers AI pricing page.'
                  : 'Based on the size and steps above. Models that ignore size or cap steps (e.g. FLUX) bill on what they actually accept — see “Actual cost” after generating.'}
              </p>
            </div>

            {/* Run mode — only meaningful when "All models" is selected */}
            {isAll && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Run mode</label>
                <div className="flex gap-2">
                  {([
                    { value: 'sequential', label: 'Sequential', hint: 'true per-model time' },
                    { value: 'parallel',   label: 'Parallel',   hint: 'fastest overall, times include queueing' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBatchMode(opt.value)}
                      disabled={batchRunning}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs border text-left transition-all disabled:opacity-60 ${
                        batchMode === opt.value
                          ? 'bg-orange-500/10 dark:bg-orange-600/30 border-orange-400 dark:border-orange-500/60 text-orange-600 dark:text-orange-200'
                          : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-orange-300 dark:hover:border-white/30'
                      }`}
                    >
                      <span className="font-medium block">{opt.label}</span>
                      <span className="text-[10px] opacity-80">{opt.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-600">
                  Cloudflare runs image requests on your account roughly one at a time, so parallel timings mostly measure the queue. Sequential gives each model the API to itself.
                </p>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isPending || batchRunning || !prompt.trim() || !model}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {(isPending || batchRunning) ? <SpinnerIcon /> : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {batchRunning
                ? `Generating… ${batchDone}/${batch?.length ?? 0} done`
                : isPending ? 'Generating…'
                : isAll ? `Generate with all ${models.length} models (${batchMode})`
                : 'Generate Image'}
            </button>
          </div>

          {/* ── Output ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-xl overflow-hidden min-h-[400px] flex flex-col">

              {/* Placeholder */}
              {!imageSrc && !error && !isPending && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-3xl mb-4">{isAll ? '⏱️' : '🎨'}</div>
                  <p className="text-sm">
                    {isAll
                      ? (batch
                          ? 'Results for every model are listed below, fastest first.'
                          : batchMode === 'sequential'
                            ? 'Models run one at a time — each timing is pure generation time. Results appear below as they finish.'
                            : 'All models fire at once — results and timings appear below.')
                      : 'Your generated image will appear here'}
                  </p>
                </div>
              )}

              {/* Loading */}
              {isPending && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-12 text-center space-y-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
                    <div className="absolute inset-3 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin [animation-direction:reverse]" />
                  </div>
                  <p className="text-sm">Generating with Cloudflare Workers AI…</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600">{model.replace('@cf/', '')}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex-1 flex flex-col justify-center p-6">
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 text-sm">
                    <p className="font-semibold mb-2">Generation failed</p>
                    <pre className="whitespace-pre-wrap break-all text-xs text-red-500 dark:text-red-400 font-mono">{error}</pre>
                  </div>
                </div>
              )}

              {/* Image */}
              {imageSrc && (
                <div className="flex flex-col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc} alt="Generated image" className="w-full object-contain" />
                  <div className="p-4 bg-gray-100 dark:bg-black/20 border-t border-gray-200 dark:border-white/5 flex items-center justify-between gap-4">
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p><span className="text-gray-600 dark:text-gray-400">Model:</span> {model.replace('@cf/', '')}</p>
                      {usedParams && (
                        <p>
                          <span className="text-gray-600 dark:text-gray-400">Accepted params:</span>{' '}
                          <span className="font-mono">
                            {Object.entries(usedParams)
                              .filter(([k]) => k !== 'prompt' && k !== 'negative_prompt')
                              .map(([k, v]) => `${k}=${String(v)}`)
                              .join(' · ') || 'prompt only'}
                          </span>
                        </p>
                      )}
                      <p>
                        <span className="text-gray-600 dark:text-gray-400">Actual cost:</span>{' '}
                        <span className="font-mono">
                          {actualCost ? (actualCost.total === 0 ? 'Free' : formatUsd(actualCost.total)) : 'n/a (price not published)'}
                        </span>
                      </p>
                      <p><span className="text-gray-600 dark:text-gray-400">Format:</span> {mimeType}</p>
                      {elapsed && <p><span className="text-gray-600 dark:text-gray-400">Time:</span> {(elapsed / 1000).toFixed(1)}s</p>}
                    </div>
                    <button
                      onClick={() => {
                        const ext = mimeType.includes('jpeg') ? 'jpg'
                          : mimeType.includes('webp') ? 'webp'
                          : mimeType.includes('svg') ? 'svg'
                          : 'png';
                        const a = document.createElement('a');
                        a.href = imageSrc;
                        a.download = `cf-generated-${Date.now()}.${ext}`;
                        a.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-300 dark:border-orange-500/40 text-orange-600 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/20 text-xs font-medium transition-all shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Batch results: every model, fastest first ── */}
        {batchSorted && (
          <section className="mt-12">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold tracking-tight">All models · timing comparison</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {batchDone}/{batchSorted.length} finished · sorted fastest → slowest · {batchModeUsed === 'sequential' ? 'ran one at a time (pure generation time)' : 'ran in parallel (times include queueing)'}
              </p>
            </div>

            {/* Summary table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 mb-6">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">#</th>
                    <th className="text-left px-3 py-2 font-medium">Model</th>
                    <th className="text-right px-3 py-2 font-medium">Time</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium">Cost</th>
                    <th className="text-left px-3 py-2 font-medium">Accepted params</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {batchSorted.map((b, i) => {
                    const cost = b.usedParams
                      ? estimateCost(
                          b.model.price,
                          Number(b.usedParams.steps ?? b.usedParams.num_steps ?? steps),
                          Number(b.usedParams.width ?? selectedSize.w),
                          Number(b.usedParams.height ?? selectedSize.h),
                        )
                      : null;
                    return (
                      <tr key={b.model.id} className="text-gray-700 dark:text-gray-300">
                        <td className="px-3 py-2 font-mono text-gray-400">{b.status === 'pending' ? '·' : i + 1}</td>
                        <td className="px-3 py-2 font-mono">{b.model.label}</td>
                        <td className="px-3 py-2 font-mono text-right">{fmtSeconds(b.elapsedMs)}</td>
                        <td className="px-3 py-2">
                          {b.status === 'pending' && <span className="text-gray-400">running…</span>}
                          {b.status === 'done' && <span className="text-green-600 dark:text-green-400">✓ ok</span>}
                          {b.status === 'error' && <span className="text-red-500 dark:text-red-400">✗ failed</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-right">
                          {b.status !== 'done' ? '—' : !cost ? 'n/a' : cost.total === 0 ? 'Free' : formatUsd(cost.total)}
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">
                          {b.usedParams
                            ? Object.entries(b.usedParams)
                                .filter(([k]) => k !== 'prompt' && k !== 'negative_prompt')
                                .map(([k, v]) => `${k}=${String(v)}`)
                                .join(' · ') || 'prompt only'
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Image cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batchSorted.map((b) => (
                <div key={b.model.id} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 overflow-hidden flex flex-col">
                  <div className="aspect-square bg-gray-100 dark:bg-black/20 flex items-center justify-center">
                    {b.status === 'pending' && (
                      <div className="w-10 h-10 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
                    )}
                    {b.status === 'done' && b.imageSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.imageSrc} alt={b.model.label} className="w-full h-full object-cover" />
                    )}
                    {b.status === 'error' && (
                      <pre className="p-4 text-[10px] leading-snug text-red-500 dark:text-red-400 whitespace-pre-wrap break-all overflow-auto max-h-full">{b.error}</pre>
                    )}
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-gray-200 dark:border-white/5">
                    <span className="text-[11px] font-mono truncate text-gray-700 dark:text-gray-300" title={b.model.id}>{b.model.label}</span>
                    <span className={`text-xs font-mono shrink-0 ${
                      b.status === 'error' ? 'text-red-500' : 'text-orange-600 dark:text-orange-300'
                    }`}>{fmtSeconds(b.elapsedMs)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
