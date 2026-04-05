// Shared constants — no 'use server' / 'use client' directive

export type ModelDef = {
  id: string;
  label: string;
  provider: string;
  note?: string; // e.g. 'Beta', 'Partner'
};

export const MODELS: ModelDef[] = [
  // ── Black Forest Labs (FLUX) ── ⭐ best quality
  { id: '@cf/black-forest-labs/flux-1-schnell',   label: 'FLUX.1 Schnell',       provider: 'Black Forest Labs', note: 'Fast · Free' },
  { id: '@cf/black-forest-labs/flux-2-dev',       label: 'FLUX.2 Dev',           provider: 'Black Forest Labs', note: 'Partner' },
  { id: '@cf/black-forest-labs/flux-2-klein-4b',  label: 'FLUX.2 Klein 4B',      provider: 'Black Forest Labs', note: 'Partner · Fast' },
  { id: '@cf/black-forest-labs/flux-2-klein-9b',  label: 'FLUX.2 Klein 9B',      provider: 'Black Forest Labs', note: 'Partner · HQ' },

  // ── Ideogram ──
  { id: '@cf/ideogram-ai/ideogram-v2',            label: 'Ideogram v2',           provider: 'Ideogram',          note: 'Partner' },
  { id: '@cf/ideogram-ai/ideogram-v2-turbo',      label: 'Ideogram v2 Turbo',     provider: 'Ideogram',          note: 'Partner · Fast' },

  // ── Recraft ──
  { id: '@cf/recraft-ai/recraft-v3',              label: 'Recraft v3',            provider: 'Recraft',           note: 'Partner' },
  { id: '@cf/recraft-ai/recraft-v3-svg',          label: 'Recraft v3 SVG',        provider: 'Recraft',           note: 'Partner · vector' },

  // ── Leonardo.ai ──
  { id: '@cf/leonardo-ai/phoenix-1.0',            label: 'Leonardo Phoenix 1.0',  provider: 'Leonardo.ai',       note: 'Partner' },
  { id: '@cf/leonardo-ai/lucid-origin',           label: 'Leonardo Lucid Origin', provider: 'Leonardo.ai',       note: 'Partner' },

  // ── Stability AI / bytedance / lykon ── (classic, free tier)
  { id: '@cf/stabilityai/stable-diffusion-xl-base-1.0',  label: 'SDXL Base 1.0',          provider: 'Stability AI',  note: 'Beta' },
  { id: '@cf/bytedance/stable-diffusion-xl-lightning',    label: 'SDXL Lightning',          provider: 'Bytedance',     note: 'Beta · Fast' },
  { id: '@cf/lykon/dreamshaper-8-lcm',                   label: 'DreamShaper 8 LCM',       provider: 'Lykon',         note: 'Beta' },
  { id: '@cf/runwayml/stable-diffusion-v1-5-inpainting', label: 'SD 1.5 Inpainting',       provider: 'Runwayml',      note: 'Beta' },
];
