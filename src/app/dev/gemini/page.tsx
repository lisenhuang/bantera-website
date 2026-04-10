'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listModelsAction,
  generateDialogueAction,
  generateAudioAction,
  generateImageAction,
  transcribeAudioCuesAction,
  type DialogueLine,
  type TranscriptionCueSegment,
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

// ─────────────────── Scenario presets ───────────────────
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

// ─────────────────── Theme ───────────────────
type Theme = 'system' | 'dark' | 'light';

// ─────────────────── Shared UI components ───────────────────
function StepBadge({ num, active, done }: { num: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-500 ${
      done    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
      : active ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40'
               : 'bg-gray-200 dark:bg-white/10 text-gray-500'
    }`}>
      {done ? '✓' : num}
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-xl p-6 ${className}`}>
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
    <div className="flex gap-3 items-start p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-300 text-sm">
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.268 16A2 2 0 005.07 19z" />
      </svg>
      <span className="whitespace-pre-wrap break-all">{message}</span>
    </div>
  );
}

function ModelSelect({
  id, label, value, onChange, models, loading, error, accentColor = 'violet',
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  models: string[]; loading: boolean; error?: string;   accentColor?: 'violet' | 'fuchsia' | 'sky' | 'emerald';
}) {
  const ringMap = {
    violet: 'focus:ring-violet-500/60',
    fuchsia: 'focus:ring-fuchsia-500/60',
    sky: 'focus:ring-sky-500/60',
    emerald: 'focus:ring-emerald-500/60',
  };
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

function VoiceSelect({ id, label, value, onChange }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
}) {
  const selected = VOICE_OPTIONS.find((v) => v.name === value);
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5" htmlFor={id}>{label}</label>
      <select
        id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
      >
        {VOICE_OPTIONS.map((v) => (
          <option key={v.name} value={v.name}>
            {v.gender === 'Female' ? '♀' : '♂'} {v.name} — {v.style}
          </option>
        ))}
      </select>
      {selected && (
        <p className="mt-1.5 text-xs text-gray-500">
          <span className={`font-semibold ${selected.gender === 'Female' ? 'text-pink-500' : 'text-sky-500'}`}>
            {selected.gender}
          </span>{' '}· {selected.style}
        </p>
      )}
    </div>
  );
}

// ─────────────────── Theme toggle ───────────────────
const THEME_OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: 'system', icon: '💻', label: 'System' },
  { value: 'light',  icon: '☀️',  label: 'Light'  },
  { value: 'dark',   icon: '🌙',  label: 'Dark'   },
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

// ─────────────────── Main Page ───────────────────
export default function GeminiTestPage() {
  // Models
  const [textModels, setTextModels]   = useState<string[]>([]);
  const [audioModels, setAudioModels] = useState<string[]>([]);
  const [imageModels, setImageModels] = useState<string[]>([]);
  const [transcriptionModels, setTranscriptionModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError,   setModelsError]   = useState<string | null>(null);

  // Step 1 config
  const [langValue, setLangValue]               = useState('en-US');
  const [selectedTextModel,  setSelectedTextModel]  = useState('');
  const [selectedAudioModel, setSelectedAudioModel] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState('');
  const [selectedTranscriptionModel, setSelectedTranscriptionModel] = useState('');
  const [voice1, setVoice1] = useState('Kore');
  const [voice2, setVoice2] = useState('Puck');
  const [durationSecs, setDurationSecs] = useState(60);

  // Theme
  const [theme, setTheme] = useState<Theme>('system');

  // Step 2 – Dialogue
  const [selectedScenario, setSelectedScenario] = useState<string>('');   // '__custom__' = custom input chosen
  const [customScenarioText, setCustomScenarioText] = useState('');
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
  const [imagePrompt,   setImagePrompt]   = useState<string | null>(null);
  const [imageLoading,  setImageLoading]  = useState(false);
  const [imageError,    setImageError]    = useState<string | null>(null);

  // Step 5 – Time-based transcription cues
  const [cueSegments, setCueSegments] = useState<TranscriptionCueSegment[] | null>(null);
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const step1Done = !!(selectedTextModel && selectedAudioModel && selectedImageModel);
  const step2Done = dialogueLines.length > 0;
  const activeStep = !step1Done ? 1 : !step2Done ? 2 : 3;
  const currentLang = LANGUAGE_OPTIONS.find((l) => l.value === langValue) ?? LANGUAGE_OPTIONS[0];

  const prefsLoaded = useRef(false);
  const STORAGE_KEY = 'gemini-studio-prefs';

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
      // system
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyDark(mq.matches);
      const listener = (e: MediaQueryListEvent) => applyDark(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [theme]);

  // 1. Restore prefs on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Record<string, string>;
        if (p.langValue && LANGUAGE_OPTIONS.some((l) => l.value === p.langValue)) setLangValue(p.langValue);
        if (p.voice1 && VOICE_OPTIONS.some((v) => v.name === p.voice1)) setVoice1(p.voice1);
        if (p.voice2 && VOICE_OPTIONS.some((v) => v.name === p.voice2)) setVoice2(p.voice2);
        if (p.durationSecs && DURATION_OPTIONS.some((d) => d.value === Number(p.durationSecs))) setDurationSecs(Number(p.durationSecs));
        if (p.theme && ['system','dark','light'].includes(p.theme)) setTheme(p.theme as Theme);
      }
    } catch { /* ignore corrupted storage */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Save prefs on change
  useEffect(() => {
    if (!prefsLoaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        langValue, voice1, voice2, durationSecs, theme,
        selectedTextModel, selectedAudioModel, selectedImageModel, selectedTranscriptionModel,
      }));
    } catch { /* quota exceeded etc */ }
  }, [langValue, voice1, voice2, durationSecs, theme, selectedTextModel, selectedAudioModel, selectedImageModel, selectedTranscriptionModel]);

  // 3. Fetch models; restore saved model selections
  useEffect(() => {
    (async () => {
      setModelsLoading(true);
      setModelsError(null);
      const res = await listModelsAction();
      setModelsLoading(false);
      if (!res.success) { setModelsError(res.error); return; }
      setTextModels(res.textModels);
      setAudioModels(res.audioModels);
      setImageModels(res.imageModels);
      setTranscriptionModels(res.transcriptionModels);
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) as Record<string, string> : {};
        setSelectedTextModel((saved.selectedTextModel && res.textModels.includes(saved.selectedTextModel)) ? saved.selectedTextModel : res.textModels[0] ?? '');
        setSelectedAudioModel((saved.selectedAudioModel && res.audioModels.includes(saved.selectedAudioModel)) ? saved.selectedAudioModel : res.audioModels[0] ?? '');
        setSelectedImageModel((saved.selectedImageModel && res.imageModels.includes(saved.selectedImageModel)) ? saved.selectedImageModel : res.imageModels[0] ?? '');
        setSelectedTranscriptionModel(
          (saved.selectedTranscriptionModel && res.transcriptionModels.includes(saved.selectedTranscriptionModel))
            ? saved.selectedTranscriptionModel
            : res.transcriptionModels[0] ?? '',
        );
      } catch {
        if (res.textModels[0])  setSelectedTextModel(res.textModels[0]);
        if (res.audioModels[0]) setSelectedAudioModel(res.audioModels[0]);
        if (res.imageModels[0]) setSelectedImageModel(res.imageModels[0]);
        if (res.transcriptionModels[0]) setSelectedTranscriptionModel(res.transcriptionModels[0]);
      }
      prefsLoaded.current = true;
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
    setCueSegments(null);
    setTranscriptionError(null);
    const res = await generateDialogueAction({
      languageLabel: currentLang.label.replace(/^.+?\s/, ''),
      accentInstruction: currentLang.accentInstruction,
      scenario: selectedScenario === '__custom__' ? (customScenarioText || undefined)
               : selectedScenario || undefined,
      textModel: selectedTextModel,
      targetDurationSecs: durationSecs,
    });
    setDialogueLoading(false);
    if (res.success) { setDialogueTitle(res.title); setDialogueLines(res.lines); }
    else setDialogueError(res.error);
  }, [currentLang, selectedScenario, customScenarioText, selectedTextModel, durationSecs]);

  // Step 3: generate audio
  const handleGenerateAudio = useCallback(async () => {
    if (!step2Done) return;
    setAudioLoading(true); setAudioError(null); setAudioBase64(null);
    setCueSegments(null); setTranscriptionError(null);
    const res = await generateAudioAction({ lines: dialogueLines, accentInstruction: currentLang.accentInstruction, audioModel: selectedAudioModel, voice1, voice2 });
    setAudioLoading(false);
    if (res.success) setAudioBase64(res.audioBase64);
    else setAudioError(res.error);
  }, [dialogueLines, currentLang, selectedAudioModel, voice1, voice2, step2Done]);

  // Step 4: generate image
  const handleGenerateImage = useCallback(async () => {
    if (!step2Done) return;
    setImageLoading(true); setImageError(null); setImageBase64(null); setImagePrompt(null);
    const res = await generateImageAction({ title: dialogueTitle, lines: dialogueLines, languageLabel: currentLang.label.replace(/^.+?\s/, ''), imageModel: selectedImageModel });
    setImageLoading(false);
    if (res.success) { setImageBase64(res.imageBase64); setImageMime(res.mimeType); setImagePrompt(res.imagePrompt); }
    else setImageError(res.error);
  }, [dialogueTitle, dialogueLines, currentLang, selectedImageModel, step2Done]);

  const handleTranscribeCues = useCallback(async () => {
    if (!audioBase64 || !selectedTranscriptionModel) return;
    setTranscriptionLoading(true);
    setTranscriptionError(null);
    const res = await transcribeAudioCuesAction({
      audioBase64,
      mimeType: 'audio/wav',
      transcriptionModel: selectedTranscriptionModel,
    });
    setTranscriptionLoading(false);
    if (res.success) setCueSegments(res.cues.segments);
    else setTranscriptionError(res.error);
  }, [audioBase64, selectedTranscriptionModel]);

  const audioSrc = audioBase64 ? `data:audio/wav;base64,${audioBase64}` : null;
  const imageSrc = imageBase64 ? `data:${imageMime};base64,${imageBase64}` : null;

  // Preview of what will be sent to the image model — computed client-side from dialogue state
  const imagePromptPreview = step2Done
    ? `Create a vivid, illustrative scene for a language learning dialogue called "${dialogueTitle}". The dialogue is in ${currentLang.label.replace(/^.+?\s/, '')}. The conversation is about: ${dialogueLines.slice(0, 4).map((l) => l.text).join(' ')}. Style: warm, editorial illustration, suitable for a language learning app. No text or speech bubbles.`
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:bg-none dark:bg-gray-950 text-gray-900 dark:text-white font-sans transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-12 pb-24 space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 text-center space-y-3">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/30 tracking-widest uppercase">
              Internal Dev Tool
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 dark:from-violet-300 dark:via-fuchsia-300 dark:to-pink-300 bg-clip-text text-transparent">
              Gemini Dialogue Studio
            </h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Generate multi-speaker dialogues, audio, scene images, and time-based transcription cues — powered by Gemini.
            </p>
          </div>
          <div className="shrink-0 pt-1">
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </div>

        {/* ─── STEP 1 ─── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge num={1} active={activeStep === 1} done={step1Done} />
            <h2 className="text-lg font-semibold">Languages</h2>
          </div>
          {!modelsLoading && modelsError && (
            <ErrorBanner message={`Could not load model list: ${modelsError}`} />
          )}
          <GlassCard className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2" htmlFor="language-select">
                  Language
                </label>
                <select
                  id="language-select" value={langValue} onChange={(e) => setLangValue(e.target.value)}
                  className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all"
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <ModelSelect id="text-model-select"  label="Text Generation Model"  value={selectedTextModel}  onChange={setSelectedTextModel}  models={textModels}  loading={modelsLoading} error={modelsError ?? undefined} accentColor="violet" />
              <ModelSelect id="audio-model-select" label="Audio / TTS Model"      value={selectedAudioModel} onChange={setSelectedAudioModel} models={audioModels} loading={modelsLoading} error={modelsError ?? undefined} accentColor="fuchsia" />
              <ModelSelect id="image-model-select" label="Image Generation Model" value={selectedImageModel} onChange={setSelectedImageModel} models={imageModels} loading={modelsLoading} error={modelsError ?? undefined} accentColor="sky" />
            </div>
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Voice Assignment</p>
              <VoiceSelect id="voice1-select" label="Speaker 1 Voice" value={voice1} onChange={setVoice1} />
              <VoiceSelect id="voice2-select" label="Speaker 2 Voice" value={voice2} onChange={setVoice2} />
              <div className="pt-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4">
                <p className="text-xs text-gray-500 mb-1">♀ = Female &nbsp;·&nbsp; ♂ = Male</p>
                <a href="https://aistudio.google.com/generate-speech" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-violet-500 dark:text-violet-400 hover:underline">
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
            {/* Scenario picker */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
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
                          ? 'bg-violet-100 dark:bg-violet-600/30 border-violet-400 dark:border-violet-500/60 text-violet-700 dark:text-violet-200 font-medium'
                          : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-violet-300 dark:hover:border-white/30 hover:text-gray-800 dark:hover:text-white'
                      }`}
                    >
                      <span className="text-base shrink-0">{s.emoji}</span>
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* Custom input — shown when "Custom…" is selected */}
              {selectedScenario === '__custom__' && (
                <textarea
                  id="scenario-custom-input"
                  rows={2}
                  autoFocus
                  value={customScenarioText}
                  onChange={(e) => setCustomScenarioText(e.target.value)}
                  placeholder="Describe your scenario…"
                  className="mt-3 w-full bg-white dark:bg-black/30 border border-violet-300 dark:border-violet-500/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all resize-none"
                />
              )}
              {/* Preview of selected preset */}
              {selectedScenario && selectedScenario !== '__custom__' && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 italic pl-1">{selectedScenario}</p>
              )}
            </div>

            {/* Duration picker */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Target Audio Length
              </label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value} type="button" disabled={!step1Done}
                    onClick={() => setDurationSecs(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 ${
                      durationSecs === opt.value
                        ? 'bg-violet-600/20 dark:bg-violet-600/40 border-violet-500/60 text-violet-700 dark:text-violet-200 shadow-sm shadow-violet-500/20'
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
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
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
                {dialogueTitle && (
                  <div className="px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-xs text-violet-500 dark:text-violet-400 uppercase tracking-widest mb-1">Title</p>
                    <p className="text-gray-800 dark:text-white font-semibold text-lg">{dialogueTitle}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 uppercase tracking-wider">Script</p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {dialogueLines.map((line, i) => (
                    <div key={i} className={`flex gap-3 items-start ${line.speaker === 'Speaker2' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                        line.speaker === 'Speaker1' ? 'bg-violet-600/30 text-violet-700 dark:text-violet-200' : 'bg-fuchsia-600/30 text-fuchsia-700 dark:text-fuchsia-200'
                      }`}>
                        {line.speaker === 'Speaker1' ? 'A' : 'B'}
                      </div>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        line.speaker === 'Speaker1'
                          ? 'bg-violet-100 dark:bg-violet-600/20 border border-violet-200 dark:border-violet-500/20 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                          : 'bg-fuchsia-100 dark:bg-fuchsia-600/20 border border-fuchsia-200 dark:border-fuchsia-500/20 text-gray-800 dark:text-gray-100 rounded-tr-sm'
                      }`}>
                        {line.text}
                      </div>
                    </div>
                  ))}
                </div>
                <details>
                  <summary className="cursor-pointer text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors select-none">
                    ✏️ Edit raw JSON…
                  </summary>
                  <textarea
                    className="mt-2 w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-mono text-xs rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-y"
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

        {/* ─── STEP 3 + 4 side by side ─── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* STEP 3 – Audio */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <StepBadge num={3} active={step2Done && !audioBase64} done={!!audioBase64} />
              <h2 className="text-lg font-semibold">Generate Audio</h2>
            </div>
            <GlassCard className="space-y-4 h-full">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Model: <span className="font-mono text-fuchsia-600 dark:text-fuchsia-300">{selectedAudioModel ? selectedAudioModel.replace('models/', '') : '—'}</span>
              </p>
              <button
                id="generate-audio-btn" onClick={handleGenerateAudio} disabled={!step2Done || audioLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-semibold text-sm shadow-lg shadow-fuchsia-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
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
                <div className="space-y-3 p-4 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 border border-fuchsia-200 dark:border-fuchsia-500/20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-300">✓ Audio Ready</p>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio controls src={audioSrc} className="w-full rounded-lg" />
                  <button
                    id="download-audio-btn"
                    onClick={() => { const a = document.createElement('a'); a.href = audioSrc; a.download = 'dialogue.wav'; a.click(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-fuchsia-300 dark:border-fuchsia-500/40 text-fuchsia-600 dark:text-fuchsia-300 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-500/20 text-sm transition-all"
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Model: <span className="font-mono text-sky-600 dark:text-sky-300">{selectedImageModel ? selectedImageModel.replace('models/', '') : '—'}</span>
              </p>
              <button
                id="generate-image-btn" onClick={handleGenerateImage} disabled={!step2Done || imageLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {imageLoading ? <SpinnerIcon /> : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {imageLoading ? 'Generating…' : 'Generate Scene Image'}
              </button>
              {imageError && <ErrorBanner message={imageError} />}
              {/* Prompt preview — shown as soon as dialogue exists */}
              {imagePromptPreview && !imageSrc && (
                <div className="rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 px-4 py-3 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-500 dark:text-sky-400">Image prompt preview</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{imagePromptPreview}</p>
                </div>
              )}
              {imageSrc && (
                <div className="space-y-3 p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-300">✓ Image Ready</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc} alt={dialogueTitle || 'Generated scene'} className="w-full rounded-xl object-cover" />
                  {/* After generation, collapse prompt into a toggle */}
                  {imagePrompt && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs text-sky-500 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-200 transition-colors select-none list-none flex items-center gap-1">
                        <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        Image prompt used
                      </summary>
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-sky-100/50 dark:bg-black/20 rounded-xl px-3 py-2.5 leading-relaxed border border-sky-200 dark:border-white/5">{imagePrompt}</p>
                    </details>
                  )}
                  <button
                    id="download-image-btn"
                    onClick={() => { const a = document.createElement('a'); a.href = imageSrc; a.download = 'scene.png'; a.click(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-sky-300 dark:border-sky-500/40 text-sky-600 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sm transition-all"
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

        {/* ─── STEP 5 ─── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge
              num={5}
              active={!!audioBase64 && !cueSegments?.length && !transcriptionLoading}
              done={!!cueSegments && cueSegments.length > 0}
            />
            <h2 className="text-lg font-semibold">Time-based transcription cues</h2>
          </div>
          <GlassCard className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sends the Step 3 audio to Gemini for transcription with <span className="font-medium text-gray-700 dark:text-gray-300">start/end times</span> per line (JSON).
            </p>
            <ModelSelect
              id="transcription-model-select"
              label="Transcription model"
              value={selectedTranscriptionModel}
              onChange={setSelectedTranscriptionModel}
              models={transcriptionModels}
              loading={modelsLoading}
              error={modelsError ?? undefined}
              accentColor="emerald"
            />
            <button
              id="generate-transcription-cues-btn"
              type="button"
              onClick={handleTranscribeCues}
              disabled={!audioBase64 || !selectedTranscriptionModel || transcriptionLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {transcriptionLoading ? <SpinnerIcon /> : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {transcriptionLoading ? 'Transcribing…' : 'Generate time-based cues'}
            </button>
            {!audioBase64 && (
              <p className="text-xs text-amber-600 dark:text-amber-400/90">Generate audio in Step 3 first.</p>
            )}
            {transcriptionError && <ErrorBanner message={transcriptionError} />}
            {cueSegments && cueSegments.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-50 dark:bg-emerald-500/10 text-left text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        <th className="px-3 py-2 font-semibold">Start (s)</th>
                        <th className="px-3 py-2 font-semibold">End (s)</th>
                        <th className="px-3 py-2 font-semibold">Speaker</th>
                        <th className="px-3 py-2 font-semibold">Text</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cueSegments.map((row, i) => (
                        <tr key={i} className="border-t border-emerald-100 dark:border-emerald-500/20 text-gray-800 dark:text-gray-200">
                          <td className="px-3 py-2 font-mono text-xs align-top">{typeof row.startSec === 'number' ? row.startSec.toFixed(2) : row.startSec}</td>
                          <td className="px-3 py-2 font-mono text-xs align-top">{typeof row.endSec === 'number' ? row.endSec.toFixed(2) : row.endSec}</td>
                          <td className="px-3 py-2 align-top whitespace-nowrap">{row.speaker}</td>
                          <td className="px-3 py-2 align-top">{row.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(JSON.stringify({ segments: cueSegments }, null, 2));
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 text-sm transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy JSON
                  </button>
                </div>
                <details className="group">
                  <summary className="cursor-pointer text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors select-none">
                    Raw JSON
                  </summary>
                  <pre className="mt-2 p-4 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto max-h-80 overflow-y-auto">
                    {JSON.stringify({ segments: cueSegments }, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </GlassCard>
        </section>

      </div>
    </main>
  );
}
