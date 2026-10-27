import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/dashboard-api';
import { getApiBaseUrl } from '@/lib/bantera-api';

type Context = { params: Promise<{ path?: string[] }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function proxy(request: NextRequest, context: Context) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { path = [] } = await context.params;
  const valid = (request.method === 'GET' && path.length === 1 && ['status', 'generation-settings'].includes(path[0])) ||
    (path[0] === 'jobs' && ((path.length === 1 && ['GET', 'POST'].includes(request.method)) ||
      (idPattern.test(path[1] ?? '') && ((path.length === 2 && ['GET', 'DELETE'].includes(request.method)) ||
        (path.length === 3 && ((path[2] === 'assessment' && request.method === 'PUT') || (path[2] === 'audio' && request.method === 'GET')))))));
  if (!valid) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).host !== request.headers.get('host'))
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (path[2] === 'audio' && request.headers.has('range')) headers.Range = request.headers.get('range')!;
    let body: Uint8Array | undefined;
    if (['POST', 'PUT'].includes(request.method)) {
      const limit = request.method === 'PUT' ? 16384 : 12 * 1024 * 1024;
      if (Number(request.headers.get('content-length')) > limit) return new NextResponse(null, { status: 413 });
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return new NextResponse(null, { status: 415 });
      // Enforce a streaming cap even when Content-Length is absent or forged.
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) { await reader.cancel(); return new NextResponse(null, { status: 413 }); }
          chunks.push(value);
        }
      }
      body = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${getApiBaseUrl()}/api/admin/model-tests/${path.join('/')}`, {
      method: request.method, headers, body: body as BodyInit | undefined, cache: 'no-store', signal: AbortSignal.timeout(25000),
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'private, no-store' });
    for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const value = response.headers.get(name); if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Could not reach model testing. Check job history before retrying.' }, { status: 502 });
  }
}
export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
export const PUT = proxy;
