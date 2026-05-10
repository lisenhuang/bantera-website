import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, listAdminMessages } from '@/lib/dashboard-api';

export async function GET(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  try {
    const result = await listAdminMessages(token, {
      threadType: searchParams.get('threadType') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 20),
      offset: Number(searchParams.get('offset') ?? 0),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
