'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listModelsAction,
  generateDialogueAction,
  generateAudioAction,
  type DialogueLine,
} from './actions';

// ─────────────────── Constants ───────────────────
const STORAGE_KEY_API   = 'bantera-studio-api-key';
const STORAGE_KEY_PREFS = 'bantera-studio-prefs';

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: '🇺🇸 English (US)',          accentInstruction: 'Write the dialogue in English with a US American accent — use vocabulary and idioms typical of the United States.' },
  { value: 'en-UK', label: '🇬🇧 English (UK)',          accentInstruction: 'Write the dialogue in English with a British accent — use vocabulary and idioms typical of the United Kingdom.' },
  { value: 'en-NZ', label: '🇳🇿 English (New Zealand)', accentInstruction: 'Write the dialogue in English with a New Zealand accent — use vocabulary and idioms typical of New Zealand.' },
  { value: 'en-AU', label: '🇦🇺 English (Australian)',  accentInstruction: 'Write the dialogue in English with an Australian accent — use vocabulary and idioms typical of Australia.' },
  { value: 'en-CA', label: '🇨🇦 English (Canadian)',    accentInstruction: 'Write the dialogue in English with a Canadian accent — use vocabulary and idioms typical of Canada.' },
  { value: 'en-IE', label: '🇮🇪 English (Irish)',       accentInstruction: 'Write the dialogue in English with an Irish accent — use vocabulary and idioms typical of Ireland.' },
  { value: 'zh',    label: '🇨🇳 Chinese (Mandarin)',    accentInstruction: 'Write the dialogue entirely in Mandarin Chinese (简体中文). Keep it natural and conversational.' },
  { value: 'ja',    label: '🇯🇵 Japanese',              accentInstruction: 'Write the dialogue entirely in Japanese (日本語). Keep it natural and conversational.' },
  { value: 'ko',    label: '🇰🇷 Korean',                accentInstruction: 'Write the dialogue entirely in Korean (한국어). Keep it natural and conversational.' },
  { value: 'fr',    label: '🇫🇷 French',                accentInstruction: 'Write the dialogue entirely in French (Français). Keep it natural and conversational.' },
  { value: 'de',    label: '🇩🇪 German',                accentInstruction: 'Write the dialogue entirely in German (Deutsch). Keep it natural and conversational.' },
  { value: 'es',    label: '🇪🇸 Spanish',               accentInstruction: 'Write the dialogue entirely in Spanish (Español). Keep it natural and conversational.' },
  { value: 'pt',    label: '🇧🇷 Portuguese',            accentInstruction: 'Write the dialogue entirely in Portuguese (Português). Keep it natural and conversational.' },
  { value: 'hi',    label: '🇮🇳 Hindi',                 accentInstruction: 'Write the dialogue entirely in Hindi (हिन्दी). Keep it natural and conversational.' },
  { value: 'ar',    label: '🇸🇦 Arabic',                accentInstruction: 'Write the dialogue entirely in Arabic (العربية). Keep it natural and conversational.' },
  { value: 'it',    label: '🇮🇹 Italian',               accentInstruction: 'Write the dialogue entirely in Italian (Italiano). Keep it natural and conversational.' },
  { value: 'si',    label: '🇱🇰 Sinhala (Sri Lanka)',   accentInstruction: 'Write the dialogue entirely in Sinhala (සිංහල). Keep it natural and conversational.' },
];


const DURATION_OPTIONS = [
  { value: 30,  label: '30 seconds' },
  { value: 60,  label: '1 minute'   },
  { value: 120, label: '2 minutes'  },
  { value: 180, label: '3 minutes'  },
  { value: 300, label: '5 minutes'  },
];

const SCENARIO_PRESETS = [
  { emoji: '☕', label: 'Coffee shop',          text: 'Two strangers strike up a conversation while waiting in line at a busy coffee shop.' },
  { emoji: '✈️', label: 'Airport reunion',      text: 'Two old friends unexpectedly run into each other at an airport departure gate.' },
  { emoji: '🛒', label: 'Grocery store',         text: 'Two neighbours chat while shopping at the supermarket and discover they are hosting the same kind of dinner party.' },
  { emoji: '🏥', label: 'Doctor visit',          text: 'A patient nervously asks a doctor about their test results and next steps.' },
  { emoji: '💼', label: 'Job interview',          text: 'A candidate is being interviewed for their dream job and has to answer tough questions.' },
  { emoji: '🏠', label: 'New neighbour',          text: 'Someone just moved in next door and introduces themselves to their neighbour for the first time.' },
  { emoji: '📱', label: 'Tech support',           text: 'A frustrated customer calls tech support because their phone keeps restarting unexpectedly.' },
  { emoji: '🎂', label: 'Birthday surprise',      text: 'Friends are secretly planning a surprise birthday party and trying to keep it from the birthday person.' },
  { emoji: '🏋️', label: 'Gym tips',              text: 'A gym veteran gives unsolicited — but actually helpful — workout advice to a newcomer.' },
  { emoji: '🌧️', label: 'Weather small talk',    text: 'Two colleagues are stuck waiting for rain to stop outside their office and make small talk.' },
  { emoji: '🍕', label: 'Restaurant order',       text: 'Two friends argue lightheartedly about what to order at a pizza restaurant.' },
  { emoji: '📚', label: 'Book recommendation',    text: 'An avid reader tries to convince a sceptical friend to read a book they loved.' },
  { emoji: '🚌', label: 'Bus delay',              text: 'Two commuters bond over a very delayed bus and share their daily frustrations.' },
  { emoji: '🎬', label: 'Movie debate',            text: 'Two friends passionately disagree about whether a sequel was better than the original.' },
  { emoji: '✏️', label: 'Custom…',                text: '__custom__' },
];

type Theme = 'system' | 'dark' | 'light';
const THEME_OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: 'system', icon: '💻', label: 'System' },
  { value: 'light',  icon: '☀️',  label: 'Light'  },
  { value: 'dark',   icon: '🌙',  label: 'Dark'   },
];

// ─────────────────── Helpers ───────────────────
function pickTextModel(models: string[]): string {
  if (models.length === 0) return '';
  const preferred = models.find(m => m.includes('gemini-3-flash-preview') || m.includes('gemini-2.5-flash-preview'));
  if (preferred) return preferred;
  const fallback = models.find(m => m.includes('gemini-2.5-flash'));
  return fallback ?? models[0];
}

// ─────────────────── UI Components ───────────────────
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
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function StepBadge({ num, active, done }: { num: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-500 ${
      done    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
      : active ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/40'
               : 'bg-gray-200 dark:bg-white/10 text-gray-500'
    }`}>
      {done ? '✓' : num}
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-xl p-5 md:p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SpinnerIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex gap-3 items-start p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-300 text-sm">
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.268 16A2 2 0 005.07 19z" />
      </svg>
      <span className="whitespace-pre-wrap break-all">{message}</span>
    </div>
  );
}

function ModelSelect({
  id, label, value, onChange, models, loading, error, accentColor = 'indigo',
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  models: string[]; loading: boolean; error?: string; accentColor?: 'indigo' | 'violet';
}) {
  const ringMap = { indigo: 'focus:ring-indigo-500/60', violet: 'focus:ring-violet-500/60' };
  const errorBorder = error ? 'border-red-500/50' : 'border-gray-200 dark:border-white/10';

  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || !!error || models.length === 0}
        className={`w-full bg-white dark:bg-black/30 border ${errorBorder} text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${ringMap[accentColor]} transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading && <option value="">Loading models…</option>}
        {!loading && error && <option value="">Failed to load models</option>}
        {!loading && !error && models.length === 0 && <option value="">No models available</option>}
        {!loading && !error && models.map((m) => (
          <option key={m} value={m}>{m.replace('models/', '')}</option>
        ))}
      </select>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// KEY SETUP SCREEN
// ─────────────────────────────────────────────────────────────────
function KeySetupScreen({ initialKey = '', onSave }: { initialKey?: string; onSave: (key: string) => void }) {
  const [key,      setKey]      = useState(initialKey);
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSave() {
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    const res = await listModelsAction(key.trim());
    setLoading(false);
    if (!res.success) {
      setError(`Key verification failed: ${res.error}`);
      return;
    }
    onSave(key.trim());
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-sm space-y-8">

        {/* Icon + heading */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-3xl shadow-sm border border-indigo-200 dark:border-indigo-500/30">🗝️</div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Connect your AI key</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            To generate language dialogues and audio, you need a free AI key from Google. It takes about 30 seconds.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {[
            {
              n: '1',
              title: 'Open Google AI Studio',
              body: <>Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 font-medium">aistudio.google.com/apikey</a> and sign in with your Google account.</>,
            },
            {
              n: '2',
              title: 'Create an API key',
              body: 'Click "Create API key", then select "Create API key in new project". Your key will be shown once.',
            },
            {
              n: '3',
              title: 'Paste it below',
              body: 'Copy the key (starts with "AIza") and paste it in the field below.',
            },
          ].map((s) => (
            <div key={s.n} className="flex gap-3 items-start p-4 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Key input */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="AIza…"
              className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-xl px-4 py-3.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all font-mono shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition-colors"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && <ErrorBanner message={error} />}

          <button
            onClick={handleSave}
            disabled={!key.trim() || loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30"
          >
            {loading ? <SpinnerIcon /> : null}
            {loading ? 'Verifying…' : 'Save & Continue'}
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          🔒 Your key is stored only on this device — never on our servers.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STUDIO SCREEN
// ─────────────────────────────────────────────────────────────────
function StudioScreen({ apiKey, onChangeKey }: { apiKey: string; onChangeKey: () => void }) {
  // Models
  const [textModels,  setTextModels]  = useState<string[]>([]);
  const [audioModels, setAudioModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError,   setModelsError]   = useState<string | null>(null);

  // Settings
  const [langValue,  setLangValue]  = useState('en-US');
  const [transLangValue, setTransLangValue] = useState('');
  const [textModel,  setTextModel]  = useState('');
  const [audioModel, setAudioModel] = useState('');
  const [voice1, setVoice1] = useState('');
  const [voice2, setVoice2] = useState('');
  const [durationSecs, setDurationSecs] = useState(60);

  // Theme
  const [theme, setTheme] = useState<Theme>('system');

  // Scenario
  const [selectedScenario, setSelectedScenario] = useState('');
  const [customText, setCustomText] = useState('');

  // Dialogue
  const [dialogueTitle,   setDialogueTitle]   = useState('');
  const [dialogueLines,   setDialogueLines]   = useState<DialogueLine[]>([]);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [dialogueError,   setDialogueError]   = useState<string | null>(null);

  // Audio
  const [audioBase64,  setAudioBase64]  = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError,   setAudioError]   = useState<string | null>(null);

  const prefsLoaded = useRef(false);
  const currentLang = LANGUAGE_OPTIONS.find(l => l.value === langValue) ?? LANGUAGE_OPTIONS[0];

  const step1Done = !!(textModel && audioModel);
  const step2Done = dialogueLines.length > 0;
  const activeStep = !step1Done ? 1 : !step2Done ? 2 : 3;

  // ── Apply dark class to <html> when theme changes ──
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

  // Load models + prefs on mount
  useEffect(() => {
    (async () => {
      setModelsLoading(true);
      const res = await listModelsAction(apiKey);
      setModelsLoading(false);
      if (!res.success) { setModelsError(res.error); return; }
      setTextModels(res.textModels);
      setAudioModels(res.audioModels);

      // Restore prefs
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PREFS);
        const saved = raw ? JSON.parse(raw) as Record<string, string> : {};
        if (saved.langValue && LANGUAGE_OPTIONS.some(l => l.value === saved.langValue)) setLangValue(saved.langValue);
        if (saved.transLangValue === '' || LANGUAGE_OPTIONS.some(l => l.value === saved.transLangValue)) setTransLangValue(saved.transLangValue || '');
        if (saved.durationSecs && DURATION_OPTIONS.some(d => d.value === Number(saved.durationSecs))) setDurationSecs(Number(saved.durationSecs));
        if (saved.theme && ['system','dark','light'].includes(saved.theme)) setTheme(saved.theme as Theme);
        const savedText  = saved.textModel  && res.textModels.includes(saved.textModel)  ? saved.textModel  : pickTextModel(res.textModels);
        const savedAudio = saved.audioModel && res.audioModels.includes(saved.audioModel) ? saved.audioModel : res.audioModels[0] ?? '';
        setTextModel(savedText);
        setAudioModel(savedAudio);
      } catch {
        setTextModel(pickTextModel(res.textModels));
        setAudioModel(res.audioModels[0] ?? '');
      }
      prefsLoaded.current = true;
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist prefs
  useEffect(() => {
    if (!prefsLoaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify({ langValue, transLangValue, durationSecs, textModel, audioModel, theme }));
    } catch { /* ignore */ }
  }, [langValue, transLangValue, durationSecs, textModel, audioModel, theme]);

  // Generate dialogue
  const handleGenerateDialogue = useCallback(async () => {
    setDialogueLoading(true);
    setDialogueError(null);
    setDialogueLines([]);
    setDialogueTitle('');
    setAudioBase64(null);
    const res = await generateDialogueAction({
      apiKey,
      languageLabel: currentLang.label.replace(/^.+?\s/, ''),
      accentInstruction: currentLang.accentInstruction,
      scenario: selectedScenario === '__custom__' ? (customText || undefined) : selectedScenario || undefined,
      textModel,
      targetDurationSecs: durationSecs,
      translationTargetLabel: transLangValue ? LANGUAGE_OPTIONS.find(l => l.value === transLangValue)?.label.replace(/^.+?\s/, '') : undefined,
    });
    setDialogueLoading(false);
    if (res.success) {
      setDialogueTitle(res.title);
      setDialogueLines(res.lines);
      setVoice1(res.voice1);
      setVoice2(res.voice2);
    } else setDialogueError(res.error);
  }, [apiKey, currentLang, transLangValue, selectedScenario, customText, textModel, durationSecs]);

  // Generate audio
  const handleGenerateAudio = useCallback(async () => {
    if (!step2Done) return;
    setAudioLoading(true); setAudioError(null); setAudioBase64(null);
    const res = await generateAudioAction({ apiKey, lines: dialogueLines, accentInstruction: currentLang.accentInstruction, audioModel, voice1, voice2 });
    setAudioLoading(false);
    if (res.success) setAudioBase64(res.audioBase64);
    else setAudioError(res.error);
  }, [apiKey, dialogueLines, currentLang, audioModel, voice1, voice2, step2Done]);

  const audioSrc = audioBase64 ? `data:audio/wav;base64,${audioBase64}` : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:bg-none dark:bg-gray-950 text-gray-900 dark:text-white font-sans transition-colors duration-300 pb-20 pt-4 md:pt-12">
      <div className="max-w-4xl mx-auto px-4 space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 tracking-widest uppercase">
                Studio WebApp
              </span>
              <button
                onClick={onChangeKey}
                title="Change API key"
                className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:underline transition-colors shrink-0"
              >
                Change Key
              </button>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              Dialogue Studio
            </h1>
          </div>
          <div className="shrink-0">
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </div>

        {/* ─── STEP 1 ─── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge num={1} active={activeStep === 1} done={step1Done} />
            <h2 className="text-lg font-semibold">Language &amp; Models</h2>
          </div>
          {!modelsLoading && modelsError && (
            <ErrorBanner message={`Could not load model list: ${modelsError}`} />
          )}
          <GlassCard className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2" htmlFor="language-select">
                Audio Language
              </label>
              <select
                id="language-select" value={langValue} onChange={(e) => setLangValue(e.target.value)}
                className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2" htmlFor="translation-select">
                Translation Language
              </label>
              <select
                id="translation-select" value={transLangValue} onChange={(e) => setTransLangValue(e.target.value)}
                className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all"
              >
                <option value="">None</option>
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </GlassCard>
        </section>

        {/* ─── STEP 2 ─── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge num={2} active={activeStep === 2} done={step2Done} />
            <h2 className="text-lg font-semibold">Generate Dialogue</h2>
          </div>
          <GlassCard className="space-y-6">
            {/* Scenario picker */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Scenario <span className="normal-case text-gray-400 dark:text-gray-600">(pick one or write your own)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SCENARIO_PRESETS.map((s) => {
                  const isSelected = selectedScenario === s.text;
                  return (
                    <button
                      key={s.text} type="button" disabled={!step1Done}
                      onClick={() => setSelectedScenario(isSelected ? '' : s.text)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border text-left transition-all disabled:opacity-40 ${
                        isSelected
                          ? 'bg-indigo-100/50 dark:bg-indigo-500/30 border-indigo-400 dark:border-indigo-500/50 text-indigo-800 dark:text-indigo-100 font-medium shadow-sm'
                          : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-white/30 hover:text-gray-800 dark:hover:text-white'
                      }`}
                    >
                      <span className="text-base shrink-0">{s.emoji}</span>
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* Custom input */}
              {selectedScenario === '__custom__' && (
                <textarea
                  id="scenario-custom-input"
                  rows={2}
                  autoFocus
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Describe your scenario…"
                  className="mt-3 w-full bg-white dark:bg-black/30 border border-indigo-300 dark:border-indigo-500/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all resize-none shadow-sm"
                />
              )}
              {/* Preview */}
              {selectedScenario && selectedScenario !== '__custom__' && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 italic pl-1">{selectedScenario}</p>
              )}
            </div>

            {/* Duration picker */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Target Audio Length
              </label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value} type="button" disabled={!step1Done}
                    onClick={() => setDurationSecs(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 ${
                      durationSecs === opt.value
                        ? 'bg-indigo-600/10 dark:bg-indigo-500/30 border-indigo-500/40 text-indigo-700 dark:text-indigo-200 shadow-sm shadow-indigo-500/10'
                        : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/30 hover:text-gray-700 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="generate-dialogue-btn" onClick={handleGenerateDialogue}
              disabled={!step1Done || dialogueLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {dialogueLoading ? <SpinnerIcon /> : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
              {dialogueLoading ? 'Generating…' : 'Generate Dialogue'}
            </button>

            {dialogueError && <ErrorBanner message={dialogueError} />}

            {dialogueLines.length > 0 && (
              <div className="space-y-4 pt-2">
                {dialogueTitle && (
                  <div className="px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Title</p>
                    <p className="text-gray-900 dark:text-white font-semibold text-lg">{dialogueTitle}</p>
                  </div>
                )}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 rounded-xl bg-gray-100/50 dark:bg-black/20 p-2 md:p-4 border border-gray-200/50 dark:border-white/5">
                  {dialogueLines.map((line, i) => (
                    <div key={i} className={`flex gap-3 items-start ${line.speaker === 'Speaker2' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${
                        line.speaker === 'Speaker1' ? 'bg-indigo-200 dark:bg-indigo-600/40 text-indigo-800 dark:text-indigo-100' : 'bg-violet-200 dark:bg-violet-600/40 text-violet-800 dark:text-violet-100'
                      }`}>
                        {line.speaker === 'Speaker1' ? 'A' : 'B'}
                      </div>
                      <div className={`max-w-[80%] space-y-2 px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        line.speaker === 'Speaker1'
                          ? 'bg-white dark:bg-indigo-500/10 border border-gray-200 dark:border-indigo-500/20 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                          : 'bg-indigo-50 dark:bg-violet-500/10 border border-indigo-100 dark:border-violet-500/20 text-gray-900 dark:text-gray-100 rounded-tr-sm'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{line.text}</p>
                        {line.translation && <p className="text-xs pt-2 mt-2 border-t border-gray-200/50 dark:border-white/10 text-gray-600 dark:text-gray-400 font-medium">{line.translation}</p>}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </GlassCard>
        </section>

        {/* ─── STEP 3 ─── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge num={3} active={step2Done && !audioBase64} done={!!audioBase64} />
            <h2 className="text-lg font-semibold">Generate Audio</h2>
          </div>
          <GlassCard className="space-y-5">

            {!audioSrc && (
              <button
                id="generate-audio-btn" onClick={handleGenerateAudio} disabled={!step2Done || audioLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {audioLoading ? <SpinnerIcon /> : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 18.364C8.5 18.364 5 15.5 5 12s3.5-6.364 7-6.364M19.07 4.929a9 9 0 010 12.728" />
                  </svg>
                )}
                {audioLoading ? 'Generating…' : 'Generate Audio TTS'}
              </button>
            )}
            {audioError && <ErrorBanner message={audioError} />}
            {audioSrc && (
              <div className="space-y-3 p-5 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 shadow-sm mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300">✓ Audio Ready</p>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls controlsList="nodownload" src={audioSrc} className="w-full rounded-lg" />
              </div>
            )}
          </GlassCard>
        </section>

      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE — key gate
// ─────────────────────────────────────────────────────────────────
export default function WebappStudioPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_API);
    setApiKey(saved ?? '');
  }, []);

  function handleSave(key: string) {
    localStorage.setItem(STORAGE_KEY_API, key);
    setApiKey(key);
    setShowSetup(false);
  }
  function handleChangeKey() {
    setShowSetup(true);
  }

  if (apiKey === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!apiKey || showSetup) return <KeySetupScreen initialKey={apiKey || ''} onSave={handleSave} />;
  return <StudioScreen apiKey={apiKey} onChangeKey={handleChangeKey} />;
}
