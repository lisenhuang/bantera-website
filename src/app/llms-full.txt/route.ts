import {
  getLearningLanguages,
  listPublicAudios,
  type BanteraLearningLanguage,
  type BanteraPublicAudio,
} from '@/lib/bantera-api';
import {
  APP_STORE_URL,
  CONTACT_EMAIL,
  FAQS,
  SITE_PAGES,
  SITE_SUMMARY,
  SITE_URL,
  SUPPORTED_LANGUAGES,
} from '@/lib/site-content';

// /llms-full.txt — the long-form companion to /llms.txt: every FAQ answer in full plus the
// live catalogue of public lessons, so an answer engine can cite specific lessons.
// Built per request from the public API; cached at the edge for an hour.

const LESSONS_PER_LANGUAGE = 10;

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

/** Titles are user-provided; keep them on one line so they cannot break the Markdown list. */
function oneLine(text: string) {
  return text.replace(/[\r\n]+/g, ' ').replace(/[[\]]/g, '').trim();
}

type CatalogueSection = { heading: string; lessons: BanteraPublicAudio[] };

/**
 * The public API matches a language family, so "en-US" and "en-GB" return the same English
 * lessons. Fetch per practice language, then de-duplicate and regroup by each lesson's own
 * language so every lesson appears exactly once. Lessons without cues are skipped: their
 * pages cannot be practised.
 */
async function loadCatalogue(): Promise<CatalogueSection[]> {
  const languages: BanteraLearningLanguage[] = await getLearningLanguages();
  const results = await Promise.allSettled(
    languages.map((language) => listPublicAudios({ languageCode: language.identifier, limit: LESSONS_PER_LANGUAGE })),
  );

  const seen = new Set<string>();
  const sections = new Map<string, CatalogueSection>();

  results.forEach((result, i) => {
    if (result.status !== 'fulfilled') return;
    for (const lesson of result.value) {
      if (seen.has(lesson.id) || lesson.transcriptCues.length === 0) continue;
      seen.add(lesson.id);

      const name = lesson.transcriptLanguage || languages[i].displayName;
      const section = sections.get(name) ?? { heading: `${languages[i].flagEmoji} ${name}`, lessons: [] };
      if (section.lessons.length < LESSONS_PER_LANGUAGE) section.lessons.push(lesson);
      sections.set(name, section);
    }
  });

  return [...sections.values()];
}

export async function GET() {
  const catalogue = await loadCatalogue();

  const lessonsSection = catalogue.length === 0
    ? 'No public lessons are available right now. Browse the current list at ' + `${SITE_URL}/webapp.`
    : catalogue.map(({ heading, lessons }) => [
        `### ${heading}`,
        '',
        ...lessons.map((a) => {
          const firstCue = a.transcriptCues.find((c) => c.text.trim())?.text.trim();
          const preview = firstCue ? ` — "${oneLine(firstCue).slice(0, 120)}"` : '';
          const kind = a.isAiGenerated ? 'AI-generated conversation' : 'audio';
          return `- [${oneLine(a.originalFileName)}](${SITE_URL}/webapp/shadowing/${a.id}): ${kind}, ${formatDuration(a.durationMs)}, ${a.transcriptCues.length} cues${preview}`;
        }),
      ].join('\n')).join('\n\n');

  const body = `# Bantera — full reference

> ${SITE_SUMMARY}

## Key facts

- Platform: iOS app on the App Store (${APP_STORE_URL}). A free web app for listening practice runs at ${SITE_URL}/webapp.
- Languages: ${SUPPORTED_LANGUAGES.join(', ')}.
- Method: play real spoken content one cue at a time, repeat it, record yourself, and see an AI transcription of your recording compared with the original.
- Community: voice-only language exchange with native speakers — private chats, groups, and voice comments.
- Developer: Lisen Huang. Contact: ${CONTACT_EMAIL}.

## Frequently asked questions

${FAQS.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}

## Pages

${SITE_PAGES.map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`).join('\n')}

## Public lessons

Each lesson opens in the browser and plays cue by cue with word-level highlighting. Showing up to ${LESSONS_PER_LANGUAGE} recent lessons per language.

${lessonsSection}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
