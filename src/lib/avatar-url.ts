/** API fetches may use a private Docker host; browser images must use the public origin. */
export function avatarUrlForBrowser(value: string | null): string | null {
  if (!value) return null;
  try {
    const publicBase = process.env.NEXT_PUBLIC_BANTERA_API_BASE_URL?.trim() || 'https://api.bantera.app';
    const url = new URL(value, publicBase);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (/^\/api\/users\/[0-9a-f-]{36}\/avatar$/i.test(url.pathname)) {
      return new URL(url.pathname + url.search, publicBase).toString();
    }
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
