'use server';

import { assertDevActionEnabled } from '@/app/dev/_lib/dev-only';

// ── Types ─────────────────────────────────────────────────────────
// One line item from the model's published price list, e.g.
//   { unit: "per step", price: 0.000132, currency: "USD" }
//   { unit: "per 512 by 512 tile", price: 0.007, currency: "USD" }
export type PriceEntry = {
  unit: string;
  price: number;
  currency: string;
};

export type CfModel = {
  id: string;          // model path used by /ai/run — e.g. "@cf/black-forest-labs/flux-1-schnell"
  label: string;       // short display label — e.g. "black-forest-labs/flux-1-schnell"
  description: string;
  partner: boolean;
  beta: boolean;
  price: PriceEntry[] | null;   // null = Cloudflare does not publish pricing for this model via the API
};

export type ListModelsResult =
  | { success: true;  models: CfModel[] }
  | { success: false; error: string };

export type GenerateResult =
  | { success: true;  imageBase64: string; mimeType: string; usedParams: Record<string, unknown> }
  | { success: false; error: string };

// Raw shape returned by the CF models API. NOTE: `id` is a UUID, `name` is the
// model path you actually POST to /ai/run — they are not interchangeable.
type CfApiModel = {
  id: string;
  name: string;
  description?: string;
  task?: { name?: string };
  // `value` is usually a string ("true", a URL) but `price` arrives as a JSON array.
  properties?: { property_id: string; value: unknown }[];
};

function readProp(m: CfApiModel, key: string): unknown {
  return (m.properties ?? []).find(p => p.property_id === key)?.value;
}

function parsePrice(raw: unknown): PriceEntry[] | null {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!Array.isArray(value)) return null;
  const entries = value
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map(e => ({
      unit: String(e.unit ?? ''),
      price: Number(e.price),
      currency: String(e.currency ?? 'USD'),
    }))
    .filter(e => e.unit && Number.isFinite(e.price));
  return entries.length > 0 ? entries : null;
}

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
    // The task name is "Text-to-Image" (hyphenated). "Text to Image" silently
    // matches nothing and returns success:true with an empty result array.
    const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/models/search?task=Text-to-Image&per_page=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${creds.apiToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `CF API ${res.status}: ${text}` };
    }

    const data = await res.json() as { success: boolean; result: CfApiModel[]; errors?: { message: string }[] };
    if (!data.success) {
      return { success: false, error: data.errors?.map(e => e.message).join(', ') ?? 'Unknown error' };
    }

    const models: CfModel[] = (data.result ?? [])
      .filter(m => typeof m.name === 'string' && m.name.startsWith('@cf/'))
      .map(m => ({
        id: m.name,
        label: m.name.replace('@cf/', ''),
        description: m.description ?? '',
        partner: readProp(m, 'partner') === 'true',
        beta: readProp(m, 'beta') === 'true',
        price: parsePrice(readProp(m, 'price')),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (models.length === 0) {
      return { success: false, error: 'Cloudflare returned no Text-to-Image models for this account.' };
    }

    return { success: true, models };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Adaptive request-body negotiation ─────────────────────────────
// Image models on Workers AI do not share one input schema: the SD family takes
// num_steps/width/height/negative_prompt, while FLUX takes only prompt + steps
// (max 8) and hard-rejects the rest. Rather than hardcode a table per model
// (which goes stale the moment Cloudflare adds one), send the superset and let
// the API's own validation errors tell us what to drop or clamp, then retry.
const MAX_ATTEMPTS = 5;

function adaptBody(
  body: Record<string, unknown>,
  errorMessage: string,
): Record<string, unknown> | null {
  // "Additional or unevaluated properties '/num_steps, /width, /height' at '/' not allowed"
  const disallowed = errorMessage.match(/properties '([^']+)' at '\/' (?:are|is)? ?not allowed/);
  if (disallowed) {
    const keys = disallowed[1].split(',').map(s => s.trim().replace(/^\//, ''));
    const next = { ...body };
    let changed = false;
    for (const key of keys) {
      if (key in next) { delete next[key]; changed = true; }
    }
    if (changed) return next;
  }

  // "'/steps' must be <= 8"
  const tooHigh = errorMessage.match(/'\/([A-Za-z_]+)' must be <= (\d+)/);
  if (tooHigh) {
    const [, key, max] = tooHigh;
    if (key in body && body[key] !== Number(max)) return { ...body, [key]: Number(max) };
  }

  // "'/steps' must be >= 1"
  const tooLow = errorMessage.match(/'\/([A-Za-z_]+)' must be >= (\d+)/);
  if (tooLow) {
    const [, key, min] = tooLow;
    if (key in body && body[key] !== Number(min)) return { ...body, [key]: Number(min) };
  }

  return null;
}

// Workers AI image models return PNG, JPEG or WebP depending on the model, so
// sniff the magic bytes instead of assuming PNG.
function detectMimeFromBase64(b64: string): string {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('UklGR')) return 'image/webp';
  if (b64.startsWith('PHN2Zy') || b64.startsWith('PD94bWw')) return 'image/svg+xml';
  return 'image/png';
}

function friendlyError(status: number, message: string): string {
  if (/missing required input (image|mask_image)\b/.test(message)) {
    return `This is an image-to-image / inpainting model — it needs a source image (and mask) as input, so it can't generate from a prompt alone. Pick a text-to-image model instead.\n\nRaw error ${status}: ${message}`;
  }
  return `Cloudflare API error ${status}: ${message}`;
}

// Newer models (FLUX.2 family) reject JSON and require multipart/form-data with
// the same field names. Detected from the API's own error, not a model list.
function wantsMultipart(message: string): boolean {
  return /required properties at '\/' are 'multipart'/.test(message);
}

function toFormData(body: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  }
  return fd;
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
  if (!model) {
    return { success: false, error: 'No model selected.' };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/${model}`;

  // Superset of known image params; unsupported ones get negotiated away below.
  let body: Record<string, unknown> = { prompt, steps, num_steps: steps, width, height };
  if (negativePrompt) body.negative_prompt = negativePrompt;

  let multipart = false;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // For multipart, let fetch set the Content-Type (it needs the boundary).
      const res = await fetch(url, {
        method: 'POST',
        headers: multipart
          ? { Authorization: `Bearer ${creds.apiToken}` }
          : { Authorization: `Bearer ${creds.apiToken}`, 'Content-Type': 'application/json' },
        body: multipart ? toFormData(body) : JSON.stringify(body),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? 'image/png';

        if (contentType.includes('application/json')) {
          const json = await res.json() as { result?: { image?: string }; errors?: { message: string }[] };
          const b64 = json?.result?.image;
          if (!b64) {
            return { success: false, error: `Unexpected response: ${JSON.stringify(json).slice(0, 2000)}` };
          }
          return { success: true, imageBase64: b64, mimeType: detectMimeFromBase64(b64), usedParams: body };
        }

        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return { success: true, imageBase64: base64, mimeType: contentType, usedParams: body };
      }

      const text = await res.text();
      let message = text;
      try {
        const parsed = JSON.parse(text) as { errors?: { message: string }[] };
        message = parsed.errors?.map(e => e.message).join('; ') || text;
      } catch { /* keep raw */ }

      if (attempt < MAX_ATTEMPTS && !multipart && wantsMultipart(message)) {
        multipart = true;
        continue;
      }

      const next = attempt < MAX_ATTEMPTS ? adaptBody(body, message) : null;
      if (!next) return { success: false, error: friendlyError(res.status, message) };
      body = next;
    }

    return { success: false, error: 'Could not negotiate a valid request body for this model.' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
