// Deliberately collect only public routes and explicit campaign tokens, never search text.
export function publicAnalyticsPath(value: string): string | null {
  const path = value.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  return /^\/(?:learn(?:\/[a-z-]+)?|webapp(?:\/studio|\/shadowing\/[\da-f-]{36}|\/[\da-f-]{36})?|download|faq|support|privacy|delete-account)?$/i.test(path) ? path : null;
}
export function campaignToken(value: string | null): string {
  return value && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value) ? value : '';
}
export type WebsiteEventName = 'page_view' | 'lesson_play' | 'lesson_listened_30s' | 'download_ios' | 'download_android';
export function trackWebsiteEvent(name: WebsiteEventName, language = '') {
  window.dispatchEvent(new CustomEvent('bantera:analytics-event', { detail: { name, language } }));
}
