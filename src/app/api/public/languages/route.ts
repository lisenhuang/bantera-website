import { NextResponse } from 'next/server';
import { getLearningLanguages } from '@/lib/bantera-api';
import { languageChoiceContextFromHeaders } from '@/lib/language-choice-policy';

// Same-origin list of practice languages for the WebMCP browser tools.
export async function GET(request: Request) {
  const languages = await getLearningLanguages(languageChoiceContextFromHeaders(request.headers));
  return NextResponse.json(
    {
      languages: languages.map((l) => ({ code: l.identifier, name: l.displayName, flag: l.flagEmoji })),
    },
    { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'CF-IPCountry, Accept-Language, X-Bantera-System-Language' } },
  );
}
