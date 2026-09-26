import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, listAdminPipelineRuns } from '@/lib/dashboard-api';

export async function GET(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const isPublic = searchParams.get('isPublic');
  const isAiGenerated = searchParams.get('isAiGenerated');
  try {
    const result = await listAdminPipelineRuns(token, {
      languageCode: searchParams.get('languageCode') ?? undefined,
      isPublic: isPublic == null ? undefined : isPublic === 'true',
      isAiGenerated: isAiGenerated == null ? undefined : isAiGenerated === 'true',
      sort: searchParams.get('sort') ?? undefined,
      dir: searchParams.get('dir') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 20),
      offset: Number(searchParams.get('offset') ?? 0),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to load generation history' }, { status: 500 });
  }
}
