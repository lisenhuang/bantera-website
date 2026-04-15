'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { alignWithRevAIAction } from './actions';

// ── Rev.ai response types ──────────────────────────────────────────
type RevElement = { type: 'text' | 'punct' | 'unknown'; value: string; ts?: number; end_ts?: number };
type RevTranscript = { monologues: { speaker: number; elements: RevElement[] }[] };

// ── Per-line cue ──────────────────────────────────────────────────
type CueWord = { value: string; ts: number; end_ts: number };
type Cue = { startSec: number; endSec: number; text: string; words: CueWord[] };

function normWord(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// "hole-in-the-wall" → ["hole","in","the","wall"] so each part advances wPos
function tokenizeWord(w: string): string[] {
  return w.split(/[-–—]/).map(normWord).filter(Boolean);
}

function buildCues(transcript: RevTranscript, inputLines: string[]): Cue[] {
  const words: { norm: string; value: string; ts: number; end_ts: number }[] = [];
  for (const mono of transcript.monologues ?? []) {
    for (const el of mono.elements ?? []) {
      if (el.type === 'text' && el.ts != null && el.end_ts != null) {
        words.push({ norm: normWord(el.value), value: el.value, ts: el.ts, end_ts: el.end_ts });
      }
    }
  }
  if (words.length === 0 || inputLines.length === 0) return [];

  const cues: Cue[] = [];
  let wPos = 0;

  for (const lineText of inputLines) {
    const inputWords = lineText.trim().split(/\s+/).filter(Boolean);
    if (inputWords.length === 0) continue;

    const lineStartPos = wPos;
    let lineEndPos = wPos;
    const matchedWords: CueWord[] = [];

    for (const iw of inputWords) {
      const tokens = tokenizeWord(iw);
      // Track combined ts/end_ts across all parts of a hyphenated word
      let wordTs: number | null = null;
      let wordEndTs: number | null = null;

      for (const token of tokens) {
        const limit = Math.min(wPos + 6, words.length);
        for (let j = wPos; j < limit; j++) {
          if (words[j].norm === token) {
            if (wordTs === null) wordTs = words[j].ts;
            wordEndTs = words[j].end_ts;
            lineEndPos = j;
            wPos = j + 1;
            break;
          }
        }
      }

      // Store the input word (preserving original form e.g. "hole-in-the-wall")
      // with combined timestamps from all its matched tokens
      if (wordTs !== null && wordEndTs !== null) {
        matchedWords.push({ value: iw, ts: wordTs, end_ts: wordEndTs });
      }
    }

    cues.push({
      startSec: +words[Math.min(lineStartPos, words.length - 1)].ts.toFixed(3),
      endSec:   +words[Math.min(lineEndPos,   words.length - 1)].end_ts.toFixed(3),
      text: lineText.trim(),
      words: matchedWords,
    });
  }

  if (cues.length > 0) cues[cues.length - 1].endSec = +words[words.length - 1].end_ts.toFixed(3);
  return cues;
}

function fmt(sec: number) { return sec.toFixed(3); }

// ── Play button ───────────────────────────────────────────────────
function PlayButton({ onClick, playing }: { onClick: () => void; playing: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
        playing
          ? 'bg-sky-500 border-sky-400 text-white'
          : 'bg-white dark:bg-black/30 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-sky-400 hover:text-sky-600'
      }`}
    >
      {playing ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5.14v14l11-7-11-7z" />
        </svg>
      )}
    </button>
  );
}

// ── Cue table ─────────────────────────────────────────────────────
function CueTable({ cues, playingIdx, playbackTime, onPlay }: {
  cues: Cue[];
  playingIdx: number | null;
  playbackTime: number;
  onPlay: (i: number, c: Cue) => void;
}) {
  return (
    <div className="rounded-xl border border-sky-200 dark:border-sky-500/30 overflow-x-auto">
      <table className="w-full text-sm min-w-md">
        <thead>
          <tr className="bg-sky-50 dark:bg-sky-500/10 text-left text-xs uppercase tracking-wider text-sky-800 dark:text-sky-300">
            <th className="px-2 py-2 font-semibold w-12">Play</th>
            <th className="px-3 py-2 font-semibold w-24">Start (s)</th>
            <th className="px-3 py-2 font-semibold w-24">End (s)</th>
            <th className="px-3 py-2 font-semibold">Text</th>
          </tr>
        </thead>
        <tbody>
          {cues.map((cue, i) => (
            <tr key={i} className={`border-t border-gray-100 dark:border-white/5 transition-colors ${
              playingIdx === i ? 'bg-sky-50 dark:bg-sky-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
            }`}>
              <td className="px-2 py-2">
                <PlayButton onClick={() => onPlay(i, cue)} playing={playingIdx === i} />
              </td>
              <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">{fmt(cue.startSec)}</td>
              <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">{fmt(cue.endSec)}</td>
              <td className="px-3 py-2 leading-relaxed">
                {cue.words.length > 0 ? (
                  cue.words.map((w, wi) => (
                    <span key={wi} className={
                      playbackTime >= w.ts && playbackTime <= w.end_ts
                        ? 'text-orange-500 font-semibold'
                        : 'text-gray-900 dark:text-white'
                    }>
                      {w.value}{wi < cue.words.length - 1 ? ' ' : ''}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-900 dark:text-white">{cue.text}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── File picker row ───────────────────────────────────────────────
function FilePicker({ label, accept, fileName, onFile }: {
  label: string; accept: string; fileName: string | null; onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ref.current?.click()}
        className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-700 dark:text-gray-300 hover:border-sky-400 hover:text-sky-600 transition-all"
      >
        {label}
      </button>
      <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
        {fileName ?? <span className="italic text-gray-400">no file chosen</span>}
      </span>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function RevAIPage() {
  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' },
    { value: 'it-IT', label: 'Italian' },
    { value: 'pt-BR', label: 'Portuguese (Brazil)' },
    { value: 'cmn', label: 'Chinese (Simplified)' },
    { value: 'zh-TW', label: 'Chinese (Traditional)' },
    { value: 'ja-JP', label: 'Japanese' },
    { value: 'ko-KR', label: 'Korean' },
  ];

  // API section
  const [audioUrl, setAudioUrl] = useState('');
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [apiCues, setApiCues] = useState<Cue[]>([]);

  // Local files section
  const [localWavName, setLocalWavName] = useState<string | null>(null);
  const [localTxtName, setLocalTxtName] = useState<string | null>(null);
  const [localJsonName, setLocalJsonName] = useState<string | null>(null);
  const localWavObjectUrl = useRef<string | null>(null);
  const localTxtContent = useRef<string | null>(null);
  const localJsonContent = useRef<RevTranscript | null>(null);
  const [localCues, setLocalCues] = useState<Cue[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  // Shared playback
  const [playing, setPlaying] = useState<{ section: 'api' | 'local'; idx: number } | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopCleanupRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => { if (localWavObjectUrl.current) URL.revokeObjectURL(localWavObjectUrl.current); }, []);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const stopPlayback = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    stopCleanupRef.current?.();
    stopCleanupRef.current = null;
    audioRef.current?.pause();
    setPlaying(null);
    setPlaybackTime(0);
  }, []);

  function playCue(section: 'api' | 'local', idx: number, cue: Cue, src: string) {
    if (playing?.section === section && playing?.idx === idx) { stopPlayback(); return; }
    stopPlayback();

    const el = audioRef.current;
    if (!el) return;
    setPlaying({ section, idx });

    const onSeeked = () => {
      // RAF loop for smooth per-word highlighting
      const tick = () => {
        if (el) setPlaybackTime(el.currentTime);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      const onTime = () => { if (el.currentTime >= cue.endSec) stopPlayback(); };
      const onEnded = () => stopPlayback();
      el.addEventListener('timeupdate', onTime);
      el.addEventListener('ended', onEnded);
      stopCleanupRef.current = () => {
        el.removeEventListener('timeupdate', onTime);
        el.removeEventListener('ended', onEnded);
      };
      el.play().catch(() => {});
    };

    const onMetadata = () => {
      el.addEventListener('seeked', onSeeked, { once: true });
      el.currentTime = cue.startSec;
    };

    el.src = src;
    el.addEventListener('loadedmetadata', onMetadata, { once: true });
    el.load();
  }

  function tryBuildLocalCues() {
    setLocalError(null);
    const src = localWavObjectUrl.current;
    const txt = localTxtContent.current;
    const json = localJsonContent.current;
    if (!src || !txt || !json) return;
    const lines = txt.trim().split('\n').filter((l) => l.trim().length > 0);
    const cues = buildCues(json, lines);
    if (cues.length === 0) { setLocalError('No cues could be built — check that the JSON and text match.'); return; }
    stopPlayback();
    setLocalCues(cues);
  }

  function handleWavFile(file: File) {
    if (localWavObjectUrl.current) URL.revokeObjectURL(localWavObjectUrl.current);
    localWavObjectUrl.current = URL.createObjectURL(file);
    setLocalWavName(file.name);
    tryBuildLocalCues();
  }

  function handleTxtFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => { localTxtContent.current = reader.result as string; setLocalTxtName(file.name); tryBuildLocalCues(); };
    reader.readAsText(file);
  }

  function handleJsonFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try { localJsonContent.current = JSON.parse(reader.result as string) as RevTranscript; setLocalJsonName(file.name); tryBuildLocalCues(); }
      catch { setLocalError('Failed to parse JSON file.'); }
    };
    reader.readAsText(file);
  }

  const canSubmit = audioUrl.trim().length > 0 && text.trim().length > 0 && !loading;

  async function handleSubmit() {
    stopPlayback();
    setLoading(true);
    setError(null);
    setRawJson(null);
    setApiCues([]);
    setLogs([]);
    const res = await alignWithRevAIAction({
      audioUrl: audioUrl.trim(),
      text: text.trim(),
      language,
    });
    setLogs(res.logs);
    setLoading(false);
    if (res.success) {
      setRawJson(res.json);
      try {
        const transcript = JSON.parse(res.json) as RevTranscript;
        const lines = text.trim().split('\n').filter((l) => l.trim().length > 0);
        setApiCues(buildCues(transcript, lines));
      } catch { /* raw JSON still shown */ }
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <audio ref={audioRef} preload="none" className="hidden" />

      <div className="max-w-2xl mx-auto space-y-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rev.ai Alignment</h1>

        {/* ── Section 1: API ─────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-white/10 pb-2">
            Submit via API
          </h2>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="audio-url">Audio URL</label>
            <input id="audio-url" type="url" value={audioUrl}
              onChange={(e) => { setAudioUrl(e.target.value); stopPlayback(); }}
              placeholder="https://example.com/audio.wav"
              className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="language">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition-all"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="transcript-text">
              Transcript text <span className="text-gray-400 font-normal">(one line per cue)</span>
            </label>
            <textarea id="transcript-text" value={text} onChange={(e) => setText(e.target.value)} rows={8}
              placeholder={"Hello, how are you?\nI'm good, thank you.\nNice to see you."}
              className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition-all resize-y"
            />
          </div>

          <button type="button" onClick={handleSubmit} disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Aligning… {elapsed}s
              </>
            ) : 'Submit'}
          </button>

          {(loading || logs.length > 0) && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Log</p>
              <div className="bg-black/80 rounded-xl px-4 py-3 text-xs font-mono text-green-400 space-y-0.5 max-h-48 overflow-y-auto">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
                {loading && <div className="animate-pulse text-gray-500">polling…</div>}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
          )}

          {apiCues.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cues</p>
              <CueTable cues={apiCues} playingIdx={playing?.section === 'api' ? playing.idx : null}
                playbackTime={playing?.section === 'api' ? playbackTime : 0}
                onPlay={(i, c) => playCue('api', i, c, audioUrl)} />
            </div>
          )}

          {rawJson && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Raw JSON</p>
              <textarea disabled value={rawJson} rows={16}
                className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-xs font-mono resize-y opacity-80"
              />
            </div>
          )}
        </section>

        {/* ── Section 2: Local files ─────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-white/10 pb-2">
            Load local files
          </h2>

          <div className="space-y-3">
            <FilePicker label="Choose .wav" accept=".wav,audio/*" fileName={localWavName} onFile={handleWavFile} />
            <FilePicker label="Choose .txt" accept=".txt,text/plain" fileName={localTxtName} onFile={handleTxtFile} />
            <FilePicker label="Choose .json" accept=".json,application/json" fileName={localJsonName} onFile={handleJsonFile} />
          </div>

          {localError && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{localError}</div>
          )}

          {localCues.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cues</p>
              <CueTable cues={localCues} playingIdx={playing?.section === 'local' ? playing.idx : null}
                playbackTime={playing?.section === 'local' ? playbackTime : 0}
                onPlay={(i, c) => playCue('local', i, c, localWavObjectUrl.current!)} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
