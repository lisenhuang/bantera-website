/** Do not advertise over administration, development or authentication screens. */
export function showPublicDownload(pathname: string | null): boolean {
  if (!pathname) return false;
  return !['/dashboard', '/dev', '/api', '/download', '/auth'].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
