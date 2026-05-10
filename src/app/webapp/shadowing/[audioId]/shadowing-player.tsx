"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  BanteraPublicAudio,
  BanteraTranscriptCue,
  BanteraWordTiming,
} from "@/lib/bantera-api";

// ── Constants ──────────────────────────────────────────────────────────────────

const SPEED_STEPS = [1, 0.75, 0.5, 1.25] as const;

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
  // Collect timing entries whose startMs falls within this cue (with a small tolerance)
  const cueTimings = wordTiming.filter(
    (w) => w.startMs >= cue.startMs - 300 && w.startMs < cue.endMs + 300,
  );
  // Zip by index — if more words than timing entries, the extras get null
  return words.map((_, i) => cueTimings[i] ?? null);
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
        {/* Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
          {isTranslate ? (
            <svg
              className="w-7 h-7 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"
              />
            </svg>
          ) : (
            <svg
              className="w-7 h-7 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
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

        <a
          href="/download"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 w-full rounded-2xl bg-amber-400 hover:bg-amber-300 transition px-5 py-3.5 text-sm font-black text-slate-950"
        >
          Get the Bantera app →
        </a>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
        >
          Maybe later
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
  const [showTranscript, setShowTranscript] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<
    number | null
  >(null);
  const [modalFeature, setModalFeature] = useState<
    "translate" | "record" | null
  >(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const playbackRate = SPEED_STEPS[speedIndex];
  const activeCues = cueMode === "short" && hasShortCues ? shortCues : longCues;
  const activeCue = activeCues[cueIndex] ?? null;
  const audioSrc = `/api/public-audio/${audio.id}/file`;

  // Restore mode preference from localStorage (after hydration)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        `bantera.shadowing.${audio.id}.mode`,
      );
      if (stored === "short" && hasShortCues) setCueModeRaw("short");
    } catch {}
  }, [audio.id, hasShortCues]);

  // Apply playback rate to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Wire up audio element events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    setIsAudioReady(false);
    setPlaybackError(null);

    const onReady = () => {
      setIsAudioReady(true);
      setPlaybackError(null);
    };
    const onPause = () => setIsCuePlaying(false);
    const onEnded = () => setIsCuePlaying(false);
    const onError = () => {
      setIsAudioReady(false);
      setPlaybackError(
        "Bantera could not play this audio right now. Try refreshing the page.",
      );
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
    () =>
      activeCue ? computeCueWordTimings(audio.wordTiming, activeCue) : [],
    [activeCue, audio.wordTiming],
  );

  // rAF loop: stop at cue end, update word highlight and progress bar
  useEffect(() => {
    if (!isCuePlaying || !activeCue) return;
    const el = audioRef.current;
    if (!el) return;

    let frameId: number;

    const tick = () => {
      const currentMs = el.currentTime * 1000;

      // Stop when we hit the cue boundary
      if (currentMs >= activeCue.endMs) {
        el.pause();
        el.currentTime = activeCue.startMs / 1000;
        setIsCuePlaying(false);
        setHighlightedWordIndex(null);
        if (progressBarRef.current) progressBarRef.current.style.width = "0%";
        return;
      }

      // Progress bar (direct DOM update to avoid React re-render overhead)
      const cueDuration = activeCue.endMs - activeCue.startMs;
      const progress =
        cueDuration > 0
          ? Math.max(0, Math.min(1, (currentMs - activeCue.startMs) / cueDuration))
          : 0;
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress * 100}%`;
      }

      // Word highlight (only update state when index actually changes)
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
  }, [isCuePlaying, activeCue, cueWordTimings]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function pausePlayback() {
    audioRef.current?.pause();
    setIsCuePlaying(false);
    setHighlightedWordIndex(null);
    if (progressBarRef.current) progressBarRef.current.style.width = "0%";
  }

  async function seekAndPlay(fromMs: number) {
    const el = audioRef.current;
    if (!el || !activeCue || !isAudioReady) return;
    try {
      setPlaybackError(null);
      el.currentTime = fromMs / 1000;
      el.playbackRate = playbackRate;
      await el.play();
      setIsCuePlaying(true);
    } catch {
      setPlaybackError("Bantera could not start playback. Try again.");
      setIsCuePlaying(false);
    }
  }

  function playCurrentCue() {
    return seekAndPlay(activeCue?.startMs ?? 0);
  }

  function selectCue(nextIndex: number) {
    pausePlayback();
    setCueIndex(nextIndex);
  }

  function setCueMode(mode: "long" | "short") {
    pausePlayback();
    setCueModeRaw(mode);
    setCueIndex(0);
    try {
      localStorage.setItem(`bantera.shadowing.${audio.id}.mode`, mode);
    } catch {}
  }

  function seekToWord(startMs: number) {
    if (isCuePlaying && audioRef.current) {
      audioRef.current.currentTime = startMs / 1000;
    } else {
      void seekAndPlay(startMs);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!activeCue) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-red-700">
        This audio has no transcript cues to practice with.
      </div>
    );
  }

  const words = activeCue.text.split(/\s+/).filter(Boolean);

  return (
    <>
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="auto"
        playsInline
        className="hidden"
      />

      {modalFeature && (
        <GetAppModal
          feature={modalFeature}
          onClose={() => setModalFeature(null)}
        />
      )}

      <div className="space-y-4">
        {/* Top row: long/short toggle + speed */}
        <div className="flex items-center justify-between gap-3">
          {hasShortCues ? (
            <div className="flex rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden text-sm font-semibold">
              <button
                type="button"
                onClick={() => setCueMode("long")}
                className={`px-4 py-1.5 transition ${
                  cueMode === "long"
                    ? "bg-slate-950 text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setCueMode("short")}
                className={`px-4 py-1.5 transition ${
                  cueMode === "short"
                    ? "bg-slate-950 text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Short
              </button>
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() =>
              setSpeedIndex((i) => (i + 1) % SPEED_STEPS.length)
            }
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700 tabular-nums"
          >
            {playbackRate === 1 ? "1×" : `${playbackRate}×`}
          </button>
        </div>

        {/* Player surface */}
        <div className="relative rounded-[2rem] overflow-hidden min-h-[260px] sm:min-h-[320px] flex flex-col">
          {/* Background */}
          {audio.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={audio.coverImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
          <div
            className={`absolute inset-0 ${
              audio.coverImageUrl
                ? "bg-gradient-to-b from-slate-900/30 via-slate-900/60 to-slate-900/85"
                : "bg-slate-950"
            }`}
          />

          {/* Transcript content */}
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
                        className={`rounded px-0.5 transition-colors ${
                          isHighlighted
                            ? "bg-amber-400/50 text-amber-100 font-extrabold"
                            : ""
                        } ${timing ? "cursor-pointer hover:text-amber-300" : "cursor-default"}`}
                      >
                        {word}
                      </button>
                    </span>
                  );
                })}
              </p>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Transcript hidden
                </p>
                <p className="text-sm text-slate-500">
                  Listen first, then reveal.
                </p>
              </div>
            )}
          </div>

          {/* Cue timeline at bottom of card */}
          <div className="relative flex items-center gap-3 px-5 pb-5">
            <span className="text-xs font-semibold text-slate-400 tabular-nums whitespace-nowrap">
              {formatTimestamp(activeCue.startMs)}
            </span>
            <div className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
              <div
                ref={progressBarRef}
                className="h-full bg-amber-400 rounded-full"
                style={{ width: "0%" }}
              />
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

        {/* Show/hide transcript toggle */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
          >
            {showTranscript ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
                Hide text
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
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
            onClick={() => selectCue(Math.max(0, cueIndex - 1))}
            disabled={cueIndex === 0 || !isAudioReady}
            aria-label="Previous cue"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-600 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9.195 18.44c1.25.714 2.805-.189 2.805-1.629v-2.34l6.945 3.968c1.25.715 2.805-.188 2.805-1.628V8.69c0-1.44-1.555-2.343-2.805-1.628L12 11.029v-2.34c0-1.44-1.555-2.343-2.805-1.628l-7.108 4.061c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={isCuePlaying ? pausePlayback : playCurrentCue}
            disabled={!isAudioReady}
            aria-label={isCuePlaying ? "Pause" : "Play"}
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-amber-400 hover:bg-amber-300 shadow-lg flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCuePlaying ? (
              <svg
                className="w-7 h-7 text-slate-950"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7 0a.75.75 0 01.75-.75H16a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-7 h-7 text-slate-950 ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              selectCue(Math.min(activeCues.length - 1, cueIndex + 1))
            }
            disabled={cueIndex === activeCues.length - 1 || !isAudioReady}
            aria-label="Next cue"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-600 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.47v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256l-7.108-4.061C13.555 6.346 12 7.249 12 8.689v2.34L5.055 7.061z" />
            </svg>
          </button>
        </div>

        {/* Secondary controls: Translate + Record */}
        <div className="flex items-center justify-center gap-8 pt-1">
          <button
            type="button"
            onClick={() => setModalFeature("translate")}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="Translate (requires app)"
          >
            <div className="w-11 h-11 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 transition group-hover:border-amber-300 group-hover:text-amber-700">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"
                />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-700 transition">
              Translate
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModalFeature("record")}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="Record (requires app)"
          >
            <div className="w-11 h-11 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 transition group-hover:border-amber-300 group-hover:text-amber-700">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-700 transition">
              Record
            </span>
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
