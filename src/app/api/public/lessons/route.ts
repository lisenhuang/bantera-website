import { NextRequest, NextResponse } from 'next/server';
import { listPublicAudios } from '@/lib/bantera-api';

// Same-origin, compact lesson search for the WebMCP browser tools. The backend API sends
// no CORS headers, so browser code cannot call it directly.

export type PublicLessonSummary = {
  id: string;
  title: string;
  url: string;
  languageCode: string;
  language: string;
  durationSec: number;
  cues: number;
  isAiGenerated: boolean;
  preview: string | null;
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const languageCode = params.get('languageCode')?.trim();
  const search = params.get('search')?.trim().slice(0, 100) || undefined;
  const limit = Math.min(Math.max(Number(params.get('limit')) || 10, 1), 25);

  if (!languageCode) {
    return NextResponse.json({ error: 'languageCode is required, for example "en-US".' }, { status: 400 });
  }

  try {
    const audios = await listPublicAudios({ languageCode, search, limit });
    const lessons: PublicLessonSummary[] = audios.map((a) => ({
      id: a.id,
      title: a.originalFileName,
      url: `/webapp/shadowing/${a.id}`,
      languageCode: a.transcriptLanguageCode,
      language: a.transcriptLanguage,
      durationSec: Math.round(a.durationMs / 1000),
      cues: a.transcriptCues.length,
      isAiGenerated: a.isAiGenerated,
      preview: a.transcriptCues.find((c) => c.text.trim())?.text.trim().slice(0, 160) ?? null,
    }));

    return NextResponse.json(
      { languageCode, count: lessons.length, lessons },
      { headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  } catch {
    return NextResponse.json({ error: 'Lessons are unavailable right now.' }, { status: 502 });
  }
}
