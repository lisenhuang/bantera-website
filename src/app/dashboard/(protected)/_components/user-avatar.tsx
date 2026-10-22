"use client";

import { useState } from 'react';
import { avatarUrlForBrowser } from '@/lib/avatar-url';

export function UserAvatar({ avatarUrl, name, size = 32 }: {
  avatarUrl: string | null; name: string | null; size?: number;
}) {
  const src = avatarUrlForBrowser(avatarUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initial = Array.from(name?.trim() || '?')[0].toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) };
  return (
    <span aria-hidden="true" style={style} className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
      {initial}
      {src && failedSrc !== src ? (
        // Public profile endpoint already serves cached, sized avatar files.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} loading="lazy" onError={() => setFailedSrc(src)} className="absolute inset-0 h-full w-full rounded-full object-cover" />
      ) : null}
    </span>
  );
}
