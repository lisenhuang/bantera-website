import { LANGUAGE_GUIDES } from '@/lib/language-guides';
import { INTRODUCTIONS } from '@/lib/localized-introductions';
import { PRODUCT_FEATURES, PRODUCT_AVAILABILITY } from '@/lib/product-features';
import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
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

${PRODUCT_AVAILABILITY}

## Mobile features

${PRODUCT_FEATURES.map(f => `- [${f.title}](${SITE_URL}/features#${f.id}): ${f.body}`).join("\n")}

- Platform: Android app on Google Play (${GOOGLE_PLAY_URL}), iOS app (${APP_STORE_URL}), plus a free browser web app for listening practice at ${SITE_URL}/webapp
- Languages: ${SUPPORTED_LANGUAGES.join(', ')}
- Developer: Lisen Huang — contact ${CONTACT_EMAIL} — X: ${X_URL}

## Pages

${SITE_PAGES.map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`).join('\n')}

## Learning guides

${LANGUAGE_GUIDES.map(g => `- [${g.name}](${SITE_URL}/learn/${g.slug}): ${g.focus}`).join("\n")}

## Translated introductions

${INTRODUCTIONS.map(i => `- [${i.name}](${SITE_URL}/about/${i.locale})`).join("\n")}

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
