import { NextResponse } from 'next/server';
import { getLearningLanguages } from '@/lib/bantera-api';

// Same-origin list of practice languages for the WebMCP browser tools.
export async function GET() {
  const languages = await getLearningLanguages();
  return NextResponse.json(
    {
      languages: languages.map((l) => ({ code: l.identifier, name: l.displayName, flag: l.flagEmoji })),
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
