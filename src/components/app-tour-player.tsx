'use client';

import { useRef, useState } from 'react';

const VIDEO_URL = '/videos/bantera-app-tour-20261020.mp4';

type SafariVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

export function AppTourPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fullscreenUnavailable, setFullscreenUnavailable] = useState(false);

  async function enterFullscreen() {
    const video = videoRef.current as SafariVideoElement | null;
    if (!video) return;

    try {
      // iPhone Safari uses its native video player rather than element fullscreen.
      if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      } else {
        await video.requestFullscreen();
      }
      setFullscreenUnavailable(false);
    } catch {
      setFullscreenUnavailable(true);
    }
  }

  async function play() {
    try {
      await videoRef.current?.play();
    } catch {
      // Keep native controls and the direct link available if playback is blocked.
      setFailed(true);
    }
  }

  return (
    <div className="mx-auto w-full">
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-[#12101f] sm:rounded-3xl shadow-2xl shadow-black/30">
        <video
          ref={videoRef}
          id="app-tour-video"
          aria-label="Bantera app tour with English narration"
          aria-describedby="app-tour-help"
          width={1920}
          height={1080}
          controls
          playsInline
          preload="none"
          poster="/videos/bantera-app-tour-20261020.webp"
          className="block aspect-video h-auto w-full"
          onPlay={() => { setStarted(true); setFailed(false); }}
          onError={() => setFailed(true)}
        >
          <source src={VIDEO_URL} type="video/mp4" />
          <track src="/videos/bantera-app-tour-20261020.vtt" kind="captions" srcLang="en" label="English" />
          Your browser cannot play this video. <a href={VIDEO_URL}>Open the app tour</a>.
        </video>
        {started && !failed && (
          <button
            type="button"
            onClick={enterFullscreen}
            aria-label="Enter full screen"
            title="Full screen"
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-950/90 text-white shadow-lg hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
              <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
            </svg>
          </button>
        )}
        {!started && !failed && (
          <button
            type="button"
            onClick={play}
            aria-label="Play the Bantera app tour with sound"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 whitespace-nowrap items-center justify-center gap-3 rounded-2xl bg-gray-950/95 px-5 py-4 sm:px-7 sm:py-5 text-sm font-bold text-white shadow-xl transition-colors hover:bg-orange-600 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M8 5v14l11-7z" /></svg>
            Play tour <span className="font-normal text-white/70">4:49</span>
          </button>
        )}
      </div>
      <p id="app-tour-help" className="mt-4 text-center text-xs leading-relaxed text-gray-400">
        {failed ? (
          <>
            Playback unavailable?{' '}
            <a href={VIDEO_URL} className="rounded underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400">Open the video</a>
          </>
        ) : 'English narration · Play with sound.'}
      </p>
      {fullscreenUnavailable && (
        <p role="status" className="mt-2 text-center text-xs text-gray-400">
          Full screen is unavailable in this browser. You can keep watching here.
        </p>
      )}
    </div>
  );
}
