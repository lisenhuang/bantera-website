import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/dashboard-api';
import { getApiBaseUrl } from '@/lib/bantera-api';

type Context = { params: Promise<{ path?: string[] }> };

async function proxy(request: NextRequest, context: Context) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { path = [] } = await context.params;
  const validPath = path.length === 0 || (path.length <= 2 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path[0]) &&
    (path.length === 1 || path[1] === 'audio'));
  if (!validPath || (request.method === 'POST' && path.length !== 0))
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).host !== request.headers.get('host'))
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (request.method === 'POST') headers['Content-Type'] = 'application/json';
    if (request.headers.has('range')) headers.Range = request.headers.get('range')!;
    const url = new URL(`${getApiBaseUrl()}/api/admin/audio-tests${path.length ? '/' + path.join('/') : ''}`);
    if (path.length === 0 && request.nextUrl.searchParams.has('offset'))
      url.searchParams.set('offset', request.nextUrl.searchParams.get('offset')!);
    const response = await fetch(url, {
      method: request.method, headers, cache: 'no-store',
      body: request.method === 'POST' ? await request.text() : undefined,
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'private, no-store' });
    for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Could not reach the audio test service.' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
