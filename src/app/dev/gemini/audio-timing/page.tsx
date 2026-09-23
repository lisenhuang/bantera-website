'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import Link from 'next/link';
import { generateAudioAction, generateDialogueAction, listModelsAction } from '../actions';
import { alignWithAiAction, transcribeWordsAction } from './actions';
import {
  alignByCharacters,
  findCoverageIssue,
  mergeMatches,
  findActiveToken,
  formatScript,
  parseScript,
  resolveTimings,
  tokenizeScript,
  type Alignment,
  type ScriptToken,
  type TimedToken,
  type TokenMatch,
  type TranscribedWord,
} from './alignment';

// ─────────────────── Options ───────────────────

type Language = { code: string; label: string; name: string; style: string };

const LANGUAGES: Language[] = [
  { code: 'en-US', label: '🇺🇸 English (US)', name: 'English', style: 'Read this naturally with a US American accent, at a relaxed conversational pace.' },
  { code: 'en-GB', label: '🇬🇧 English (UK)', name: 'British English', style: 'Read this naturally with a British accent, at a relaxed conversational pace.' },
  { code: 'en-AU', label: '🇦🇺 English (Australia)', name: 'Australian English', style: 'Read this naturally with an Australian accent, at a relaxed conversational pace.' },
  { code: 'zh-CN', label: '🇨🇳 Chinese (Mandarin)', name: 'Mandarin Chinese (简体中文)', style: 'Read this naturally in Mandarin Chinese, at a relaxed conversational pace.' },
  { code: 'ja-JP', label: '🇯🇵 Japanese', name: 'Japanese (日本語)', style: 'Read this naturally in Japanese, at a relaxed conversational pace.' },
  { code: 'ko-KR', label: '🇰🇷 Korean', name: 'Korean (한국어)', style: 'Read this naturally in Korean, at a relaxed conversational pace.' },
  { code: 'es-ES', label: '🇪🇸 Spanish', name: 'Spanish (Español)', style: 'Read this naturally in Spanish, at a relaxed conversational pace.' },
  { code: 'fr-FR', label: '🇫🇷 French', name: 'French (Français)', style: 'Read this naturally in French, at a relaxed conversational pace.' },
  { code: 'de-DE', label: '🇩🇪 German', name: 'German (Deutsch)', style: 'Read this naturally in German, at a relaxed conversational pace.' },
  { code: 'it-IT', label: '🇮🇹 Italian', name: 'Italian (Italiano)', style: 'Read this naturally in Italian, at a relaxed conversational pace.' },
  { code: 'pt-BR', label: '🇧🇷 Portuguese (Brazil)', name: 'Brazilian Portuguese (Português)', style: 'Read this naturally in Brazilian Portuguese, at a relaxed conversational pace.' },
];

// Samples include numbers, prices and times on purpose: that is where transcripts and
// scripts disagree most ("$85" vs "85 dollars", "7:30" vs "seven thirty").
const SAMPLES: Record<string, string> = {
  en: `Speaker1: Hey! Did you manage to get tickets for Saturday's concert?
Speaker2: I did, two seats in row 12. They were about $85 each, though.
Speaker1: That's not bad at all. What time does it start?
Speaker2: Doors open at 7:30, so let's meet at the station around seven.`,
  zh: `Speaker1: 你好！周六的演唱会门票你买到了吗？
Speaker2: 买到了，第12排的两个座位，不过每张要850块。
Speaker1: 还不错嘛。几点开始？
Speaker2: 七点半入场，我们七点在地铁站见吧。`,
  ja: `Speaker1: ねえ、土曜日のコンサートのチケット取れた？
Speaker2: うん、12列目の席を2枚取ったよ。1枚8500円だったけどね。
Speaker1: 悪くないね。何時に始まるの？
Speaker2: 開場は7時半だから、7時に駅で待ち合わせしよう。`,
  ko: `Speaker1: 토요일 콘서트 티켓 구했어?
Speaker2: 응, 12번째 줄 두 자리 구했어. 한 장에 85,000원이었어.
Speaker1: 나쁘지 않네. 몇 시에 시작해?
Speaker2: 7시 30분에 입장이니까 7시에 역에서 만나자.`,
  es: `Speaker1: ¡Hola! ¿Conseguiste las entradas para el concierto del sábado?
Speaker2: Sí, dos asientos en la fila 12. Aunque costaron unos 85 euros cada una.
Speaker1: No está nada mal. ¿A qué hora empieza?
Speaker2: Abren las puertas a las 7:30, así que quedamos en la estación a las siete.`,
  fr: `Speaker1: Salut ! Tu as réussi à avoir des billets pour le concert de samedi ?
Speaker2: Oui, deux places au rang 12. Par contre, elles coûtaient environ 85 euros chacune.
Speaker1: C'est pas mal du tout. Ça commence à quelle heure ?
Speaker2: L'ouverture des portes est à 19 h 30, donc on se retrouve à la gare vers sept heures.`,
  de: `Speaker1: Hey! Hast du Karten für das Konzert am Samstag bekommen?
Speaker2: Ja, zwei Plätze in Reihe 12. Die haben allerdings je 85 Euro gekostet.
Speaker1: Das ist gar nicht schlecht. Wann fängt es an?
Speaker2: Einlass ist um 19:30 Uhr, also treffen wir uns gegen sieben am Bahnhof.`,
};

const sampleFor = (code: string) => SAMPLES[code.split('-')[0]];

const VOICES = [
  'Kore ♀', 'Puck ♂', 'Aoede ♀', 'Charon ♂', 'Leda ♀', 'Fenrir ♂', 'Zephyr ♀', 'Orus ♂',
  'Sulafat ♀', 'Achird ♂', 'Despina ♀', 'Iapetus ♂', 'Gacrux ♀', 'Algieba ♂',
].map((label) => ({ value: label.split(' ')[0], label }));

const DEFAULTS = {
  tts: 'gemini-3.1-flash-tts-preview',
  transcribe: 'gemini-3.5-transcribe',
  text: 'gemini-3.5-flash-lite',
};

const SPEEDS = [0.5, 0.75, 1, 1.25];

// ─────────────────── Helpers ───────────────────

type StepName = 'tts' | 'transcribe' | 'align';
type Aligner = 'hybrid' | 'ai' | 'algorithm';

const ALIGNERS: Array<{ value: Aligner; label: string; hint: string }> = [
  { value: 'hybrid', label: 'AI + exact anchors', hint: 'Words heard exactly as written keep their transcript timing; AI fixes only the words that differ.' },
  { value: 'ai', label: 'AI only', hint: 'Every word uses the AI mapping, even where the transcript matched exactly.' },
  { value: 'algorithm', label: 'Algorithm only (no AI)', hint: 'Letter-by-letter alignment; cannot tell that "7:00" and "seven" are the same.' },
];
type StepState = { state: 'idle' | 'running' | 'done' | 'error'; ms?: number; error?: string };
type AudioData = { base64: string; mime: string; label: string };
type Transcript = { text: string; words: TranscribedWord[] };

const IDLE: StepState = { state: 'idle' };

const stripModelPrefix = (name: string) => name.replace(/^models\//, '');
const secs = (s: number) => s.toFixed(2);
const clock = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const round3 = (s: number) => Math.round(s * 1000) / 1000;

/** Ties an AI result to the exact script and transcript it was computed for. */
const signatureOf = (tokens: ScriptToken[], words: TranscribedWord[]) =>
  `${tokens.map((t) => t.text).join('␟')}#${words.length}`;

function findWordAt(words: TranscribedWord[], t: number): number {
  let lo = 0;
  let hi = words.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].endSec <= t) lo = mid + 1;
    else if (words[mid].startSec > t) hi = mid - 1;
    else return mid;
  }
  return -1;
}

function countDisagreements(a: TokenMatch[], b: TokenMatch[]): number {
  let n = 0;
  a.forEach((m, i) => { const o = b[i]; if ((m?.s ?? -1) !== (o?.s ?? -1) || (m?.e ?? -1) !== (o?.e ?? -1)) n++; });
  return n;
}

// ─────────────────── Small UI pieces ───────────────────

const inputClass =
  'w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/60';
const primaryButton =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
const secondaryButton =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] p-5 md:p-6 ${className}`}>
      {children}
    </div>
  );
}

function StepHeader({ num, title, hint, step }: { num: number; title: string; hint: string; step?: StepState }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3">
      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-violet-600 text-white">{num}</span>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      </div>
      {step && <StatusPill step={step} />}
    </div>
  );
}

function StatusPill({ step }: { step: StepState }) {
  if (step.state === 'idle') return null;
  const styles = {
    running: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    error: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  }[step.state];
  const text = step.state === 'running' ? '⏳ Running…' : step.state === 'error' ? '✕ Failed' : `✓ Done · ${((step.ms ?? 0) / 1000).toFixed(1)}s`;
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles}`}>{text}</span>;
}

function ErrorText({ step }: { step: StepState }) {
  if (step.state !== 'error') return null;
  return <p className="mt-3 text-sm text-red-600 dark:text-red-400 break-words whitespace-pre-wrap">{step.error}</p>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ModelSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  const all = options.includes(value) ? options : [value, ...options];
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {all.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </Field>
  );
}

/** Its own animation loop, so ticking the clock never re-renders the transcript. */
function TimeReadout({ audioRef, playing, duration }: { audioRef: RefObject<HTMLAudioElement | null>; playing: boolean; duration: number }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const el = audioRef.current;
    let frame = 0;
    const tick = () => {
      setNow(el?.currentTime ?? 0);
      if (playing) frame = requestAnimationFrame(tick);
    };
    const onSeeked = () => setNow(el?.currentTime ?? 0);
    frame = requestAnimationFrame(tick);
    el?.addEventListener('seeked', onSeeked);
    return () => { cancelAnimationFrame(frame); el?.removeEventListener('seeked', onSeeked); };
  }, [audioRef, playing]);
  return <span className="font-mono text-sm tabular-nums text-gray-600 dark:text-gray-300">{clock(now)} / {clock(duration)}</span>;
}

const STATUS_STYLE: Record<TimedToken['status'], string> = {
  exact: '',
  corrected: 'underline decoration-amber-500 decoration-2 underline-offset-[5px]',
  estimated: 'underline decoration-dotted decoration-gray-400 decoration-2 underline-offset-[5px]',
};

const STATUS_LABEL: Record<TimedToken['status'], string> = {
  exact: 'Heard exactly as written',
  corrected: 'Heard differently; matched to the script',
  estimated: 'Not found in transcript; timing estimated',
};

// ─────────────────── Page ───────────────────

export default function AudioTimingPage() {
  // Script
  const [langCode, setLangCode] = useState('en-US');
  const lang = LANGUAGES.find((l) => l.code === langCode) ?? LANGUAGES[0];
  const [scriptText, setScriptText] = useState(SAMPLES.en);
  const [scriptBusy, setScriptBusy] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Models
  const [ttsModels, setTtsModels] = useState<string[]>([DEFAULTS.tts]);
  const [transcribeModels, setTranscribeModels] = useState<string[]>([DEFAULTS.transcribe]);
  const [textModels, setTextModels] = useState<string[]>([DEFAULTS.text]);
  const [ttsModel, setTtsModel] = useState(DEFAULTS.tts);
  const [transcribeModel, setTranscribeModel] = useState(DEFAULTS.transcribe);
  const [textModel, setTextModel] = useState(DEFAULTS.text);

  // TTS
  const [style, setStyle] = useState(LANGUAGES[0].style);
  const [voice1, setVoice1] = useState('Kore');
  const [voice2, setVoice2] = useState('Puck');

  // Pipeline results
  const [audio, setAudio] = useState<AudioData | null>(null);
  const [duration, setDuration] = useState(0);
  const [useLanguageHint, setUseLanguageHint] = useState(true);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ signature: string; matches: TokenMatch[] } | null>(null);
  const [aligner, setAligner] = useState<Aligner>('hybrid');
  const [steps, setSteps] = useState<Record<StepName, StepState>>({ tts: IDLE, transcribe: IDLE, align: IDLE });

  // Player
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeToken, setActiveToken] = useState(-1);
  const [activeWord, setActiveWord] = useState(-1);
  const [showTimes, setShowTimes] = useState(false);
  const [markStatus, setMarkStatus] = useState(true);
  const [copied, setCopied] = useState(false);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  const setStep = (name: StepName, state: StepState) => setSteps((prev) => ({ ...prev, [name]: state }));
  const busy = scriptBusy || Object.values(steps).some((s) => s.state === 'running');

  useEffect(() => {
    listModelsAction().then((res) => {
      if (!res.success) return;
      const tts = res.audioModels.map(stripModelPrefix).filter((m) => m.includes('tts'));
      const text = res.textModels.map(stripModelPrefix);
      if (tts.length) setTtsModels(tts);
      const transcribe = text.filter((m) => m.includes('transcribe'));
      if (transcribe.length) setTranscribeModels(transcribe);
      const general = text.filter((m) => !m.includes('transcribe'));
      if (general.length) setTextModels(general);
    });
  }, []);

  // ── Derived: script tokens and the active alignment ──
  const lines = useMemo(() => parseScript(scriptText), [scriptText]);
  const tokens = useMemo(() => tokenizeScript(lines, lang.code), [lines, lang.code]);

  const words = transcript?.words;
  const algorithmMatches = useMemo(() => (words ? alignByCharacters(tokens, words) : null), [tokens, words]);
  const aiMatches = words && aiResult?.signature === signatureOf(tokens, words) ? aiResult.matches : null;
  const activeMatches =
    aligner === 'algorithm' ? algorithmMatches
    : !aiMatches || !algorithmMatches ? null
    : aligner === 'ai' ? aiMatches
    : mergeMatches(tokens, words!, aiMatches, algorithmMatches);

  const alignment: Alignment | null = useMemo(
    () => (words && activeMatches ? resolveTimings(lines, tokens, words, activeMatches, duration) : null),
    [lines, tokens, words, activeMatches, duration],
  );

  const disagreements = aiMatches && algorithmMatches ? countDisagreements(aiMatches, algorithmMatches) : null;

  // ── Highlight loop while playing ──
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const t = audioRef.current?.currentTime ?? 0;
      setActiveToken(alignment ? findActiveToken(alignment, t) : -1);
      setActiveWord(words ? findWordAt(words, t) : -1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, alignment, words]);

  // Keep the line being spoken in view.
  const activeLine = alignment && activeToken >= 0 ? alignment.tokens[activeToken].line : -1;
  useEffect(() => {
    if (playing && activeLine >= 0) lineRefs.current[activeLine]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeLine, playing]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) { el.defaultPlaybackRate = speed; el.playbackRate = speed; }
  }, [speed, audio]);

  // ── Actions ──
  function changeLanguage(code: string) {
    const next = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
    const untouchedSample = Object.values(SAMPLES).includes(scriptText.trim());
    if (untouchedSample && sampleFor(code)) setScriptText(sampleFor(code));
    if (LANGUAGES.some((l) => l.style === style)) setStyle(next.style);
    setLangCode(code);
  }

  async function generateScript() {
    setScriptBusy(true);
    setScriptError(null);
    const res = await generateDialogueAction({
      languageLabel: lang.name,
      accentInstruction: `Write the dialogue entirely in ${lang.name}. Include a few numbers, times or prices.`,
      textModel,
      targetDurationSecs: 30,
    });
    setScriptBusy(false);
    if (res.success) setScriptText(formatScript(res.lines));
    else setScriptError(res.error);
  }

  function loadAudio(next: AudioData) {
    audioRef.current?.pause();
    setAudio(next);
    setDuration(0);
    setTranscript(null);
    setAiResult(null);
    setRetryNote(null);
    setActiveToken(-1);
    setActiveWord(-1);
    setSteps((prev) => ({ ...prev, transcribe: IDLE, align: IDLE }));
  }

  async function runTts(): Promise<AudioData | null> {
    setStep('tts', { state: 'running' });
    const started = performance.now();
    const res = await generateAudioAction({ lines, accentInstruction: style, audioModel: ttsModel, voice1, voice2 });
    if (!res.success) { setStep('tts', { state: 'error', error: res.error }); return null; }
    const next = { base64: res.audioBase64, mime: res.mimeType, label: `${ttsModel} · ${voice1} / ${voice2}` };
    loadAudio(next);
    setStep('tts', { state: 'done', ms: performance.now() - started });
    return next;
  }

  function uploadAudio(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const [, base64 = ''] = String(reader.result).split(',');
      loadAudio({ base64, mime: file.type || 'audio/mpeg', label: file.name });
      setStep('tts', IDLE);
    };
    reader.readAsDataURL(file);
  }

  async function runTranscribe(source: AudioData | null = audio): Promise<Transcript | null> {
    if (!source) return null;
    setStep('transcribe', { state: 'running' });
    setAiResult(null);
    setStep('align', IDLE);
    setRetryNote(null);
    const request = () => transcribeWordsAction({
      audioBase64: source.base64,
      mimeType: source.mime,
      model: transcribeModel,
      languageCode: useLanguageHint ? lang.code : '',
    });
    const coverage = (words: TranscribedWord[]) =>
      findCoverageIssue(resolveTimings(lines, tokens, words, alignByCharacters(tokens, words), duration));

    const res = await request();
    if (!res.success) { setStep('transcribe', { state: 'error', error: res.error }); return null; }
    if (res.words.length === 0) { setStep('transcribe', { state: 'error', error: 'The transcript came back with no words.' }); return null; }
    let best = { text: res.text, words: res.words };
    let ms = res.ms;

    // Same rule as the backend: retry once when the transcript dropped part of the dialogue.
    const issue = coverage(res.words);
    if (issue) {
      const describe = (i: NonNullable<typeof issue>) => i.missingLines.length
        ? `line${i.missingLines.length > 1 ? 's' : ''} ${i.missingLines.map((l) => l + 1).join(', ')} missing`
        : `${Math.round(i.estimatedRatio * 100)}% of words not heard`;
      const again = await request();
      if (again.success && again.words.length > 0) {
        ms += again.ms;
        const after = coverage(again.words);
        const better = (after?.estimatedRatio ?? 0) < issue.estimatedRatio;
        if (better) best = { text: again.text, words: again.words };
        setRetryNote(`First transcript: ${describe(issue)}. Transcribed again: ${after ? describe(after) : 'complete'}${better ? ' — using the retry.' : ' — no better, keeping the first.'}`);
      } else {
        setRetryNote(`First transcript: ${describe(issue)}. The retry failed${again.success ? ' (no words)' : `: ${again.error}`}.`);
      }
    }

    setTranscript(best);
    setStep('transcribe', { state: 'done', ms });
    return best;
  }

  async function runAlign(source: TranscribedWord[] | undefined = words) {
    if (!source) return;
    setStep('align', { state: 'running' });
    const res = await alignWithAiAction({
      model: textModel,
      lines: lines.map((l) => ({ speaker: l.speaker })),
      tokens: tokens.map((t) => ({ line: t.line, text: t.text })),
      words: source.map((w) => ({ text: w.text, speaker: w.speaker })),
    });
    if (!res.success) { setStep('align', { state: 'error', error: res.error }); return; }
    setAiResult({ signature: signatureOf(tokens, source), matches: res.matches });
    setAligner('hybrid');
    setStep('align', { state: 'done', ms: res.ms });
  }

  async function runAll() {
    const generated = await runTts();
    if (!generated) return;
    const heard = await runTranscribe(generated);
    if (!heard) return;
    await runAlign(heard.words);
  }

  function seek(timeSec: number) {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, timeSec);
    void el.play();
  }

  function syncHighlight() {
    const t = audioRef.current?.currentTime ?? 0;
    setActiveToken(alignment ? findActiveToken(alignment, t) : -1);
    setActiveWord(words ? findWordAt(words, t) : -1);
  }

  function exportJson() {
    if (!alignment) return '';
    return JSON.stringify({
      language: lang.code,
      aligner: aligner === 'algorithm' ? 'algorithm' : `${aligner}:${textModel}`,
      transcriptionModel: transcribeModel,
      audioDurationSec: round3(duration),
      lines: alignment.lines.map((line, i) => ({
        speaker: line.speaker,
        text: lines[i].text,
        startSec: round3(line.startSec),
        endSec: round3(line.endSec),
        words: line.tokens.map((t) => ({ text: t.text, startSec: round3(t.startSec), endSec: round3(t.endSec), status: t.status, heard: t.heard || undefined })),
      })),
    }, null, 2);
  }

  async function copyJson() {
    await navigator.clipboard.writeText(exportJson());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const audioSrc = audio ? `data:${audio.mime};base64,${audio.base64}` : undefined;
  const aiStale = words && aiResult && !aiMatches;

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:bg-none dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 pb-24 space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <Link href="/dev/gemini" className="text-sm text-violet-600 dark:text-violet-300 hover:underline">← Gemini Dialogue Studio</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 dark:from-violet-300 dark:via-fuchsia-300 dark:to-pink-300 bg-clip-text text-transparent">
            Audio Timing Pipeline
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
            Original script → Gemini TTS → Gemini Transcribe with word timestamps → AI aligns the transcript back to the
            script. People always read the <strong>original</strong> text; the transcript only supplies the timing.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" onClick={runAll} disabled={busy || lines.length === 0} className={primaryButton}>
              ▶ Run full pipeline
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Runs steps 2 → 4 with the settings below.</span>
          </div>
        </header>

        {/* 1. Script */}
        <section>
          <StepHeader num={1} title="Original dialogue" hint="One line per turn, prefixed with Speaker1: or Speaker2:. This is the final text people see." />
          <Card className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Language">
                <select value={langCode} onChange={(e) => changeLanguage(e.target.value)} className={inputClass}>
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </Field>
              <ModelSelect label="Text model (script + alignment)" value={textModel} onChange={setTextModel} options={textModels} />
            </div>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={7}
              spellCheck={false}
              className={`${inputClass} font-mono leading-relaxed`}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={generateScript} disabled={busy} className={secondaryButton}>
                {scriptBusy ? '⏳ Writing…' : '✨ Write a new dialogue with AI'}
              </button>
              {sampleFor(langCode) && (
                <button type="button" onClick={() => setScriptText(sampleFor(langCode))} disabled={busy} className={secondaryButton}>
                  Reset to sample
                </button>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">{lines.length} lines · {tokens.length} words</span>
            </div>
            {scriptError && <p className="text-sm text-red-600 dark:text-red-400 break-words">{scriptError}</p>}
          </Card>
        </section>

        {/* 2. TTS */}
        <section>
          <StepHeader num={2} title="Generate audio (TTS)" hint="Speaks the script with two voices, or upload your own recording instead." step={steps.tts} />
          <Card className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <ModelSelect label="TTS model" value={ttsModel} onChange={setTtsModel} options={ttsModels} />
              <Field label="Speaker1 voice">
                <select value={voice1} onChange={(e) => setVoice1(e.target.value)} className={inputClass}>
                  {VOICES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Speaker2 voice">
                <select value={voice2} onChange={(e) => setVoice2(e.target.value)} className={inputClass}>
                  {VOICES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Speaking style instruction">
              <input value={style} onChange={(e) => setStyle(e.target.value)} className={inputClass} />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void runTts()} disabled={busy || lines.length === 0} className={primaryButton}>
                🔊 Generate audio
              </button>
              <label className={`${secondaryButton} cursor-pointer`}>
                ⬆ Upload audio
                <input type="file" accept="audio/*" className="hidden" disabled={busy}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAudio(f); e.target.value = ''; }} />
              </label>
            </div>
            <ErrorText step={steps.tts} />
            {audio && (
              <div className="space-y-2">
                <audio
                  ref={audioRef}
                  src={audioSrc}
                  controls
                  className="w-full"
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => { setPlaying(false); syncHighlight(); }}
                  onEnded={() => { setPlaying(false); setActiveToken(-1); setActiveWord(-1); }}
                  onSeeked={syncHighlight}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{audio.label} · {audio.mime} · {duration ? `${duration.toFixed(1)}s` : '…'}</span>
                  <a href={audioSrc} download={`dialogue.${audio.mime.includes('wav') ? 'wav' : 'audio'}`} className="text-violet-600 dark:text-violet-300 hover:underline">
                    Download audio
                  </a>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* 3. Transcribe */}
        <section>
          <StepHeader num={3} title="Transcribe with word timestamps" hint="Gemini Transcribe returns every word it heard, with start and end times." step={steps.transcribe} />
          <Card className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <ModelSelect label="Transcription model" value={transcribeModel} onChange={setTranscribeModel} options={transcribeModels} />
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pb-2.5">
                <input type="checkbox" checked={useLanguageHint} onChange={(e) => setUseLanguageHint(e.target.checked)} className="accent-fuchsia-600" />
                Send language hint <code className="text-xs">{lang.code}</code> (off = auto-detect)
              </label>
            </div>
            <button type="button" onClick={() => void runTranscribe()} disabled={busy || !audio} className={primaryButton}>
              📝 Transcribe audio
            </button>
            <ErrorText step={steps.transcribe} />
            {retryNote && (
              <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">↻ {retryNote}</p>
            )}
            {transcript && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {transcript.words.length} words heard
                  {alignment && alignment.unusedWords.size > 0 && ` · ${alignment.unusedWords.size} not matched to the script (struck through)`}
                  {' '}· hover a word for its timing
                </p>
                <div className="flex flex-wrap gap-1.5 text-sm">
                  {transcript.words.map((w, i) => (
                    <span
                      key={i}
                      title={`#${i} · ${secs(w.startSec)}s → ${secs(w.endSec)}s${w.speaker ? ` · ${w.speaker}` : ''}`}
                      className={`px-1.5 py-0.5 rounded-md border transition-colors ${
                        i === activeWord
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5'
                      } ${alignment?.unusedWords.has(i) ? 'line-through opacity-60' : ''}`}
                    >
                      {w.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* 4. Align */}
        <section>
          <StepHeader num={4} title="Align transcript to the original text" hint="AI maps every original word to the transcript words spoken for it; timings come from those words." step={steps.align} />
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void runAlign()} disabled={busy || !transcript} className={primaryButton}>
                🧠 Align with AI ({textModel})
              </button>
              {aiStale && <span className="text-xs text-amber-700 dark:text-amber-300">The script changed since the last AI alignment. Run it again.</span>}
            </div>
            <ErrorText step={steps.align} />
            {transcript && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Show result from</span>
                <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-white/10">
                  {ALIGNERS.map(({ value, label, hint }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAligner(value)}
                      title={hint}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${aligner === value ? 'bg-white dark:bg-white/20 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {disagreements !== null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">AI and algorithm disagree on {disagreements} of {tokens.length} words</span>
                )}
              </div>
            )}
            {alignment && (
              <div className="grid grid-cols-3 gap-3">
                {(['exact', 'corrected', 'estimated'] as const).map((s) => (
                  <div key={s} className="rounded-xl border border-gray-200 dark:border-white/10 p-3">
                    <div className="text-2xl font-bold tabular-nums">{alignment.stats[s]}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{STATUS_LABEL[s]}</div>
                  </div>
                ))}
              </div>
            )}
            {transcript && aligner !== 'algorithm' && !aiMatches && !aiStale && steps.align.state !== 'running' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Run the AI alignment, or switch to “Algorithm only” to preview without AI.</p>
            )}
          </Card>
        </section>

        {/* 5. Result */}
        {alignment && audio && (
          <section>
            <StepHeader num={5} title="Result: original text with word timing" hint="Click any word to play from there. The word being spoken is highlighted." />
            <Card className="space-y-5">
              <div className="sticky top-0 z-10 -mx-5 md:-mx-6 -mt-5 md:-mt-6 px-5 md:px-6 py-3 rounded-t-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => { const el = audioRef.current; if (el) { if (el.paused) void el.play(); else el.pause(); } }}
                  className="w-10 h-10 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-lg flex items-center justify-center"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? '❚❚' : '▶'}
                </button>
                <TimeReadout audioRef={audioRef} playing={playing} duration={duration} />
                <div className="inline-flex p-1 rounded-lg bg-gray-100 dark:bg-white/10">
                  {SPEEDS.map((s) => (
                    <button key={s} type="button" onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded-md text-xs font-medium tabular-nums ${speed === s ? 'bg-white dark:bg-white/20 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                      {s}×
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={showTimes} onChange={(e) => setShowTimes(e.target.checked)} className="accent-fuchsia-600" />
                  Show word times
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={markStatus} onChange={(e) => setMarkStatus(e.target.checked)} className="accent-fuchsia-600" />
                  Mark corrected / estimated
                </label>
              </div>

              {markStatus && (
                <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span><span className={STATUS_STYLE.corrected}>word</span> {STATUS_LABEL.corrected}</span>
                  <span><span className={STATUS_STYLE.estimated}>word</span> {STATUS_LABEL.estimated}</span>
                </div>
              )}

              <div className="space-y-3">
                {alignment.lines.map((line, li) => (
                  <div
                    key={li}
                    ref={(el) => { lineRefs.current[li] = el; }}
                    className={`flex gap-3 rounded-xl p-3 transition-colors ${li === activeLine ? 'bg-fuchsia-500/10' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => seek(line.startSec)}
                      className="shrink-0 w-20 text-left"
                      title="Play this line"
                    >
                      <span className={`block text-xs font-semibold ${line.speaker === 'Speaker1' ? 'text-violet-600 dark:text-violet-300' : 'text-sky-600 dark:text-sky-300'}`}>
                        {line.speaker}
                      </span>
                      <span className="block font-mono text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">{secs(line.startSec)}s</span>
                    </button>
                    <p className="text-lg leading-[2.4rem] min-w-0">
                      {line.tokens.map((t) => (
                        <Fragment key={t.index}>
                          {t.lead}
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => seek(t.startSec)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seek(t.startSec); } }}
                            title={`${secs(t.startSec)}s → ${secs(t.endSec)}s · ${STATUS_LABEL[t.status]}${t.heard && t.status !== 'exact' ? ` · heard “${t.heard}”` : ''}`}
                            className={`relative cursor-pointer rounded transition-colors ${
                              t.index === activeToken
                                ? 'bg-fuchsia-600 text-white'
                                : 'hover:bg-fuchsia-500/15'
                            } ${markStatus ? STATUS_STYLE[t.status] : ''} ${showTimes ? 'inline-flex flex-col items-center leading-tight align-top' : ''}`}
                          >
                            {t.text}
                            {showTimes && (
                              <span className={`font-mono text-[10px] tabular-nums ${t.index === activeToken ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                {secs(t.startSec)}
                              </span>
                            )}
                          </span>
                        </Fragment>
                      ))}
                    </p>
                  </div>
                ))}
              </div>

              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-violet-600 dark:text-violet-300">
                  Word timing table ({alignment.tokens.length} words)
                </summary>
                <div className="mt-3 max-h-[28rem] overflow-auto rounded-xl border border-gray-200 dark:border-white/10">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 text-left">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Line</th>
                        <th className="px-3 py-2">Original word</th>
                        <th className="px-3 py-2">Heard</th>
                        <th className="px-3 py-2 text-right">Start</th>
                        <th className="px-3 py-2 text-right">End</th>
                        <th className="px-3 py-2 text-right">Dur.</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alignment.tokens.map((t) => (
                        <tr
                          key={t.index}
                          onClick={() => seek(t.startSec)}
                          className={`cursor-pointer border-t border-gray-100 dark:border-white/5 ${t.index === activeToken ? 'bg-fuchsia-500/15' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                        >
                          <td className="px-3 py-1.5 tabular-nums text-gray-500">{t.index}</td>
                          <td className="px-3 py-1.5 tabular-nums text-gray-500">{t.line + 1}</td>
                          <td className="px-3 py-1.5">{t.text}</td>
                          <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{t.heard || '—'}</td>
                          <td className="px-3 py-1.5 text-right font-mono tabular-nums">{secs(t.startSec)}</td>
                          <td className="px-3 py-1.5 text-right font-mono tabular-nums">{secs(t.endSec)}</td>
                          <td className="px-3 py-1.5 text-right font-mono tabular-nums text-gray-500">{secs(t.endSec - t.startSec)}</td>
                          <td className="px-3 py-1.5 text-xs">{t.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void copyJson()} className={secondaryButton}>
                  {copied ? '✓ Copied' : '⧉ Copy result JSON'}
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">Original text per line with per-word start/end seconds.</span>
              </div>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
