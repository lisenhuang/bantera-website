'use client';

import { useState, useEffect, useTransition } from 'react';
import { generateImageAction, listModelsAction, type CfModel } from './actions';
import { MODELS as STATIC_MODELS } from './models';

// ── Size presets ──────────────────────────────────────────────────
const SIZE_PRESETS = [
  { label: '512 × 512',   w: 512,  h: 512  },
  { label: '768 × 768',   w: 768,  h: 768  },
  { label: '1024 × 1024', w: 1024, h: 1024 },
  { label: '1024 × 576',  w: 1024, h: 576  },
  { label: '576 × 1024',  w: 576,  h: 1024 },
];

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

  // Dynamic model list
  const [models, setModels]               = useState<CfModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError]     = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Form state
  const [model, setModel] = useState('');
  const [prompt,         setPrompt]         = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [sizeIdx,        setSizeIdx]        = useState(0);
  const [steps,          setSteps]          = useState(20);

  // Result state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [elapsed,  setElapsed]  = useState<number | null>(null);

  const selectedSize = SIZE_PRESETS[sizeIdx];

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

  // ── Fetch models on mount; fall back to static list ──────────────
  const staticAsCfModels: CfModel[] = STATIC_MODELS.map((m) => ({
    id: m.id,
    name: m.label,
    description: m.note ?? '',
    task: { name: 'Text-to-Image' },
  }));

  useEffect(() => {
    (async () => {
      setModelsLoading(true);
      const res = await listModelsAction();
      setModelsLoading(false);
      if (!res.success || res.models.length === 0) {
        setModelsError(res.success ? null : res.error);
        setModels(staticAsCfModels);
        setModel(staticAsCfModels[0]?.id ?? '');
        setUsingFallback(true);
        return;
      }
      setModels(res.models);
      setModel(res.models[0].id);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate ──────────────────────────────────────────────────────
  function handleGenerate() {
    if (!prompt.trim()) return;
    setError(null);
    setImageSrc(null);
    setElapsed(null);
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
                {!modelsLoading && !modelsError && models.map((m) => (
                  <option key={m.id} value={m.id}>{m.id.replace('@cf/', '')}</option>
                ))}
              </select>
              {modelsError && !usingFallback && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{modelsError}</p>
              )}
              {usingFallback && (
                <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-500/80">⚠ Dynamic load failed — showing static model list</p>
              )}
              {!modelsLoading && !usingFallback && models.length > 0 && (
                <p className="mt-1.5 text-xs text-gray-400">{models.length} models available</p>
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
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isPending || !prompt.trim() || !model}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isPending ? <SpinnerIcon /> : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {isPending ? 'Generating…' : 'Generate Image'}
            </button>
          </div>

          {/* ── Output ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-xl overflow-hidden min-h-[400px] flex flex-col">

              {/* Placeholder */}
              {!imageSrc && !error && !isPending && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-3xl mb-4">🎨</div>
                  <p className="text-sm">Your generated image will appear here</p>
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
                      <p><span className="text-gray-600 dark:text-gray-400">Size:</span> {selectedSize.label} · <span className="text-gray-600 dark:text-gray-400">Steps:</span> {steps}</p>
                      {elapsed && <p><span className="text-gray-600 dark:text-gray-400">Time:</span> {(elapsed / 1000).toFixed(1)}s</p>}
                    </div>
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = imageSrc;
                        a.download = `cf-generated-${Date.now()}.png`;
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
      </div>
    </main>
  );
}
