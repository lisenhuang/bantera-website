export type BanteraTranscriptCue = {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
};

/** Title shown for an audio: its file name without the extension, as in the app. */
export function audioTitle(originalFileName: string) {
  const dot = originalFileName.lastIndexOf(".");
  return dot > 0 ? originalFileName.slice(0, dot) : originalFileName;
}

export type BanteraWordTiming = {
  word: string;
  startMs: number;
  endMs: number;
  confidence?: number | null;
  /** Per-character timing inside a Chinese / Japanese word (newer audio only). */
  parts?: { word: string; startMs: number; endMs: number }[] | null;
};

export type BanteraPublicAudio = {
  id: string;
  userId: string;
  originalFileName: string;
  transcriptText: string;
  transcriptLanguage: string;
  transcriptLanguageCode: string;
  transcriptCues: BanteraTranscriptCue[];
  transcriptShortCues?: BanteraTranscriptCue[] | null;
  wordTiming?: BanteraWordTiming[] | null;
  isPublic: boolean;
  durationMs: number;
  fileSizeBytes: number;
  videoWidth: number | null;
  videoHeight: number | null;
  videoContentType: string;
  videoUrl: string | null;
  coverImageUrl: string | null;
  isAiGenerated: boolean;
  isTranscriptionEstimated: boolean;
  createdAt: string;
  creatorDisplayName: string | null;
};

export type BanteraLanguageOption = {
  code: string;
  label: string;
  flag: string;
};

export const BANTERA_LANGUAGE_OPTIONS: readonly BanteraLanguageOption[] = [
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", label: "English (UK)", flag: "🇬🇧" },
  { code: "en-NZ", label: "English (New Zealand)", flag: "🇳🇿" },
  { code: "en-AU", label: "English (Australia)", flag: "🇦🇺" },
  { code: "en-CA", label: "English (Canada)", flag: "🇨🇦" },
  { code: "en-IE", label: "English (Ireland)", flag: "🇮🇪" },
  { code: "en-IN", label: "English (India)", flag: "🇮🇳" },
  { code: "zh", label: "Mandarin Chinese", flag: "🇨🇳" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
] as const;

const DEFAULT_API_BASE_URL = "https://api.bantera.app";

export function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BANTERA_API_BASE_URL?.trim() ||
    process.env.BANTERA_API_BASE_URL?.trim() ||
    DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");
}

function normalizeMediaUrl(url: string | null) {
  if (!url) {
    return null;
  }

  const apiBaseUrl = getApiBaseUrl();

  try {
    const parsed = new URL(url);
    const apiBase = new URL(apiBaseUrl);
    return new URL(`${parsed.pathname}${parsed.search}`, apiBase).toString();
  } catch {
    try {
      return new URL(url, apiBaseUrl).toString();
    } catch {
      return url;
    }
  }
}

function normalizePublicAudio(item: BanteraPublicAudio): BanteraPublicAudio {
  return {
    ...item,
    videoUrl: normalizeMediaUrl(item.videoUrl),
    coverImageUrl: normalizeMediaUrl(item.coverImageUrl),
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Bantera API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function listPublicAudios({
  limit = 24,
  offset = 0,
  languageCode,
  search,
}: {
  limit?: number;
  offset?: number;
  languageCode?: string;
  search?: string;
} = {}): Promise<BanteraPublicAudio[]> {
  const params = new URLSearchParams();
  params.set("mediaType", "audio");
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (languageCode?.trim()) {
    params.set("languageCode", languageCode.trim());
  }
  if (search?.trim()) {
    params.set("search", search.trim());
  }

  const result = await fetchJson<BanteraPublicAudio[]>(
    `/api/videos/public?${params.toString()}`,
  );

  return result
    .filter((item) => item.videoContentType.toLowerCase().startsWith("audio/"))
    .map(normalizePublicAudio);
}

export type BanteraLearningLanguage = {
  identifier: string;
  displayName: string;
  flagEmoji: string;
};

export async function getLearningLanguages(): Promise<BanteraLearningLanguage[]> {
  try {
    return await fetchJson<BanteraLearningLanguage[]>("/api/public/learning-languages");
  } catch {
    return [];
  }
}

export async function getPublicAudio(
  videoId: string,
): Promise<BanteraPublicAudio | null> {
  try {
    const result = await fetchJson<BanteraPublicAudio>(`/api/videos/${videoId}`);
    if (!result.isPublic) {
      return null;
    }
    if (!result.videoContentType.toLowerCase().startsWith("audio/")) {
      return null;
    }
    return normalizePublicAudio(result);
  } catch {
    return null;
  }
}
