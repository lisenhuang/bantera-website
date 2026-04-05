'use server';

import { parseKeys } from '@/lib/gemini-key';

export type KeyTestResult = {
  suffix: string;      // last 4 chars, easy to identify
  fullKey: string;     // only used server-side for the fetch, not sent to client
  status: 'ok' | 'failed';
  modelCount?: number; // how many models returned (on success)
  error?: string;      // short error message (on failure)
};

export type TestAllKeysResult =
  | { success: true; results: Omit<KeyTestResult, 'fullKey'>[] }
  | { success: false; error: string };

export async function testAllKeysAction(): Promise<TestAllKeysResult> {
  const keys = parseKeys();

  if (keys.length === 0) {
    return {
      success: false,
      error: 'No API keys found. Set GEMINI_API_KEYS in .env.local as a comma-separated list.',
    };
  }

  const results: Omit<KeyTestResult, 'fullKey'>[] = [];

  for (const key of keys) {
    const suffix = key.slice(-4);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: { message: res.statusText } })) as {
          error?: { message?: string; code?: number };
        };
        results.push({
          suffix,
          status: 'failed',
          error: body?.error?.message ?? `HTTP ${res.status}`,
        });
      } else {
        const data = (await res.json()) as { models?: unknown[] };
        results.push({
          suffix,
          status: 'ok',
          modelCount: data.models?.length ?? 0,
        });
      }
    } catch (err) {
      results.push({
        suffix,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { success: true, results };
}
