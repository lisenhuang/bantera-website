import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/site-content';

export function DownloadLinks({ compact = false }: { compact?: boolean }) {
  const style = `inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500 ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`;
  return <div className="flex flex-wrap items-center gap-2" aria-label="Download Bantera">
    <a href={APP_STORE_URL} className={`${style} bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950`} aria-label="Download Bantera on the App Store">App Store <span aria-hidden="true" className="ml-2">↗</span></a>
    <a href={GOOGLE_PLAY_URL} className={`${style} bg-violet-700 text-white hover:bg-violet-800`} aria-label="Get Bantera on Google Play">Google Play <span aria-hidden="true" className="ml-2">↗</span></a>
  </div>;
}
