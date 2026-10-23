export function AppTourPlayer() {
  return (
    <div className="mx-auto w-full">
      <div className="relative aspect-video min-h-[200px] overflow-hidden rounded-2xl border border-white/20 bg-[#12101f] shadow-2xl shadow-black/30 sm:rounded-3xl">
        <iframe
          id="app-tour-video"
          src="https://www.youtube-nocookie.com/embed/6os38Z-LPrw?playsinline=1&rel=0"
          title="Bantera app tour"
          aria-describedby="app-tour-help"
          width={1920}
          height={1080}
          loading="lazy"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <p id="app-tour-help" className="mt-4 text-center text-xs leading-relaxed text-gray-400">
        English narration · Play with sound.
      </p>
    </div>
  );
}
