'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { showPublicDownload } from '@/lib/public-download';
import { DownloadLinks } from './download-links';

// In document flow: no overlay over lesson controls, cookie notices or small screens.
// Server-rendered anchors work without user-agent detection or an intermediate page.
export function PublicDownloadBanner() {
  const pathname = usePathname();
  if (!showPublicDownload(pathname)) return null;
  return <aside aria-label="Get the Bantera app" className="border-b border-violet-200 bg-violet-50 px-4 py-3 text-slate-950 dark:border-violet-900 dark:bg-slate-900 dark:text-white">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <Link href="/download" className="text-sm font-bold">Bantera <span className="hidden sm:inline font-normal text-slate-600 dark:text-slate-300">· Speaking & listening in your pocket</span></Link>
      <DownloadLinks compact />
    </div>
  </aside>;
}
