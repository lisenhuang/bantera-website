// Pure alignment helpers for /dev/gemini/audio-timing, shared by the page and its server
// actions. The original script is always the text people see; the transcript only
// supplies timing.

export type Speaker = 'Speaker1' | 'Speaker2';

export type ScriptLine = { speaker: Speaker; text: string };

/** One word from gemini-3.5-transcribe (CJK comes back one character per "word"). */
export type TranscribedWord = { text: string; startSec: number; endSec: number; speaker?: string };

/**
 * A display token of the original script: `lead` is the literal text before it (spaces,
 * opening punctuation) and `text` is the word plus any trailing punctuation.
 */
export type ScriptToken = { line: number; lead: string; text: string; key: string };

/** The inclusive range of transcript word indices spoken for a token, or null if not found. */
export type TokenMatch = { s: number; e: number } | null;

export type TokenStatus = 'exact' | 'corrected' | 'estimated';

export type TimedToken = ScriptToken & {
  index: number;
  startSec: number;
  endSec: number;
  match: TokenMatch;
  /** The transcript words this token was matched to, as heard. */
  heard: string;
  status: TokenStatus;
};

export type TimedLine = { speaker: Speaker; startSec: number; endSec: number; tokens: TimedToken[] };

export type Alignment = {
  lines: TimedLine[];
  tokens: TimedToken[];
  /** Transcript word indices that no script token was matched to (fillers, misheard extras). */
  unusedWords: Set<number>;
  stats: Record<TokenStatus, number>;
};

// ─────────────────────────────────────────────────────────────
// Script parsing and tokenizing
// ─────────────────────────────────────────────────────────────

const SPEAKER_PREFIX = /^\s*(?:speaker\s*([12])|([ab]))\s*[:：]\s*(.*)$/i;

/** Parses "Speaker1: …" / "A: …" lines; unlabelled lines alternate speakers. */
export function parseScript(text: string): ScriptLine[] {
  const lines: ScriptLine[] = [];
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    const m = raw.match(SPEAKER_PREFIX);
    if (m) {
      const second = m[1] === '2' || m[2]?.toLowerCase() === 'b';
      if (m[3].trim()) lines.push({ speaker: second ? 'Speaker2' : 'Speaker1', text: m[3].trim() });
    } else {
      const previous = lines.at(-1)?.speaker;
      lines.push({ speaker: previous === 'Speaker1' ? 'Speaker2' : 'Speaker1', text: raw.trim() });
    }
  }
  return lines;
}

export function formatScript(lines: ScriptLine[]): string {
  return lines.map((l) => `${l.speaker}: ${l.text}`).join('\n');
}

/** Lowercased letters, digits and marks only — what two spellings of a word are compared on. */
export function normalizeKey(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '');
}

/**
 * Splits each line into word tokens with Intl.Segmenter, so languages written without
 * spaces (Chinese, Japanese, Thai) get real word boundaries. Trailing punctuation sticks
 * to the word before it; opening punctuation and spaces go into the next token's `lead`.
 */
export function tokenizeScript(lines: ScriptLine[], locale: string): ScriptToken[] {
  const segmenter = new Intl.Segmenter(locale || undefined, { granularity: 'word' });
  const tokens: ScriptToken[] = [];

  lines.forEach((line, lineIndex) => {
    let buffer = '';
    let current: ScriptToken | null = null;

    for (const { segment, isWordLike } of segmenter.segment(line.text)) {
      if (isWordLike) {
        current = { line: lineIndex, lead: buffer, text: segment, key: '' };
        tokens.push(current);
        buffer = '';
      } else if (current && buffer === '' && !/\s/.test(segment)) {
        current.text += segment; // punctuation directly after a word
      } else {
        buffer += segment;
      }
    }

    if (current) current.text += buffer.trimEnd();
    else if (buffer.trim()) tokens.push({ line: lineIndex, lead: '', text: buffer.trim(), key: '' });
  });

  for (const token of tokens) token.key = normalizeKey(token.text);
  return tokens;
}

// ─────────────────────────────────────────────────────────────
// Algorithmic aligner (no AI) — character-level edit distance
// ─────────────────────────────────────────────────────────────

const MAX_DP_CELLS = 30_000_000;

/**
 * Aligns the script and transcript character by character (Levenshtein with traceback)
 * and maps each token to the transcript words its characters landed on. Works across
 * different word boundaries (CJK) but cannot know that "25" and "twenty five" are equal.
 */
export function alignByCharacters(tokens: ScriptToken[], words: TranscribedWord[]): TokenMatch[] {
  const a: string[] = [];
  const aOwner: number[] = [];
  tokens.forEach((t, i) => { for (const ch of t.key) { a.push(ch); aOwner.push(i); } });
  const b: string[] = [];
  const bOwner: number[] = [];
  words.forEach((w, j) => { for (const ch of normalizeKey(w.text)) { b.push(ch); bOwner.push(j); } });

  const n = a.length;
  const m = b.length;
  const empty: TokenMatch[] = tokens.map(() => null);
  if (n === 0 || m === 0 || (n + 1) * (m + 1) > MAX_DP_CELLS) return empty;

  // 0 = diagonal (match/substitute), 1 = up (script char not heard), 2 = left (extra transcript char)
  const trace = new Uint8Array((n + 1) * (m + 1));
  let prev = new Uint32Array(m + 1);
  let cur = new Uint32Array(m + 1);
  for (let j = 0; j <= m; j++) { prev[j] = j; trace[j] = 2; }

  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    trace[i * (m + 1)] = 1;
    for (let j = 1; j <= m; j++) {
      const diag = prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      const up = prev[j] + 1;
      const left = cur[j - 1] + 1;
      let best = diag;
      let dir = 0;
      if (up < best) { best = up; dir = 1; }
      if (left < best) { best = left; dir = 2; }
      cur[j] = best;
      trace[i * (m + 1) + j] = dir;
    }
    [prev, cur] = [cur, prev];
  }

  // Walk back; prefer exact character matches, fall back to substitutions per token.
  const exact: Array<[number, number] | null> = tokens.map(() => null);
  const fuzzy: Array<[number, number] | null> = tokens.map(() => null);
  const widen = (ranges: typeof exact, t: number, w: number) => {
    const r = ranges[t];
    ranges[t] = r ? [Math.min(r[0], w), Math.max(r[1], w)] : [w, w];
  };

  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const dir = trace[i * (m + 1) + j];
    if (dir === 0) {
      widen(a[i - 1] === b[j - 1] ? exact : fuzzy, aOwner[i - 1], bOwner[j - 1]);
      i--; j--;
    } else if (dir === 1) i--;
    else j--;
  }

  return tokens.map((_, t) => {
    const r = exact[t] ?? fuzzy[t];
    return r ? { s: r[0], e: r[1] } : null;
  });
}

/**
 * Uses the character aligner wherever it heard a token exactly as written, and the AI's
 * match only where the transcript differs (numbers, misheard words). An AI match that
 * contradicts those exact anchors is later dropped by resolveTimings' ordering check.
 */
export function mergeMatches(
  tokens: ScriptToken[],
  words: TranscribedWord[],
  ai: TokenMatch[],
  algorithm: TokenMatch[],
): TokenMatch[] {
  return tokens.map((token, i) => {
    const a = algorithm[i];
    const exact = a && token.key !== '' && normalizeKey(words.slice(a.s, a.e + 1).map((w) => w.text).join('')) === token.key;
    return exact ? a : (ai[i] ?? a);
  });
}

// ─────────────────────────────────────────────────────────────
// Timing resolution — shared by the AI and algorithmic aligners
// ─────────────────────────────────────────────────────────────

const MIN_ESTIMATED_SEC = 0.08;

const weight = (t: ScriptToken) => Math.max(1, t.key.length || t.text.length);

/** Spreads [from, to] over `items` in proportion to their text length. */
function spread(items: ScriptToken[], from: number, to: number): Array<[number, number]> {
  const total = items.reduce((sum, t) => sum + weight(t), 0);
  let at = from;
  return items.map((t) => {
    const next = at + ((to - from) * weight(t)) / total;
    const span: [number, number] = [at, next];
    at = next;
    return span;
  });
}

/**
 * Turns token → transcript-word matches into per-token timings for the ORIGINAL text.
 * Invalid or out-of-order matches are dropped; tokens sharing transcript words split that
 * time by length; unmatched tokens are interpolated between their matched neighbours.
 */
export function resolveTimings(
  lines: ScriptLine[],
  tokens: ScriptToken[],
  words: TranscribedWord[],
  rawMatches: TokenMatch[],
  audioDurationSec?: number,
): Alignment {
  // 1. Keep only in-range matches that never move backwards.
  const matches: TokenMatch[] = [];
  let lastS = -1;
  let lastE = -1;
  tokens.forEach((_, i) => {
    const m = rawMatches[i];
    const valid = m && Number.isInteger(m.s) && Number.isInteger(m.e) && m.s >= 0 && m.e >= m.s
      && m.e < words.length && m.s >= lastS && m.e >= lastE;
    if (valid) { lastS = m.s; lastE = m.e; }
    matches.push(valid ? m : null);
  });

  const start = new Array<number>(tokens.length).fill(NaN);
  const end = new Array<number>(tokens.length).fill(NaN);
  const status = new Array<TokenStatus>(tokens.length).fill('estimated');

  // 2. Matched tokens, in groups of consecutive tokens that share transcript words.
  for (let i = 0; i < tokens.length;) {
    const first = matches[i];
    if (!first) { i++; continue; }
    let j = i + 1;
    let maxE = first.e;
    while (j < tokens.length && matches[j] && matches[j]!.s <= maxE) { maxE = Math.max(maxE, matches[j]!.e); j++; }

    const group = tokens.slice(i, j);
    const spans = spread(group, words[first.s].startSec, words[maxE].endSec);
    const heardKey = normalizeKey(words.slice(first.s, maxE + 1).map((w) => w.text).join(''));
    const scriptKey = group.map((t) => t.key).join('');
    group.forEach((_, k) => {
      start[i + k] = spans[k][0];
      end[i + k] = spans[k][1];
      status[i + k] = heardKey === scriptKey ? 'exact' : 'corrected';
    });
    i = j;
  }

  // 3. Unmatched runs: interpolate between the neighbouring matched tokens.
  const lastWordEnd = words.at(-1)?.endSec ?? 0;
  const duration = Math.max(audioDurationSec ?? 0, lastWordEnd);
  for (let i = 0; i < tokens.length;) {
    if (!Number.isNaN(start[i])) { i++; continue; }
    let j = i;
    while (j < tokens.length && Number.isNaN(start[j])) j++;
    const run = tokens.slice(i, j);
    const needed = MIN_ESTIMATED_SEC * run.length;

    let from = i > 0 ? end[i - 1] : Math.max(0, (words[0]?.startSec ?? 0) - needed);
    let to = j < tokens.length ? start[j] : Math.min(duration || from + needed, from + needed * 4);
    if (to - from < needed) {
      // No gap left: borrow the second half of the previous token's time.
      if (i > 0) { from = (start[i - 1] + end[i - 1]) / 2; end[i - 1] = from; }
      to = Math.max(to, from + needed);
    }
    spread(run, from, to).forEach(([s, e], k) => { start[i + k] = s; end[i + k] = e; });
    i = j;
  }

  const used = new Set<number>();
  const timed: TimedToken[] = tokens.map((t, i) => {
    const m = matches[i];
    if (m) for (let w = m.s; w <= m.e; w++) used.add(w);
    return {
      ...t,
      index: i,
      startSec: start[i],
      endSec: end[i],
      match: m,
      heard: m ? words.slice(m.s, m.e + 1).map((w) => w.text).join(' ') : '',
      status: status[i],
    };
  });

  const timedLines: TimedLine[] = lines.map((line) => ({ speaker: line.speaker, startSec: 0, endSec: 0, tokens: [] }));
  for (const t of timed) timedLines[t.line].tokens.push(t);
  for (const line of timedLines) {
    line.startSec = line.tokens[0]?.startSec ?? 0;
    line.endSec = line.tokens.at(-1)?.endSec ?? line.startSec;
  }

  const unusedWords = new Set<number>();
  words.forEach((_, w) => { if (!used.has(w)) unusedWords.add(w); });

  const stats = { exact: 0, corrected: 0, estimated: 0 };
  for (const t of timed) stats[t.status]++;

  return { lines: timedLines, tokens: timed, unusedWords, stats };
}

/** Index of the token being spoken at `timeSec`; held through short gaps inside a line. */
export function findActiveToken(alignment: Alignment, timeSec: number): number {
  const { tokens, lines } = alignment;
  let lo = 0;
  let hi = tokens.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid].startSec <= timeSec) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  if (found < 0) return -1;
  return timeSec <= lines[tokens[found].line].endSec + 0.15 ? found : -1;
}

export type CoverageIssue = { missingLines: number[]; trailingEstimated: number; estimatedRatio: number };

/**
 * Same rule as the backend's retry: a transcript that dropped a whole line, the end of the
 * dialogue, or more than 10% of words is transcribed once more.
 */
export function findCoverageIssue(alignment: Alignment): CoverageIssue | null {
  const missingLines = alignment.lines
    .map((line, i) => ({ i, missing: line.tokens.length > 0 && line.tokens.every((t) => t.status === 'estimated') }))
    .filter((l) => l.missing)
    .map((l) => l.i);
  let trailingEstimated = 0;
  for (let i = alignment.tokens.length - 1; i >= 0 && alignment.tokens[i].status === 'estimated'; i--) trailingEstimated++;
  const estimatedRatio = alignment.tokens.length ? alignment.stats.estimated / alignment.tokens.length : 1;
  return missingLines.length === 0 && trailingEstimated === 0 && estimatedRatio <= 0.1
    ? null
    : { missingLines, trailingEstimated, estimatedRatio };
}
