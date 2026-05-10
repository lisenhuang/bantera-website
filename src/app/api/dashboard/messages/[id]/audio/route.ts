import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/dashboard-api';
import { getApiBaseUrl } from '@/lib/bantera-api';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const upstream = await fetch(`${getApiBaseUrl()}/api/admin/messages/${id}/audio`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Audio not found.' }, { status: upstream.status });
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  const totalBytes = bytes.byteLength;
  const rangeHeader = request.headers.get('range');

  const headers = new Headers();
  headers.set('content-type', upstream.headers.get('content-type') ?? 'audio/m4a');
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'no-store');

  if (rangeHeader?.startsWith('bytes=')) {
    const [rawStart, rawEnd] = rangeHeader.slice('bytes='.length).split('-', 2);
    const start = rawStart ? parseInt(rawStart, 10) : 0;
    const end = rawEnd ? Math.min(parseInt(rawEnd, 10), totalBytes - 1) : totalBytes - 1;
    if (start >= 0 && start <= end && end < totalBytes) {
      const slice = bytes.slice(start, end + 1);
      headers.set('content-length', String(slice.byteLength));
      headers.set('content-range', `bytes ${start}-${end}/${totalBytes}`);
      return new Response(slice, { status: 206, headers });
    }
  }

  headers.set('content-length', String(totalBytes));
  return new Response(bytes, { status: 200, headers });
}
