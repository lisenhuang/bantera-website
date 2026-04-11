'use server';

import { assertDevActionEnabled } from '@/app/dev/_lib/dev-only';

// ── Types ─────────────────────────────────────────────────────────
export type CfModel = {
  id: string;        // e.g. "@cf/black-forest-labs/flux-1-schnell"
  name: string;      // e.g. "flux-1-schnell"
  description: string;
  task: { name: string };
  properties?: { property_id: string; value: string }[];
};

export type ListModelsResult =
  | { success: true;  models: CfModel[] }
  | { success: false; error: string };

export type GenerateResult =
  | { success: true;  imageBase64: string; mimeType: string }
  | { success: false; error: string };

// ── Helper: get credentials ───────────────────────────────────────
function getCreds(): { accountId: string; apiToken: string } | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken  = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

// ── List available text-to-image models ───────────────────────────
export async function listModelsAction(): Promise<ListModelsResult> {
  assertDevActionEnabled();
  const creds = getCreds();
  if (!creds) {
    return { success: false, error: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in .env.local' };
  }

  try {
    // CF API: search models filtered by text-to-image task
    const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/models/search?task=Text%20to%20Image&per_page=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${creds.apiToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `CF API ${res.status}: ${text}` };
    }

    const data = await res.json() as { success: boolean; result: CfModel[]; errors?: { message: string }[] };
    if (!data.success) {
      return { success: false, error: data.errors?.map(e => e.message).join(', ') ?? 'Unknown error' };
    }

    // Filter to text-to-image only (API may return extras), sort by name
    const models = (data.result ?? [])
      .filter(m => m.task?.name?.toLowerCase().includes('text-to-image') || m.task?.name?.toLowerCase().includes('image'))
      .sort((a, b) => a.id.localeCompare(b.id));

    return { success: true, models };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}



export async function generateImageAction(opts: {
  prompt: string;
  negativePrompt?: string;
  model: string;
  steps?: number;
  width?: number;
  height?: number;
}): Promise<GenerateResult> {
  assertDevActionEnabled();
  const { prompt, negativePrompt, model, steps = 20, width = 1024, height = 1024 } = opts;

  const creds = getCreds();
  if (!creds) {
    return { success: false, error: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in .env.local' };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/${model}`;

  const body: Record<string, unknown> = { prompt, num_steps: steps, width, height };
  if (negativePrompt) body.negative_prompt = negativePrompt;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try { msg = JSON.stringify(JSON.parse(text), null, 2); } catch { /* keep raw */ }
      return { success: false, error: `Cloudflare API error ${res.status}: ${msg}` };
    }

    // CF Workers AI returns raw PNG bytes for image models
    const contentType = res.headers.get('content-type') ?? 'image/png';
    if (contentType.includes('application/json')) {
      // Some models wrap in JSON
      const json = await res.json() as { result?: { image?: string }; errors?: unknown[] };
      const b64 = json?.result?.image;
      if (!b64) return { success: false, error: `Unexpected response: ${JSON.stringify(json)}` };
      return { success: true, imageBase64: b64, mimeType: 'image/png' };
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return { success: true, imageBase64: base64, mimeType: contentType };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
