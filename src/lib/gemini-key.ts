/**
 * Gemini API key manager.
 *
 * Set GEMINI_API_KEYS in .env.local as a comma-separated list:
 *   GEMINI_API_KEYS=AIza...key1,AIza...key2,AIza...key3
 *
 * Also supports a JSON array format:
 *   GEMINI_API_KEYS=["AIza...key1","AIza...key2"]
 */

import { GoogleGenAI } from '@google/genai';

/**
 * Reads GEMINI_API_KEYS, supports:
 *  - comma-separated:  key1,key2,key3
 *  - JSON array:       ["key1","key2"]
 *  - single key:       key1
 */
export function parseKeys(): string[] {
  const raw = (process.env.GEMINI_API_KEYS ?? '').trim();
  if (!raw) return [];

  // JSON array format
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw) as string[];
      return arr.map((k) => k.trim()).filter(Boolean);
    } catch {
      // fall through to comma-separated
    }
  }

  // Comma-separated (or single key)
  return raw.split(',').map((k) => k.trim()).filter(Boolean);
}

export function getShuffledKeys(): string[] {
  const keys = parseKeys();
  const arr = [...keys];
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Calls `fn` with a new GoogleGenAI client for each shuffled key,
 * moving to the next key on failure. Throws if all keys are exhausted.
 */
export async function withGeminiKey<T>(
  fn: (ai: GoogleGenAI) => Promise<T>,
): Promise<T> {
  const keys = getShuffledKeys();
  if (keys.length === 0) {
    throw new Error('No API keys configured. Set GEMINI_API_KEYS in .env.local');
  }

  let lastError: unknown;
  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      return await fn(ai);
    } catch (err) {
      lastError = err;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`All ${keys.length} Gemini API key(s) failed. Last error: ${msg}`);
}
