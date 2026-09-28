'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { campaignToken, publicAnalyticsPath, type WebsiteEventName } from '@/lib/website-analytics';

const CONSENT_KEY = 'bantera-website-analytics-choice';
const SESSION_KEY = 'bantera-website-analytics-session';
type Choice = 'yes' | 'no' | null;
type Session = { id: string; touched: number; created: number; landingPath: string; referrerHost: string; utmSource: string; utmMedium: string; utmCampaign: string };
const blocked = () => navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
function choice(): Choice {
  if (blocked()) return 'no';
  try { const c = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); return c?.expires > Date.now() && ['yes', 'no'].includes(c.value) ? c.value : null; } catch { return null; }
}
function entry() {
  const q = new URLSearchParams(location.search);
  let referrerHost = '';
  try { referrerHost = new URL(document.referrer).hostname; } catch { /* No referrer is normal. */ }
  return { landingPath: publicAnalyticsPath(location.pathname) || '/', referrerHost,
    utmSource: campaignToken(q.get('utm_source')), utmMedium: campaignToken(q.get('utm_medium')), utmCampaign: campaignToken(q.get('utm_campaign')) };
}
let initialEntry: ReturnType<typeof entry> | null = null;
let memorySession: Session | null = null;
let lastPage = '';
const milestones = new Set<string>();
function session(): Session {
  const now = Date.now();
  if (!memorySession) { try { memorySession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { /* Memory-only fallback. */ } }
  if (!memorySession || now - memorySession.touched > 30 * 60_000 || now - memorySession.created > 24 * 60 * 60_000) {
    memorySession = { id: crypto.randomUUID(), created: now, touched: now, ...(initialEntry || { ...entry(), referrerHost: '', utmSource: '', utmMedium: '', utmCampaign: '' }) };
    initialEntry = null;
    milestones.clear();
  }
  memorySession.touched = now;
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(memorySession)); } catch { /* Optional storage. */ }
  return memorySession;
}
function send(name: WebsiteEventName, language = '') {
  if (choice() !== 'yes') return;
  const path = publicAnalyticsPath(location.pathname);
  if (!path) return;
  const s = session();
  const dedupe = `${s.id}:${name}:${path}`;
  if (name === 'lesson_play' || name === 'lesson_listened_30s') {
    if (milestones.has(dedupe)) return;
    milestones.add(dedupe);
  }
  const qLanguage = new URLSearchParams(location.search).get('languageCode') || '';
  const learningLanguage = language || document.querySelector<HTMLElement>('[data-learning-language]')?.dataset.learningLanguage || qLanguage;
  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
  const body = JSON.stringify([{ id: crypto.randomUUID(), sessionId: s.id, name, path,
    landingPath: s.landingPath, referrerHost: s.referrerHost, utmSource: s.utmSource,
    utmMedium: s.utmMedium, utmCampaign: s.utmCampaign,
    language: /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(learningLanguage) ? learningLanguage : '', device }]);
  // Best effort: never delay navigation, audio, or downloads; no persistent retry queue.
  if (!navigator.sendBeacon?.('/api/website-analytics', new Blob([body], { type: 'application/json' }))) {
    void fetch('/api/website-analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
}

export function WebsiteAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<Choice | 'loading'>('loading');
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    initialEntry ??= entry();
    // Read storage only after hydration.
    const timer = setTimeout(() => setConsent(choice()), 0);
    const custom = (e: Event) => { const d = (e as CustomEvent<{ name: WebsiteEventName; language?: string }>).detail; send(d.name, d.language); };
    const click = (e: MouseEvent) => {
      const a = (e.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const url = new URL(a.href);
      if (url.hostname === 'apps.apple.com') send('download_ios');
      if (url.origin === location.origin && url.pathname === '/bantera.apk') send('download_android');
    };
    document.addEventListener('click', click);
    window.addEventListener('bantera:analytics-event', custom);
    return () => { clearTimeout(timer); document.removeEventListener('click', click); window.removeEventListener('bantera:analytics-event', custom); };
  }, []);
  useEffect(() => {
    if (consent !== 'yes') return;
    const route = location.pathname + location.search;
    if (lastPage !== route) { lastPage = route; send('page_view'); }
  }, [pathname, searchParams, consent]);
  function choose(value: 'yes' | 'no') {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, expires: Date.now() + 180 * 86400_000 })); } catch { /* Collection stays disabled if consent cannot be saved. */ }
    if (value === 'no') {
      try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Optional storage. */ }
      memorySession = null; lastPage = ''; milestones.clear();
    }
    setConsent(value); setEditing(false);
  }
  if (!publicAnalyticsPath(pathname) || consent === 'loading') return null;
  return <>
    {(consent === null || editing) && <aside aria-label="Website analytics preference" className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-lg rounded-2xl border border-gray-300 bg-white p-5 text-sm text-gray-900 shadow-xl">
      <p className="font-semibold">Help improve language practice</p>
      <p className="mt-2">Allow Bantera to measure public page visits, referral sources, lesson playback and download clicks? No recordings or account details are included. <Link href="/privacy#website-analytics" className="underline">Privacy details</Link></p>
      <div className="mt-4 flex gap-3"><button className="rounded-lg border px-4 py-2" onClick={() => choose('no')}>Decline</button><button className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50" disabled={blocked()} onClick={() => choose('yes')}>Allow analytics</button></div>
      {blocked() && <p className="mt-2">Your browser privacy preference disables analytics.</p>}
    </aside>}
    <button className="mx-auto my-4 rounded px-3 py-2 text-xs text-gray-500 underline" onClick={() => setEditing(true)}>Analytics preferences</button>
  </>;
}
