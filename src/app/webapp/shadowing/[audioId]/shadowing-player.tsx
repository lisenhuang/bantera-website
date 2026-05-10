"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  BanteraPublicAudio,
  BanteraTranscriptCue,
  BanteraWordTiming,
} from "@/lib/bantera-api";

// ── Constants ──────────────────────────────────────────────────────────────────

const SPEED_STEPS = [1, 0.75, 0.5, 1.25] as const;

type PauseMode = "none" | "oneSecond" | "oneCuePlusOneSecond" | "oneCuePlusTwoSeconds";
type PlayAllSettings = { playsPerCue: 1 | 2 | 3; pauseMode: PauseMode };

const DEFAULT_PLAY_ALL_SETTINGS: PlayAllSettings = {
  playsPerCue: 1,
  pauseMode: "none",
};

const PAUSE_MODE_LABELS: Record<PauseMode, string> = {
  none: "None",
  oneSecond: "1 second",
  oneCuePlusOneSecond: "Cue + 1 sec",
  oneCuePlusTwoSeconds: "Cue + 2 sec",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTimestamp(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function computeCueWordTimings(
  wordTiming: BanteraWordTiming[] | null | undefined,
  cue: BanteraTranscriptCue,
): (BanteraWordTiming | null)[] {
  const words = cue.text.split(/\s+/).filter(Boolean);
  if (!wordTiming?.length) return words.map(() => null);
  const cueTimings = wordTiming.filter(
    (w) => w.startMs >= cue.startMs - 300 && w.startMs < cue.endMs + 300,
  );
  return words.map((_, i) => cueTimings[i] ?? null);
}

function computeShadowingGapMs(
  cue: BanteraTranscriptCue,
  mode: PauseMode,
  rate: number,
): number {
  const cueDur = cue.endMs - cue.startMs;
  const base =
    mode === "none" ? 0
    : mode === "oneSecond" ? 1000
    : mode === "oneCuePlusOneSecond" ? cueDur + 1000
    : cueDur + 2000;
  return rate > 0 ? base / rate : base;
}

// ── GetAppModal ────────────────────────────────────────────────────────────────

function GetAppModal({
  feature,
  onClose,
}: {
  feature: "translate" | "record";
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isTranslate = feature === "translate";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[1.75rem] bg-white p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
          {isTranslate ? (
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
        </div>
        <h2 className="text-xl font-black text-slate-950 text-center">
          {isTranslate ? "Translation is in the app" : "Recording is in the app"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 text-center">
          {isTranslate
            ? "Real-time cue translation is a feature of the Bantera mobile app. Download it to translate while you shadow."
            : "Record yourself shadowing and compare your pronunciation with the original — available in the Bantera mobile app."}
        </p>
        <a href="/download" target="_blank" rel="noopener noreferrer" className="mt-6 flex items-center justify-center gap-2 w-full rounded-2xl bg-amber-400 hover:bg-amber-300 transition px-5 py-3.5 text-sm font-black text-slate-950">
          Get the Bantera app →
        </a>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition">
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ── ShadowingSettingsSheet ─────────────────────────────────────────────────────

function ShadowingSettingsSheet({
  initial,
  onStart,
  onClose,
}: {
  initial: PlayAllSettings;
  onStart: (s: PlayAllSettings) => void;
  onClose: () => void;
}) {
  const [playsPerCue, setPlaysPerCue] = useState<1 | 2 | 3>(initial.playsPerCue);
  const [pauseMode, setPauseMode] = useState<PauseMode>(initial.pauseMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pauseModes: PauseMode[] = ["none", "oneSecond", "oneCuePlusOneSecond", "oneCuePlusTwoSeconds"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[1.75rem] bg-white p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-slate-950 text-center">Shadowing</h2>
        <p className="mt-1.5 text-sm text-slate-400 text-center">Listen, then shadow each cue.</p>

        {/* Plays per cue */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">Plays per cue</p>
          <div className="flex rounded-2xl border border-slate-200 overflow-hidden text-sm font-semibold">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPlaysPerCue(n)}
                className={`flex-1 py-2.5 transition ${playsPerCue === n ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
              >
                {n === 1 ? "Once" : n === 2 ? "Twice" : "3×"}
              </button>
            ))}
          </div>
        </div>

        {/* Pause between */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">Pause between</p>
          <div className="flex flex-col gap-2">
            {pauseModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPauseMode(mode)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  pauseMode === mode
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${pauseMode === mode ? "border-white" : "border-slate-300"}`}>
                  {pauseMode === mode && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                {PAUSE_MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStart({ playsPerCue, pauseMode })}
          className="mt-6 w-full rounded-2xl bg-amber-400 hover:bg-amber-300 transition px-5 py-3.5 text-sm font-black text-slate-950"
        >
          Start Shadowing
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── ShadowingPlayer ────────────────────────────────────────────────────────────

export function ShadowingPlayer({ audio }: { audio: BanteraPublicAudio }) {
  const longCues = useMemo(
    () => audio.transcriptCues.filter((c) => c.text.trim()),
    [audio.transcriptCues],
  );
  const shortCues = useMemo(
    () => (audio.transcriptShortCues ?? []).filter((c) => c.text.trim()),
    [audio.transcriptShortCues],
  );
  const hasShortCues = shortCues.length > 0;

  const [cueMode, setCueModeRaw] = useState<"long" | "short">("long");
  const [cueIndex, setCueIndex] = useState(0);
  const [isCuePlaying, setIsCuePlaying] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  // Default hidden so users listen first
  const [showTranscript, setShowTranscript] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);
  const [modalFeature, setModalFeature] = useState<"translate" | "record" | null>(null);
  const [pendingAutoPlay, setPendingAutoPlay] = useState(false);

  // Play All (Shadowing) state
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [shadowingSheetOpen, setShadowingSheetOpen] = useState(false);
  const [playAllSettings, setPlayAllSettings] = useState<PlayAllSettings>(DEFAULT_PLAY_ALL_SETTINGS);
  const [isInShadowingGap, setIsInShadowingGap] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Refs for synchronous access inside rAF/timeout callbacks
  const isPlayingAllRef = useRef(false);
  const cueIndexRef = useRef(0);
  const playsThisCueRef = useRef(0);
  const playAllTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playAllSettingsRef = useRef(playAllSettings);
  const playbackRateRef = useRef(SPEED_STEPS[speedIndex]);
  const activeCuesRef = useRef(longCues);
  const isAudioReadyRef = useRef(false);

  const playbackRate = SPEED_STEPS[speedIndex];
  const activeCues = cueMode === "short" && hasShortCues ? shortCues : longCues;
  const activeCue = activeCues[cueIndex] ?? null;
  const audioSrc = `/api/public-audio/${audio.id}/file`;

  // Keep refs in sync
  useEffect(() => { isPlayingAllRef.current = isPlayingAll; }, [isPlayingAll]);
  useEffect(() => { cueIndexRef.current = cueIndex; }, [cueIndex]);
  useEffect(() => { playAllSettingsRef.current = playAllSettings; }, [playAllSettings]);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);
  useEffect(() => { activeCuesRef.current = activeCues; }, [activeCues]);
  useEffect(() => { isAudioReadyRef.current = isAudioReady; }, [isAudioReady]);

  // Restore preferences from localStorage on mount
  useEffect(() => {
    try {
      const mode = localStorage.getItem(`bantera.shadowing.${audio.id}.mode`);
      if (mode === "short" && hasShortCues) setCueModeRaw("short");
    } catch {}
    try {
      const raw = localStorage.getItem("bantera.shadowing.playAllSettings");
      if (raw) {
        const parsed = JSON.parse(raw) as PlayAllSettings;
        if ([1, 2, 3].includes(parsed.playsPerCue) && parsed.pauseMode in PAUSE_MODE_LABELS) {
          setPlayAllSettings(parsed);
        }
      }
    } catch {}
  }, [audio.id, hasShortCues]);

  // Apply playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Wire up audio element events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    setIsAudioReady(false);
    setPlaybackError(null);
    const onReady = () => { setIsAudioReady(true); setPlaybackError(null); };
    const onPause = () => setIsCuePlaying(false);
    const onEnded = () => setIsCuePlaying(false);
    const onError = () => {
      setIsAudioReady(false);
      setPlaybackError("Bantera could not play this audio right now. Try refreshing the page.");
    };
    el.addEventListener("loadedmetadata", onReady);
    el.addEventListener("canplay", onReady);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    el.load();
    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) setIsAudioReady(true);
    return () => {
      el.removeEventListener("loadedmetadata", onReady);
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, [audioSrc]);

  // Word timings for the active cue
  const cueWordTimings = useMemo(
    () => activeCue ? computeCueWordTimings(audio.wordTiming, activeCue) : [],
    [activeCue, audio.wordTiming],
  );

  // ── Actions ─────────────────────────────────────────────────────────────────

  const pausePlayback = useCallback(() => {
    audioRef.current?.pause();
    setIsCuePlaying(false);
    setHighlightedWordIndex(null);
    if (progressBarRef.current) progressBarRef.current.style.width = "0%";
  }, []);

  const seekAndPlay = useCallback(async (fromMs: number) => {
    const el = audioRef.current;
    if (!el || !isAudioReadyRef.current) return;
    try {
      setPlaybackError(null);
      el.currentTime = fromMs / 1000;
      el.playbackRate = playbackRateRef.current;
      await el.play();
      setIsCuePlaying(true);
    } catch {
      setPlaybackError("Bantera could not start playback. Try again.");
      setIsCuePlaying(false);
    }
  }, []);

  // Shadowing (play-all) cue-end handler — called from rAF loop
  const handleShadowingCueEnd = useCallback(() => {
    if (!isPlayingAllRef.current) return;
    playsThisCueRef.current += 1;
    const settings = playAllSettingsRef.current;
    const reachedTarget = playsThisCueRef.current >= settings.playsPerCue;
    const cue = activeCuesRef.current[cueIndexRef.current];
    if (!cue) { setIsPlayingAll(false); return; }

    const gapMs = computeShadowingGapMs(cue, settings.pauseMode, playbackRateRef.current);
    if (gapMs > 0) setIsInShadowingGap(true);

    playAllTimeoutRef.current = setTimeout(() => {
      setIsInShadowingGap(false);
      if (!isPlayingAllRef.current) return;

      if (reachedTarget) {
        const nextIdx = cueIndexRef.current + 1;
        if (nextIdx >= activeCuesRef.current.length) {
          // Reached end of all cues — stop
          setIsPlayingAll(false);
          playsThisCueRef.current = 0;
          return;
        }
        playsThisCueRef.current = 0;
        setCueIndex(nextIdx);
        // The follow-up effect below plays the new cue once state updates
      } else {
        // Replay the same cue
        const sameCue = activeCuesRef.current[cueIndexRef.current];
        if (sameCue) void seekAndPlay(sameCue.startMs);
      }
    }, gapMs);
  }, [seekAndPlay]);

  // rAF loop: progress bar, word highlight, cue end detection
  useEffect(() => {
    if (!isCuePlaying || !activeCue) return;
    const el = audioRef.current;
    if (!el) return;

    let frameId: number;
    const tick = () => {
      const currentMs = el.currentTime * 1000;

      if (currentMs >= activeCue.endMs) {
        el.pause();
        setIsCuePlaying(false);
        setHighlightedWordIndex(null);
        if (progressBarRef.current) progressBarRef.current.style.width = "0%";
        if (isPlayingAllRef.current) {
          handleShadowingCueEnd();
        } else {
          el.currentTime = activeCue.startMs / 1000;
        }
        return;
      }

      // Direct DOM update for progress bar
      const cueDuration = activeCue.endMs - activeCue.startMs;
      const progress = cueDuration > 0
        ? Math.max(0, Math.min(1, (currentMs - activeCue.startMs) / cueDuration))
        : 0;
      if (progressBarRef.current) progressBarRef.current.style.width = `${progress * 100}%`;

      // Word highlight (batched — only re-renders when index changes)
      const idx = cueWordTimings.findIndex(
        (t) => t !== null && currentMs >= t.startMs && currentMs < t.endMs,
      );
      setHighlightedWordIndex((prev) => {
        const next = idx >= 0 ? idx : null;
        return prev === next ? prev : next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isCuePlaying, activeCue, cueWordTimings, handleShadowingCueEnd]);

  // Auto-play after Prev/Next navigation
  useEffect(() => {
    if (!pendingAutoPlay || !isAudioReady || !activeCue) return;
    setPendingAutoPlay(false);
    void seekAndPlay(activeCue.startMs);
  }, [pendingAutoPlay, isAudioReady, activeCue, seekAndPlay]);

  // In shadowing mode: play the newly-selected cue after cueIndex state updates
  useEffect(() => {
    if (!isPlayingAllRef.current || !isAudioReady || !activeCue) return;
    void seekAndPlay(activeCue.startMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cueIndex, isAudioReady]);

  function selectCue(nextIndex: number, autoPlay = false) {
    pausePlayback();
    setCueIndex(nextIndex);
    if (autoPlay) setPendingAutoPlay(true);
  }

  function setCueMode(mode: "long" | "short") {
    if (isPlayingAll) stopShadowing();
    pausePlayback();
    setCueModeRaw(mode);
    setCueIndex(0);
    try { localStorage.setItem(`bantera.shadowing.${audio.id}.mode`, mode); } catch {}
  }

  function seekToWord(startMs: number) {
    if (isCuePlaying && audioRef.current) {
      audioRef.current.currentTime = startMs / 1000;
    } else {
      void seekAndPlay(startMs);
    }
  }

  function startShadowing(settings: PlayAllSettings) {
    setPlayAllSettings(settings);
    try { localStorage.setItem("bantera.shadowing.playAllSettings", JSON.stringify(settings)); } catch {}
    playsThisCueRef.current = 0;
    setShadowingSheetOpen(false);
    setIsPlayingAll(true);
    if (activeCue) void seekAndPlay(activeCue.startMs);
  }

  function stopShadowing() {
    if (playAllTimeoutRef.current) {
      clearTimeout(playAllTimeoutRef.current);
      playAllTimeoutRef.current = null;
    }
    setIsInShadowingGap(false);
    setIsPlayingAll(false);
    playsThisCueRef.current = 0;
    pausePlayback();
  }

  function handlePlayPauseClick() {
    if (isPlayingAll) {
      stopShadowing();
    } else if (isCuePlaying) {
      pausePlayback();
    } else {
      void seekAndPlay(activeCue?.startMs ?? 0);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!activeCue) {
    return (
      <div className="rounded-4xl border border-red-200 bg-red-50 px-6 py-5 text-red-700">
        This audio has no transcript cues to practice with.
      </div>
    );
  }

  const words = activeCue.text.split(/\s+/).filter(Boolean);
  const controlsDisabled = !isAudioReady;

  return (
    <>
      <audio ref={audioRef} src={audioSrc} preload="auto" playsInline className="hidden" />

      {modalFeature && (
        <GetAppModal feature={modalFeature} onClose={() => setModalFeature(null)} />
      )}

      {shadowingSheetOpen && (
        <ShadowingSettingsSheet
          initial={playAllSettings}
          onStart={startShadowing}
          onClose={() => setShadowingSheetOpen(false)}
        />
      )}

      <div className="space-y-4">
        {/* Top row: long/short toggle + speed */}
        <div className="flex items-center justify-between gap-3">
          {hasShortCues ? (
            <div className={`flex rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden text-sm font-semibold ${isPlayingAll ? "opacity-40 pointer-events-none" : ""}`}>
              <button type="button" onClick={() => setCueMode("long")} className={`px-4 py-1.5 transition ${cueMode === "long" ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-800"}`}>
                Long
              </button>
              <button type="button" onClick={() => setCueMode("short")} className={`px-4 py-1.5 transition ${cueMode === "short" ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-800"}`}>
                Short
              </button>
            </div>
          ) : <div />}

          <button
            type="button"
            onClick={() => setSpeedIndex((i) => (i + 1) % SPEED_STEPS.length)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700 tabular-nums"
          >
            {playbackRate === 1 ? "1×" : `${playbackRate}×`}
          </button>
        </div>

        {/* Player surface */}
        <div className="relative rounded-4xl overflow-hidden min-h-[260px] sm:min-h-[320px] flex flex-col">
          {audio.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={audio.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <div className={`absolute inset-0 ${audio.coverImageUrl ? "bg-linear-to-b from-slate-900/30 via-slate-900/60 to-slate-900/85" : "bg-slate-950"}`} />

          {/* Transcript */}
          <div className="relative flex-1 flex items-center justify-center p-6 sm:p-10">
            {showTranscript ? (
              <p className="text-center text-white font-bold leading-relaxed text-xl sm:text-2xl md:text-3xl select-none">
                {words.map((word, i) => {
                  const timing = cueWordTimings[i];
                  const isHighlighted = highlightedWordIndex === i;
                  return (
                    <span key={`${cueIndex}-${i}`}>
                      {i > 0 && " "}
                      <button
                        type="button"
                        onClick={() => timing && seekToWord(timing.startMs)}
                        className={`rounded px-0.5 transition-colors ${isHighlighted ? "bg-amber-400/50 text-amber-100 font-extrabold" : ""} ${timing ? "cursor-pointer hover:text-amber-300" : "cursor-default"}`}
                      >
                        {word}
                      </button>
                    </span>
                  );
                })}
              </p>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Transcript hidden</p>
                <p className="text-sm text-slate-500">Listen first, then reveal.</p>
              </div>
            )}
          </div>

          {/* Cue timeline */}
          <div className="relative flex items-center gap-3 px-5 pb-5">
            <span className="text-xs font-semibold text-slate-400 tabular-nums whitespace-nowrap">
              {formatTimestamp(activeCue.startMs)}
            </span>
            <div className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
              <div ref={progressBarRef} className="h-full bg-amber-400 rounded-full" style={{ width: "0%" }} />
            </div>
            <span className="text-xs font-semibold text-slate-400 tabular-nums whitespace-nowrap">
              {formatTimestamp(activeCue.endMs)}
            </span>
            <span className="ml-1 text-xs font-black text-amber-400 tabular-nums whitespace-nowrap">
              {cueIndex + 1}/{activeCues.length}
            </span>
          </div>
        </div>

        {/* Status messages */}
        {!isAudioReady && !playbackError && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
            Preparing audio…
          </div>
        )}
        {playbackError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {playbackError}
          </div>
        )}
        {isInShadowingGap && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 text-center font-medium">
            Listening pause…
          </div>
        )}

        {/* Show/hide transcript toggle */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
          >
            {showTranscript ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
                Hide text
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Show text
              </>
            )}
          </button>
        </div>

        {/* Primary controls: Prev · Play/Pause · Next */}
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => selectCue(Math.max(0, cueIndex - 1), true)}
            disabled={controlsDisabled || cueIndex === 0 || isPlayingAll}
            aria-label="Previous cue"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-600 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.195 18.44c1.25.714 2.805-.189 2.805-1.629v-2.34l6.945 3.968c1.25.715 2.805-.188 2.805-1.628V8.69c0-1.44-1.555-2.343-2.805-1.628L12 11.029v-2.34c0-1.44-1.555-2.343-2.805-1.628l-7.108 4.061c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handlePlayPauseClick}
            disabled={controlsDisabled}
            aria-label={isCuePlaying ? "Pause" : "Play"}
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-amber-400 hover:bg-amber-300 shadow-lg flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCuePlaying || isInShadowingGap ? (
              <svg className="w-7 h-7 text-slate-950" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7 0a.75.75 0 01.75-.75H16a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-slate-950 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => selectCue(Math.min(activeCues.length - 1, cueIndex + 1), true)}
            disabled={controlsDisabled || cueIndex === activeCues.length - 1 || isPlayingAll}
            aria-label="Next cue"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-600 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.47v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256l-7.108-4.061C13.555 6.346 12 7.249 12 8.689v2.34L5.055 7.061z" />
            </svg>
          </button>
        </div>

        {/* Secondary controls: Shadowing · Translate · Record */}
        <div className="flex items-center justify-center gap-6 pt-1">
          {/* Shadowing button */}
          {isPlayingAll ? (
            <button
              type="button"
              onClick={stopShadowing}
              className="flex flex-col items-center gap-1.5 group"
              aria-label="Stop shadowing"
            >
              <div className="w-11 h-11 rounded-full bg-red-500 border border-red-400 shadow-sm flex items-center justify-center text-white transition group-hover:bg-red-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-red-500 transition">Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShadowingSheetOpen(true)}
              disabled={controlsDisabled}
              className="flex flex-col items-center gap-1.5 group disabled:opacity-40"
              aria-label="Start shadowing"
            >
              <div className="w-11 h-11 rounded-full border border-amber-300 bg-amber-50 shadow-sm flex items-center justify-center text-amber-600 transition group-hover:bg-amber-100 group-hover:border-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-amber-600 group-hover:text-amber-700 transition">Shadowing</span>
            </button>
          )}

          {/* Translate */}
          <button
            type="button"
            onClick={() => setModalFeature("translate")}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="Translate (requires app)"
          >
            <div className="w-11 h-11 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 transition group-hover:border-amber-300 group-hover:text-amber-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-700 transition">Translate</span>
          </button>

          {/* Record */}
          <button
            type="button"
            onClick={() => setModalFeature("record")}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="Record (requires app)"
          >
            <div className="w-11 h-11 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 transition group-hover:border-amber-300 group-hover:text-amber-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-700 transition">Record</span>
          </button>
        </div>

        {/* App hint */}
        <p className="text-center text-xs text-slate-400 pt-1">
          Translation &amp; recording require the{" "}
          <Link href="/download" className="font-semibold text-amber-600 hover:underline">
            Bantera app
          </Link>
        </p>
      </div>
    </>
  );
}
