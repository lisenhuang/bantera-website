import { getApiBaseUrl } from '@/lib/bantera-api';

export async function POST(request: Request) {
  // Same-origin browser requests only. No cookies or account token forwarded upstream.
  const origin = request.headers.get('origin');
  const allowed = process.env.NODE_ENV === 'production'
    ? ['https://bantera.app', 'https://www.bantera.app']
    : [new URL(request.url).origin, 'http://localhost:2268'];
  if (!origin || !allowed.includes(origin)) return new Response(null, { status: 403 });
  if (/bot|crawler|spider|headless|preview/i.test(request.headers.get('user-agent') || '')) return new Response(null, { status: 204 });
  if (request.headers.get('sec-gpc') === '1' || request.headers.get('dnt') === '1') return new Response(null, { status: 204 });
  const key = process.env.BANTERA_ANALYTICS_INGEST_KEY;
  if (!key || key.length < 32) return new Response(null, { status: 503 });
  // Enforce the real body size, including chunked requests, before JSON parsing.
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    const data: unknown = JSON.parse(body.toString('utf8'));
    if (!Array.isArray(data) || data.length < 1 || data.length > 10) return new Response(null, { status: 400 });
    const res = await fetch(`${getApiBaseUrl()}/api/website-analytics/events`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Website-Analytics-Key': key }, body,
      signal: AbortSignal.timeout(4000), cache: 'no-store' });
    return new Response(null, { status: res.ok ? 204 : res.status === 400 ? 400 : 503 });
  } catch { return new Response(null, { status: 503 }); }
}
