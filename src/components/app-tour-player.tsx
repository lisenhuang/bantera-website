'use client';

import { useRef, useState } from 'react';

const VIDEO_URL = '/videos/bantera-app-tour-20261015.mp4';

export function AppTourPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  async function play() {
    try {
      await videoRef.current?.play();
    } catch {
      // Keep native controls and the direct link available if playback is blocked.
      setFailed(true);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[360px] md:max-w-[clamp(240px,calc((100svh-220px)*9/16),360px)]">
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-[#f5f2fc] shadow-2xl shadow-black/30">
        <video
          ref={videoRef}
          id="app-tour-video"
          aria-label="Bantera app tour with English narration"
          aria-describedby="app-tour-help"
          width={1080}
          height={1920}
          controls
          playsInline
          preload="none"
          poster="/videos/bantera-app-tour-20261015.webp"
          className="block aspect-[9/16] h-auto w-full"
          onPlay={() => { setStarted(true); setFailed(false); }}
          onError={() => setFailed(true)}
        >
          <source src={VIDEO_URL} type="video/mp4" />
          Your browser cannot play this video. <a href={VIDEO_URL}>Open the app tour</a>.
        </video>
        {!started && !failed && (
          <button
            type="button"
            onClick={play}
            aria-label="Play the Bantera app tour with sound"
            className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 items-center justify-center gap-3 rounded-2xl bg-gray-950/95 px-5 py-5 text-sm font-bold text-white shadow-xl transition-colors hover:bg-orange-600 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M8 5v14l11-7z" /></svg>
            Play tour <span className="font-normal text-white/70">2:42</span>
          </button>
        )}
      </div>
      <p id="app-tour-help" className="mt-4 text-center text-xs leading-relaxed text-gray-400">
        {failed ? 'Playback unavailable? ' : 'English narration · Play with sound. '}
        <a href={VIDEO_URL} className="rounded underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400">Open video full size</a>
      </p>
    </div>
  );
}
