"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { BanteraPublicAudio } from "@/lib/bantera-api";

function formatTimestamp(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type CuePracticePlayerProps = {
  audio: BanteraPublicAudio;
};

export function CuePracticePlayer({ audio }: CuePracticePlayerProps) {
  const cues = useMemo(
    () => audio.transcriptCues.filter((cue) => cue.text.trim().length > 0),
    [audio.transcriptCues],
  );
  const [cueIndex, setCueIndex] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isCuePlaying, setIsCuePlaying] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeCue = cues[cueIndex] ?? null;
  const playableAudioUrl = `/api/public-audio/${audio.id}/file`;

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !activeCue) {
      return;
    }

    let frameId = 0;
    const endSeconds = activeCue.endMs / 1000;

    const stopAtCueEnd = () => {
      if (!audioRef.current) {
        return;
      }
      if (audioRef.current.currentTime >= endSeconds) {
        audioRef.current.pause();
        audioRef.current.currentTime = activeCue.startMs / 1000;
        setIsCuePlaying(false);
        return;
      }
      frameId = window.requestAnimationFrame(stopAtCueEnd);
    };

    if (isCuePlaying) {
      frameId = window.requestAnimationFrame(stopAtCueEnd);
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [activeCue, isCuePlaying]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element) {
      return;
    }

    setIsAudioReady(false);
    setPlaybackError(null);

    const handleReady = () => {
      setIsAudioReady(true);
      setPlaybackError(null);
    };
    const handlePause = () => setIsCuePlaying(false);
    const handleEnded = () => setIsCuePlaying(false);
    const handleError = () => {
      setIsAudioReady(false);
      setPlaybackError(
        "Bantera could not play this audio right now. Try refreshing the page.",
      );
    };

    element.addEventListener("loadedmetadata", handleReady);
    element.addEventListener("loadeddata", handleReady);
    element.addEventListener("canplay", handleReady);
    element.addEventListener("durationchange", handleReady);
    element.addEventListener("pause", handlePause);
    element.addEventListener("ended", handleEnded);
    element.addEventListener("error", handleError);
    element.load();

    if (element.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setIsAudioReady(true);
    }

    return () => {
      element.removeEventListener("loadedmetadata", handleReady);
      element.removeEventListener("loadeddata", handleReady);
      element.removeEventListener("canplay", handleReady);
      element.removeEventListener("durationchange", handleReady);
      element.removeEventListener("pause", handlePause);
      element.removeEventListener("ended", handleEnded);
      element.removeEventListener("error", handleError);
    };
  }, [playableAudioUrl]);

  async function playCurrentCue() {
    if (!audioRef.current || !activeCue) {
      return;
    }

    if (!isAudioReady) {
      setPlaybackError(
        "Audio is still preparing on this device. Try again in a moment.",
      );
      return;
    }

    try {
      setPlaybackError(null);
      const element = audioRef.current;
      element.currentTime = activeCue.startMs / 1000;
      await element.play();
      setIsCuePlaying(true);
    } catch {
      setPlaybackError(
        "Bantera could not start playback for this cue. Try again.",
      );
      setIsCuePlaying(false);
    }
  }

  function pausePlayback() {
    audioRef.current?.pause();
    setIsCuePlaying(false);
  }

  function selectCue(nextIndex: number) {
    pausePlayback();
    setShowTranscript(false);
    setCueIndex(nextIndex);
  }

  if (!playableAudioUrl || !activeCue) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-red-700">
        This public audio is missing a playable file or transcript cues.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <audio ref={audioRef} src={playableAudioUrl} preload="auto" playsInline />

      <div className="rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
              Cue {cueIndex + 1} / {cues.length}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              {formatTimestamp(activeCue.startMs)} -{" "}
              {formatTimestamp(activeCue.endMs)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowTranscript((value) => !value)}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-amber-300 hover:text-amber-200"
          >
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-white/6 px-5 py-6">
          {showTranscript ? (
            <p className="text-lg font-semibold leading-8 text-white sm:text-xl">
              {activeCue.text}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">
                Transcript hidden
              </div>
              <p className="max-w-xl text-base leading-7 text-slate-300">
                Listen to the cue first. Reveal the text only when you want to
                check yourself.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => selectCue(Math.max(0, cueIndex - 1))}
            disabled={cueIndex === 0 || !isAudioReady}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={isCuePlaying ? pausePlayback : playCurrentCue}
            disabled={!isAudioReady}
            className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-200"
          >
            {isCuePlaying ? "Pause cue" : "Play cue"}
          </button>
          <button
            type="button"
            onClick={playCurrentCue}
            disabled={!isAudioReady}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Replay cue
          </button>
          <button
            type="button"
            onClick={() => selectCue(Math.min(cues.length - 1, cueIndex + 1))}
            disabled={cueIndex === cues.length - 1 || !isAudioReady}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>

        {!isAudioReady ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            Preparing audio on this device...
          </div>
        ) : null}

        {playbackError ? (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {playbackError}
          </div>
        ) : null}
      </div>

    </div>
  );
}
