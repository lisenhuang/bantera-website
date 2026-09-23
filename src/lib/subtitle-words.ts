/**
 * Word highlighting for shared subtitles, matching the Bantera app
 * (app/lib/presentation/practice/subtitle_word_tokens.dart) and the backend
 * (WordTimingAligner.SplitCjk): words follow the app's word pattern, except that
 * Chinese / Japanese runs, which have no spaces, are split into single characters.
 */

export type TimedWord = {
  word: string;
  startMs: number;
  endMs: number;
  /** Per-character timing inside a Chinese / Japanese word (newer audio only). */
  parts?: TimedWord[] | null;
};

export type SubtitleToken = {
  /** UTF-16 offsets into the subtitle text. */
  start: number;
  end: number;
  text: string;
  /** Index into the cue's timed units; tokens of one unit highlight together. */
  unit: number | null;
};

export type TimedUnit = { startMs: number; endMs: number };

const WORD_RE = /[\p{L}\p{N}]+(?:['’ʼ][\p{L}\p{N}]+)*/gu;
const KEY_STRIP_RE = /[^\p{L}\p{N}]/gu;
/** Small kana and the long-vowel mark join the character before them (きょう → きょ, う). */
const KANA_MODIFIERS = new Set(
  [...'ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿーｧｨｩｪｫｯｬｭｮｰﾞﾟ゛゜'],
);

function isCjk(code: number) {
  return (
    (code >= 0x3040 && code <= 0x30ff) || // hiragana, katakana
    (code >= 0x31f0 && code <= 0x31ff) || // katakana phonetic extensions
    (code >= 0x3400 && code <= 0x4dbf) || // CJK extension A
    (code >= 0x4e00 && code <= 0x9fff) || // CJK unified ideographs
    (code >= 0xf900 && code <= 0xfaff) || // CJK compatibility ideographs
    (code >= 0xff66 && code <= 0xff9f) || // half-width katakana
    (code >= 0x20000 && code <= 0x3134f) // CJK extensions B–G
  );
}

/** Lowercased letters and digits only, so script and timing words compare equal. */
export function wordKey(word: string) {
  return word.toLowerCase().replace(KEY_STRIP_RE, "");
}

export function tokenizeSubtitle(text: string): Omit<SubtitleToken, "unit">[] {
  const tokens: Omit<SubtitleToken, "unit">[] = [];
  for (const match of text.matchAll(WORD_RE)) {
    let offset = match.index;
    let otherStart: number | null = null;
    let lastWasCjk = false;
    const flushOther = (end: number) => {
      if (otherStart !== null) {
        tokens.push({ start: otherStart, end, text: text.slice(otherStart, end) });
        otherStart = null;
      }
    };
    for (const char of match[0]) {
      const length = char.length;
      if (!isCjk(char.codePointAt(0)!)) {
        otherStart ??= offset;
        lastWasCjk = false;
      } else {
        flushOther(offset);
        if (lastWasCjk && KANA_MODIFIERS.has(char)) {
          const previous = tokens.pop()!;
          tokens.push({ start: previous.start, end: offset + length, text: text.slice(previous.start, offset + length) });
        } else {
          tokens.push({ start: offset, end: offset + length, text: char });
        }
        lastWasCjk = true;
      }
      offset += length;
    }
    flushOther(match.index + match[0].length);
  }
  return tokens;
}

/**
 * Maps the audio's word timing onto one cue's text. Units are per-character `parts`
 * when present, otherwise whole words (an older Chinese run then highlights all of its
 * characters together). Matching walks forward in order; a unit that is not found is
 * skipped without losing the place.
 */
export function mapCueWords(
  text: string,
  wordTiming: TimedWord[] | null | undefined,
  cue: { startMs: number; endMs: number },
): { tokens: SubtitleToken[]; units: TimedUnit[] } {
  const tokens: SubtitleToken[] = tokenizeSubtitle(text).map((t) => ({ ...t, unit: null }));
  const units: TimedUnit[] = [];
  if (!wordTiming?.length || tokens.length === 0) return { tokens, units };

  const keys = tokens.map((t) => wordKey(t.text));
  const candidates = wordTiming
    .flatMap((w) => (w.parts?.length ? w.parts : [w]))
    .filter((u) => u.endMs > u.startMs && u.startMs >= cue.startMs - 300 && u.startMs < cue.endMs + 500);

  let cursor = 0;
  for (const candidate of candidates) {
    const key = wordKey(candidate.word);
    if (!key) continue;
    for (let first = cursor; first < tokens.length; first++) {
      let spelled = keys[first];
      let last = first;
      while (spelled.length < key.length && key.startsWith(spelled) && last + 1 < tokens.length) {
        last++;
        spelled += keys[last];
      }
      if (spelled !== key) continue;

      const unit = units.push({ startMs: candidate.startMs, endMs: candidate.endMs }) - 1;
      for (let k = first; k <= last; k++) tokens[k].unit = unit;
      cursor = last + 1;
      break;
    }
  }
  return { tokens, units };
}

/** The unit playing at `ms`, or null. */
export function activeUnitAt(units: TimedUnit[], ms: number): number | null {
  const index = units.findIndex((u) => ms >= u.startMs && ms < u.endMs);
  return index >= 0 ? index : null;
}
