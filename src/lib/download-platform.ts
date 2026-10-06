export type DownloadPlatform = 'ios' | 'ipad' | 'android' | 'desktop';

export function getDownloadPlatform(userAgent: string, maxTouchPoints = 0): DownloadPlatform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iPad/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ipad';
  if (/iPhone|iPod/i.test(userAgent)) return 'ios';
  return 'desktop';
}
