import {
  APP_STORE_URL,
  CONTACT_EMAIL,
  SITE_PAGES,
  SITE_SUMMARY,
  SITE_URL,
  SUPPORTED_LANGUAGES,
  X_URL,
} from '@/lib/site-content';

// /llms.txt — a concise, Markdown index of the site for language models (llmstxt.org).
// The longer companion with every FAQ answer and the public lesson catalogue is
// /llms-full.txt.
export const dynamic = 'force-static';

export function GET() {
  const body = `# Bantera

> ${SITE_SUMMARY}

Bantera is built around speaking, not tapping: you play real audio one cue (sentence) at a time, hide or reveal subtitles and translations, repeat it, record yourself, and compare your pronunciation with the original. It also connects learners with native-speaker exchange partners through voice messages.

- Platform: iOS app (${APP_STORE_URL}), plus a free browser web app for listening practice at ${SITE_URL}/webapp
- Languages: ${SUPPORTED_LANGUAGES.join(', ')}
- Developer: Lisen Huang — contact ${CONTACT_EMAIL} — X: ${X_URL}

## Pages

${SITE_PAGES.map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`).join('\n')}

## Practise in the browser

- [Public audio lessons](${SITE_URL}/webapp): choose a language, then open any lesson.
- Lesson pages live at ${SITE_URL}/webapp/shadowing/{id}. Each plays cue by cue with word-level highlighting, adjustable speed, and a hidden-by-default transcript.
- These pages expose WebMCP tools, so a browser agent can list lessons, read a transcript, and play a cue on the user's behalf.

## Optional

- [Full reference](${SITE_URL}/llms-full.txt): every FAQ answer and the current catalogue of public lessons by language.
- [Sitemap](${SITE_URL}/sitemap.xml)
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
