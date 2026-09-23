'use server';

import { Type, type Schema } from '@google/genai';
import { assertDevActionEnabled } from '@/app/dev/_lib/dev-only';
import { getShuffledKeys, withGeminiKey } from '@/lib/gemini-key';
import type { TokenMatch, TranscribedWord } from './alignment';

const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

// ─────────────────────────────────────────────────────────────
// Transcribe with word timestamps (Interactions API)
// ─────────────────────────────────────────────────────────────

export type TranscribeWordsResult =
  | { success: true; text: string; words: TranscribedWord[]; ms: number }
  | { success: false; error: string };

type WordInfo = { type?: string; text?: string; start_offset?: string | number; end_offset?: string | number; speaker?: string };
type Interaction = {
  id?: string;
  status?: string;
  steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; annotations?: WordInfo[] }> }>;
};

/** "1.300s" → 1.3 */
function parseOffset(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  const n = parseFloat(String(value ?? '').replace(/s$/, ''));
  return Number.isFinite(n) ? n : 0;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Long audio may come back still running; poll until it completes (up to ~3 minutes). */
async function waitForCompletion(first: Interaction, key: string): Promise<Interaction> {
  let interaction = first;
  for (let attempt = 0; attempt < 90 && interaction.status !== 'completed'; attempt++) {
    if (interaction.status === 'failed' || interaction.status === 'cancelled' || !interaction.id) {
      throw new Error(`Transcription ${interaction.status ?? 'returned no id'}.`);
    }
    await sleep(2000);
    const res = await fetch(`${INTERACTIONS_URL}/${encodeURIComponent(interaction.id)}`, {
      headers: { 'x-goog-api-key': key },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Polling failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    interaction = (await res.json()) as Interaction;
  }
  if (interaction.status !== 'completed') throw new Error('Transcription did not finish in time.');
  return interaction;
}

export async function transcribeWordsAction(opts: {
  audioBase64: string;
  mimeType: string;
  model: string;
  /** BCP-47 hint such as "en-US"; empty for auto-detect. */
  languageCode?: string;
}): Promise<TranscribeWordsResult> {
  assertDevActionEnabled();
  const { audioBase64, mimeType, model, languageCode } = opts;
  const keys = getShuffledKeys();
  if (keys.length === 0) return { success: false, error: 'No API keys configured. Set GEMINI_API_KEYS in .env.local' };

  const body = JSON.stringify({
    model: model.replace(/^models\//, ''),
    input: [{ type: 'audio', data: audioBase64, mime_type: mimeType }],
    generation_config: {
      transcription_config: {
        language_codes: languageCode ? [languageCode] : [],
        mode: { type: 'verbatim', diarization_mode: 'speaker', timestamp_granularities: ['word'] },
      },
    },
  });

  const started = Date.now();
  let lastError = '';
  for (const key of keys) {
    try {
      const res = await fetch(INTERACTIONS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body,
        cache: 'no-store',
      });
      const raw = await res.text();
      if (!res.ok) {
        lastError = `${res.status}: ${raw.slice(0, 500)}`;
        // Bad key, quota, or server trouble: another key may work. Anything else is the request.
        if ([401, 403, 429].includes(res.status) || res.status >= 500 || raw.includes('API_KEY_INVALID')) continue;
        return { success: false, error: lastError };
      }

      const interaction = await waitForCompletion(JSON.parse(raw) as Interaction, key);
      const parts = (interaction.steps ?? [])
        .filter((s) => s.type === 'model_output')
        .flatMap((s) => s.content ?? [])
        .filter((c) => c.type === 'text');

      const words: TranscribedWord[] = parts
        .flatMap((c) => c.annotations ?? [])
        .filter((a) => a.type === 'word_info' && a.text)
        .map((a) => ({
          text: a.text!,
          startSec: parseOffset(a.start_offset),
          endSec: parseOffset(a.end_offset),
          speaker: a.speaker,
        }));

      return { success: true, text: parts.map((c) => c.text ?? '').join('\n'), words, ms: Date.now() - started };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { success: false, error: `All ${keys.length} Gemini API key(s) failed. Last error: ${lastError}` };
}

// ─────────────────────────────────────────────────────────────
// AI alignment: original script tokens → transcript word ranges
// ─────────────────────────────────────────────────────────────

export type AlignWithAiResult =
  | { success: true; matches: TokenMatch[]; ms: number }
  | { success: false; error: string };

const ALIGNMENT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    tokens: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          t: { type: Type.INTEGER, description: 'Script token index' },
          s: { type: Type.INTEGER, description: 'First transcript word index, or -1' },
          e: { type: Type.INTEGER, description: 'Last transcript word index, or -1' },
        },
        required: ['t', 's', 'e'],
      },
    },
  },
  required: ['tokens'],
};

/** Tabs and newlines would break the one-entry-per-line lists in the prompt. */
const cell = (text: string) => text.replace(/[\t\r\n]+/g, ' ');

export async function alignWithAiAction(opts: {
  model: string;
  lines: Array<{ speaker: string }>;
  tokens: Array<{ line: number; text: string }>;
  words: Array<{ text: string; speaker?: string }>;
}): Promise<AlignWithAiResult> {
  assertDevActionEnabled();
  const { model, lines, tokens, words } = opts;
  if (tokens.length === 0 || words.length === 0) return { success: false, error: 'Nothing to align.' };

  const scriptList = tokens
    .map((t, i) => `${i === 0 || tokens[i - 1].line !== t.line ? `# line ${t.line + 1} (${lines[t.line]?.speaker ?? '?'})\n` : ''}${i}\t${cell(t.text)}`)
    .join('\n');
  const transcriptList = words.map((w, i) => `${i}\t${cell(w.text)}${w.speaker ? `\t${w.speaker}` : ''}`).join('\n');

  const prompt = `You align a known script to a speech-recognition transcript that has word timestamps.

The SCRIPT is exactly what was said and is the text people will read. The TRANSCRIPT is what a speech-recognition model heard, one entry per word (languages without spaces may be one character per entry). It can contain misheard words, other spellings, numerals instead of spelled-out numbers (or the reverse), merged or split words, missing words and different punctuation.

For every script token, give the range of transcript word indices [s, e] that were spoken for it.
Rules:
- Work in order. Ranges never go backwards: each token's s and e are >= the previous matched token's s and e.
- One token may cover several transcript words, e.g. "25" <-> "twenty" "five", or "咖啡" <-> "咖" "啡".
- Consecutive tokens may share one transcript word when the transcript merged them.
- Match by sound and position, not spelling: a misheard word in the right place still matches.
- If a token was not spoken or cannot be located, use s = -1 and e = -1.
- Transcript words that belong to no token (fillers, repeats, hallucinations) are skipped.
Return exactly one entry per script token, in order, with its index as "t".

SCRIPT TOKENS (index<TAB>token), grouped by line:
${scriptList}

TRANSCRIPT WORDS (index<TAB>word<TAB>speaker):
${transcriptList}`;

  const started = Date.now();
  try {
    const raw = await withGeminiKey(async (ai) => {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: ALIGNMENT_SCHEMA },
      });
      return res.text ?? '';
    });

    const parsed = JSON.parse(raw.replace(/```(?:json)?/g, '').trim()) as { tokens?: Array<{ t: number; s: number; e: number }> };
    if (!Array.isArray(parsed.tokens)) return { success: false, error: 'Alignment response missing a "tokens" array.' };

    const matches: TokenMatch[] = tokens.map(() => null);
    for (const entry of parsed.tokens) {
      const { t, s, e } = entry ?? {};
      if (!Number.isInteger(t) || t < 0 || t >= tokens.length) continue;
      if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e < s || e >= words.length) continue;
      matches[t] = { s, e };
    }
    return { success: true, matches, ms: Date.now() - started };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
