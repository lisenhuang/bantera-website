import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, listAdminVideos } from '@/lib/dashboard-api';

export async function GET(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const isPublicStr = searchParams.get('isPublic');
  const isAiGeneratedStr = searchParams.get('isAiGenerated');

  try {
    const result = await listAdminVideos(token, {
      languageCode: searchParams.get('languageCode') ?? undefined,
      isPublic: isPublicStr != null ? isPublicStr === 'true' : undefined,
      isAiGenerated: isAiGeneratedStr != null ? isAiGeneratedStr === 'true' : undefined,
      sort: searchParams.get('sort') ?? undefined,
      dir: searchParams.get('dir') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 20),
      offset: Number(searchParams.get('offset') ?? 0),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
