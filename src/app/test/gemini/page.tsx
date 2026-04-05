'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listModelsAction,
  generateDialogueAction,
  generateAudioAction,
  generateImageAction,
  type DialogueLine,
} from './actions';

// ─────────────────── Language options (unified) ───────────────────
type LangOption = {
  value: string;
  label: string;
  accentInstruction: string;
};

const LANGUAGE_OPTIONS: LangOption[] = [
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

// ─────────────────── Voice options with gender ───────────────────
type VoiceInfo = { name: string; gender: 'Male' | 'Female'; style: string };
const VOICE_OPTIONS: VoiceInfo[] = [
  { name: 'Kore',          gender: 'Female', style: 'Firm' },
  { name: 'Puck',          gender: 'Male',   style: 'Upbeat' },
  { name: 'Aoede',         gender: 'Female', style: 'Breezy' },
  { name: 'Charon',        gender: 'Male',   style: 'Informational' },
  { name: 'Fenrir',        gender: 'Male',   style: 'Excitable' },
  { name: 'Leda',          gender: 'Female', style: 'Youthful' },
  { name: 'Orus',          gender: 'Male',   style: 'Firm' },
  { name: 'Zephyr',        gender: 'Female', style: 'Bright' },
  { name: 'Callirrhoe',    gender: 'Female', style: 'Easy-going' },
  { name: 'Autonoe',       gender: 'Female', style: 'Bright' },
  { name: 'Enceladus',     gender: 'Male',   style: 'Breathy' },
  { name: 'Iapetus',       gender: 'Male',   style: 'Clear' },
  { name: 'Umbriel',       gender: 'Male',   style: 'Easy-going' },
  { name: 'Algieba',       gender: 'Male',   style: 'Smooth' },
  { name: 'Despina',       gender: 'Female', style: 'Smooth' },
  { name: 'Erinome',       gender: 'Female', style: 'Clear' },
  { name: 'Algenib',       gender: 'Male',   style: 'Gravelly' },
  { name: 'Rasalgethi',    gender: 'Male',   style: 'Informational' },
  { name: 'Laomedeia',     gender: 'Female', style: 'Upbeat' },
  { name: 'Achernar',      gender: 'Female', style: 'Soft' },
  { name: 'Alnilam',       gender: 'Male',   style: 'Firm' },
  { name: 'Schedar',       gender: 'Male',   style: 'Even' },
  { name: 'Gacrux',        gender: 'Female', style: 'Mature' },
  { name: 'Pulcherrima',   gender: 'Female', style: 'Forward' },
  { name: 'Achird',        gender: 'Male',   style: 'Friendly' },
  { name: 'Zubenelgenubi', gender: 'Male',   style: 'Casual' },
  { name: 'Vindemiatrix',  gender: 'Female', style: 'Gentle' },
  { name: 'Sadachbia',     gender: 'Male',   style: 'Lively' },
  { name: 'Sadaltager',    gender: 'Male',   style: 'Knowledgeable' },
  { name: 'Sulafat',       gender: 'Female', style: 'Warm' },
];

// ─────────────────── Duration options ───────────────────
const DURATION_OPTIONS = [
  { value: 30,  label: '30 seconds' },
  { value: 60,  label: '1 minute'   },
  { value: 120, label: '2 minutes'  },
  { value: 180, label: '3 minutes'  },
  { value: 300, label: '5 minutes'  },
];

// ─────────────────── Shared UI components ───────────────────
function StepBadge({ num, active, done }: { num: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-500 ${
      done    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
      : active ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40'
               : 'bg-white/10 text-gray-500'
    }`}>
      {done ? '✓' : num}
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 ${className}`}>
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
    <div className="flex gap-3 items-start p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.268 16A2 2 0 005.07 19z" />
      </svg>
      <span className="whitespace-pre-wrap break-all">{message}</span>
    </div>
  );
}

// A model <select> that always renders as a dropdown.
// If loading → disabled with spinner label.
// If error   → disabled, with red border; error shown separately.
// If empty   → disabled with "No models found" option.
function ModelSelect({
  id, label, value, onChange, models, loading, error, accentColor = 'violet',
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  models: string[]; loading: boolean; error?: string; accentColor?: 'violet' | 'fuchsia' | 'sky';
}) {
  const ringMap = { violet: 'focus:ring-violet-500/60', fuchsia: 'focus:ring-fuchsia-500/60', sky: 'focus:ring-sky-500/60' };
  const borderMap = { violet: 'border-white/10', fuchsia: 'border-white/10', sky: 'border-white/10' };
  const errorBorder = error ? 'border-red-500/50' : borderMap[accentColor];

  return (
    <div>
      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || !!error || models.length === 0}
        className={`w-full bg-black/30 border ${errorBorder} text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${ringMap[accentColor]} transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
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

function VoiceSelect({ id, label, value, onChange }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
}) {
  const selected = VOICE_OPTIONS.find((v) => v.name === value);
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5" htmlFor={id}>{label}</label>
      <select
        id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
      >
        {VOICE_OPTIONS.map((v) => (
          <option key={v.name} value={v.name}>
            {v.gender === 'Female' ? '♀' : '♂'} {v.name} — {v.style}
          </option>
        ))}
      </select>
      {selected && (
        <p className="mt-1.5 text-xs text-gray-500">
          <span className={`font-semibold ${selected.gender === 'Female' ? 'text-pink-400' : 'text-sky-400'}`}>
            {selected.gender}
          </span>{' '}· {selected.style}
        </p>
      )}
    </div>
  );
}

// ─────────────────── Main Page ───────────────────
export default function GeminiTestPage() {
  // Models
  const [textModels, setTextModels]   = useState<string[]>([]);
  const [audioModels, setAudioModels] = useState<string[]>([]);
  const [imageModels, setImageModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError,   setModelsError]   = useState<string | null>(null);

  // Step 1 config
  const [langValue, setLangValue]               = useState('en-US');
  const [selectedTextModel,  setSelectedTextModel]  = useState('');
  const [selectedAudioModel, setSelectedAudioModel] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState('');
  const [voice1, setVoice1] = useState('Kore');
  const [voice2, setVoice2] = useState('Puck');

  // Target audio duration for dialogue generation
  const [durationSecs, setDurationSecs] = useState(60);

  // Step 2 – Dialogue
  const [scenarioSeed,   setScenarioSeed]   = useState('');
  const [dialogueTitle,  setDialogueTitle]  = useState('');
  const [dialogueLines,  setDialogueLines]  = useState<DialogueLine[]>([]);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [dialogueError,   setDialogueError]   = useState<string | null>(null);

  // Step 3 – Audio
  const [audioBase64,   setAudioBase64]   = useState<string | null>(null);
  const [audioLoading,  setAudioLoading]  = useState(false);
  const [audioError,    setAudioError]    = useState<string | null>(null);

  // Step 4 – Image
  const [imageBase64,   setImageBase64]   = useState<string | null>(null);
  const [imageMime,     setImageMime]     = useState('image/png');
  const [imageLoading,  setImageLoading]  = useState(false);
  const [imageError,    setImageError]    = useState<string | null>(null);

  const step1Done = !!(selectedTextModel && selectedAudioModel && selectedImageModel);
  const step2Done = dialogueLines.length > 0;
  const activeStep = !step1Done ? 1 : !step2Done ? 2 : 3;

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.value === langValue) ?? LANGUAGE_OPTIONS[0];

  // Track when prefs have been restored so saves don't overwrite them prematurely
  const prefsLoaded = useRef(false);
  const STORAGE_KEY = 'gemini-studio-prefs';

  // 1. Restore language + voice prefs immediately on mount (model prefs handled after fetch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Record<string, string>;
        if (p.langValue && LANGUAGE_OPTIONS.some((l) => l.value === p.langValue)) setLangValue(p.langValue);
        if (p.voice1 && VOICE_OPTIONS.some((v) => v.name === p.voice1)) setVoice1(p.voice1);
        if (p.voice2 && VOICE_OPTIONS.some((v) => v.name === p.voice2)) setVoice2(p.voice2);
        if (p.durationSecs && DURATION_OPTIONS.some((d) => d.value === Number(p.durationSecs))) setDurationSecs(Number(p.durationSecs));
      }
    } catch { /* ignore corrupted storage */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Save all prefs whenever they change (skip the very first render before prefs are loaded)
  useEffect(() => {
    if (!prefsLoaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        langValue, voice1, voice2, durationSecs,
        selectedTextModel, selectedAudioModel, selectedImageModel,
      }));
    } catch { /* quota exceeded etc */ }
  }, [langValue, voice1, voice2, durationSecs, selectedTextModel, selectedAudioModel, selectedImageModel]);

  // 3. Fetch models; restore saved model selections if they're still in the list
  useEffect(() => {
    (async () => {
      setModelsLoading(true);
      setModelsError(null);
      const res = await listModelsAction();
      setModelsLoading(false);
      if (!res.success) {
        setModelsError(res.error);
        return;
      }
      setTextModels(res.textModels);
      setAudioModels(res.audioModels);
      setImageModels(res.imageModels);

      // Restore saved model prefs (if still valid), otherwise use first available
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) as Record<string, string> : {};
        setSelectedTextModel(
          (saved.selectedTextModel && res.textModels.includes(saved.selectedTextModel))
            ? saved.selectedTextModel : res.textModels[0] ?? ''
        );
        setSelectedAudioModel(
          (saved.selectedAudioModel && res.audioModels.includes(saved.selectedAudioModel))
            ? saved.selectedAudioModel : res.audioModels[0] ?? ''
        );
        setSelectedImageModel(
          (saved.selectedImageModel && res.imageModels.includes(saved.selectedImageModel))
            ? saved.selectedImageModel : res.imageModels[0] ?? ''
        );
      } catch {
        if (res.textModels[0])  setSelectedTextModel(res.textModels[0]);
        if (res.audioModels[0]) setSelectedAudioModel(res.audioModels[0]);
        if (res.imageModels[0]) setSelectedImageModel(res.imageModels[0]);
      }

      prefsLoaded.current = true; // now safe to start saving
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 2: generate dialogue
  const handleGenerateDialogue = useCallback(async () => {
    setDialogueLoading(true);
    setDialogueError(null);
    setDialogueLines([]);
    setDialogueTitle('');
    setAudioBase64(null);
    setImageBase64(null);

    const res = await generateDialogueAction({
      languageLabel: currentLang.label.replace(/^.+?\s/, ''),
      accentInstruction: currentLang.accentInstruction,
      scenario: scenarioSeed || undefined,
      textModel: selectedTextModel,
      targetDurationSecs: durationSecs,
    });

    setDialogueLoading(false);
    if (res.success) {
      setDialogueTitle(res.title);
      setDialogueLines(res.lines);
    } else {
      setDialogueError(res.error);
    }
  }, [currentLang, scenarioSeed, selectedTextModel, durationSecs]);

  // Step 3: generate audio
  const handleGenerateAudio = useCallback(async () => {
    if (!step2Done) return;
    setAudioLoading(true);
    setAudioError(null);
    setAudioBase64(null);

    const res = await generateAudioAction({
      lines: dialogueLines,
      accentInstruction: currentLang.accentInstruction,
      audioModel: selectedAudioModel,
      voice1, voice2,
    });

    setAudioLoading(false);
    if (res.success) setAudioBase64(res.audioBase64);
    else setAudioError(res.error);
  }, [dialogueLines, currentLang, selectedAudioModel, voice1, voice2, step2Done]);

  // Step 4: generate image
  const handleGenerateImage = useCallback(async () => {
    if (!step2Done) return;
    setImageLoading(true);
    setImageError(null);
    setImageBase64(null);

    const res = await generateImageAction({
      title: dialogueTitle,
      lines: dialogueLines,
      languageLabel: currentLang.label.replace(/^.+?\s/, ''),
      imageModel: selectedImageModel,
    });

    setImageLoading(false);
    if (res.success) {
      setImageBase64(res.imageBase64);
      setImageMime(res.mimeType);
    } else {
      setImageError(res.error);
    }
  }, [dialogueTitle, dialogueLines, currentLang, selectedImageModel, step2Done]);

  const audioSrc = audioBase64 ? `data:audio/wav;base64,${audioBase64}` : null;
  const imageSrc = imageBase64 ? `data:${imageMime};base64,${imageBase64}` : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,80,255,0.25),transparent)] bg-gray-950 text-white font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12 pb-24 space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 tracking-widest uppercase">
            Internal Dev Tool
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
            Gemini Dialogue Studio
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Generate multi-speaker conversational dialogues, audio, and illustration scenes — powered by Gemini.
          </p>
        </div>

        {/* ─── STEP 1 ─── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge num={1} active={activeStep === 1} done={step1Done} />
            <h2 className="text-lg font-semibold">Language &amp; Models</h2>
          </div>

          {/* Model load error — shown once, at top of step 1 */}
          {!modelsLoading && modelsError && (
            <ErrorBanner message={`Could not load model list: ${modelsError}`} />
          )}

          <GlassCard className="grid md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              {/* Language (single unified list) */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2" htmlFor="language-select">
                  Language
                </label>
                <select
                  id="language-select"
                  value={langValue}
                  onChange={(e) => setLangValue(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all"
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              <ModelSelect
                id="text-model-select" label="Text Generation Model"
                value={selectedTextModel} onChange={setSelectedTextModel}
                models={textModels} loading={modelsLoading} error={modelsError ?? undefined}
                accentColor="violet"
              />

              <ModelSelect
                id="audio-model-select" label="Audio / TTS Model"
                value={selectedAudioModel} onChange={setSelectedAudioModel}
                models={audioModels} loading={modelsLoading} error={modelsError ?? undefined}
                accentColor="fuchsia"
              />

              <ModelSelect
                id="image-model-select" label="Image Generation Model"
                value={selectedImageModel} onChange={setSelectedImageModel}
                models={imageModels} loading={modelsLoading} error={modelsError ?? undefined}
                accentColor="sky"
              />
            </div>

            {/* Right column – Voices */}
            <div className="space-y-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Voice Assignment</p>
              <VoiceSelect id="voice1-select" label="Speaker 1 Voice" value={voice1} onChange={setVoice1} />
              <VoiceSelect id="voice2-select" label="Speaker 2 Voice" value={voice2} onChange={setVoice2} />
              <div className="pt-2 rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs text-gray-500 mb-1">♀ = Female &nbsp;·&nbsp; ♂ = Male</p>
                <a href="https://aistudio.google.com/generate-speech" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-violet-400 hover:underline">
                  Preview all voices at AI Studio ↗
                </a>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* ─── STEP 2 ─── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge num={2} active={activeStep === 2} done={step2Done} />
            <h2 className="text-lg font-semibold">Generate Dialogue</h2>
          </div>

          <GlassCard className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2" htmlFor="scenario-input">
                Scenario Seed <span className="normal-case text-gray-600">(optional — leave blank for random)</span>
              </label>
              <input
                id="scenario-input" type="text" value={scenarioSeed}
                onChange={(e) => setScenarioSeed(e.target.value)}
                placeholder="e.g. Two friends running into each other at an airport…"
                disabled={!step1Done}
                className="w-full bg-black/30 border border-white/10 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all disabled:opacity-40"
              />
            </div>

            {/* Duration picker */}
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2" htmlFor="duration-select">
                Target Audio Length
              </label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    id={`duration-${opt.value}`}
                    type="button"
                    disabled={!step1Done}
                    onClick={() => setDurationSecs(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 ${
                      durationSecs === opt.value
                        ? 'bg-violet-600/40 border-violet-500/60 text-violet-200 shadow-sm shadow-violet-500/20'
                        : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="generate-dialogue-btn"
              onClick={handleGenerateDialogue}
              disabled={!step1Done || dialogueLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-semibold text-sm shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {dialogueLoading ? <SpinnerIcon /> : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
              {dialogueLoading ? 'Generating…' : 'Generate Random Dialogue'}
            </button>

            {dialogueError && <ErrorBanner message={dialogueError} />}

            {dialogueLines.length > 0 && (
              <div className="space-y-3">
                {/* Title */}
                {dialogueTitle && (
                  <div className="px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-xs text-violet-400 uppercase tracking-widest mb-1">Title</p>
                    <p className="text-white font-semibold text-lg">{dialogueTitle}</p>
                  </div>
                )}

                <p className="text-xs text-gray-500 uppercase tracking-wider">Script</p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {dialogueLines.map((line, i) => (
                    <div key={i} className={`flex gap-3 items-start ${line.speaker === 'Speaker2' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                        line.speaker === 'Speaker1' ? 'bg-violet-600/40 text-violet-200' : 'bg-fuchsia-600/40 text-fuchsia-200'
                      }`}>
                        {line.speaker === 'Speaker1' ? 'A' : 'B'}
                      </div>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        line.speaker === 'Speaker1'
                          ? 'bg-violet-600/20 border border-violet-500/20 rounded-tl-sm'
                          : 'bg-fuchsia-600/20 border border-fuchsia-500/20 rounded-tr-sm'
                      }`}>
                        {line.text}
                      </div>
                    </div>
                  ))}
                </div>

                <details>
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300 transition-colors select-none">
                    ✏️ Edit raw JSON…
                  </summary>
                  <textarea
                    className="mt-2 w-full bg-black/40 border border-white/10 text-gray-300 font-mono text-xs rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-y"
                    rows={8}
                    value={JSON.stringify(dialogueLines, null, 2)}
                    onChange={(e) => {
                      try { setDialogueLines(JSON.parse(e.target.value)); } catch { /* ignore mid-type */ }
                    }}
                  />
                </details>
              </div>
            )}
          </GlassCard>
        </section>

        {/* ─── STEP 3: Audio + Step 4: Image ─── side by side on large screens */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* STEP 3 – Audio */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <StepBadge num={3} active={step2Done && !audioBase64} done={!!audioBase64} />
              <h2 className="text-lg font-semibold">Generate Audio</h2>
            </div>

            <GlassCard className="space-y-4 h-full">
              <p className="text-sm text-gray-400">
                Model:{' '}
                <span className="font-mono text-fuchsia-300">
                  {selectedAudioModel ? selectedAudioModel.replace('models/', '') : '—'}
                </span>
              </p>

              <button
                id="generate-audio-btn"
                onClick={handleGenerateAudio}
                disabled={!step2Done || audioLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 font-semibold text-sm shadow-lg shadow-fuchsia-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {audioLoading ? <SpinnerIcon /> : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 18.364C8.5 18.364 5 15.5 5 12s3.5-6.364 7-6.364M19.07 4.929a9 9 0 010 12.728" />
                  </svg>
                )}
                {audioLoading ? 'Generating…' : 'Generate Audio'}
              </button>

              {audioError && <ErrorBanner message={audioError} />}

              {audioSrc && (
                <div className="space-y-3 p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">✓ Audio Ready</p>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio controls src={audioSrc} className="w-full rounded-lg" />
                  <button
                    id="download-audio-btn"
                    onClick={() => { const a = document.createElement('a'); a.href = audioSrc; a.download = 'dialogue.wav'; a.click(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/20 text-sm transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download .wav
                  </button>
                </div>
              )}
            </GlassCard>
          </section>

          {/* STEP 4 – Image */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <StepBadge num={4} active={step2Done && !imageSrc} done={!!imageSrc} />
              <h2 className="text-lg font-semibold">Generate Image</h2>
            </div>

            <GlassCard className="space-y-4 h-full">
              <p className="text-sm text-gray-400">
                Model:{' '}
                <span className="font-mono text-sky-300">
                  {selectedImageModel ? selectedImageModel.replace('models/', '') : '—'}
                </span>
              </p>

              <button
                id="generate-image-btn"
                onClick={handleGenerateImage}
                disabled={!step2Done || imageLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 font-semibold text-sm shadow-lg shadow-sky-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {imageLoading ? <SpinnerIcon /> : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {imageLoading ? 'Generating…' : 'Generate Scene Image'}
              </button>

              {imageError && <ErrorBanner message={imageError} />}

              {imageSrc && (
                <div className="space-y-3 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">✓ Image Ready</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc} alt={dialogueTitle || 'Generated scene'} className="w-full rounded-xl object-cover" />
                  <button
                    id="download-image-btn"
                    onClick={() => { const a = document.createElement('a'); a.href = imageSrc; a.download = 'scene.png'; a.click(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-sky-500/40 text-sky-300 hover:bg-sky-500/20 text-sm transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download image
                  </button>
                </div>
              )}
            </GlassCard>
          </section>

        </div>
      </div>
    </main>
  );
}
