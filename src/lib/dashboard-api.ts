import { cookies } from 'next/headers';
import { getApiBaseUrl } from './bantera-api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdminUserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  nativeLanguage: string | null;
  learningLanguage: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  videoCount: number;
  avatarUrl: string | null;
};

export type AdminIdentityInfo = {
  provider: string;
  providerEmail: string | null;
  createdAt: string;
};

export type AdminUserStats = {
  uploadCount: number;
  videoCount: number;
};

export type AdminUserDetail = {
  id: string;
  name: string | null;
  role: string;
  status: string;
  nativeLanguage: string | null;
  learningLanguage: string | null;
  translationLanguage: string | null;
  aiAudioDailyLimit: number | null;
  createdAt: string;
  lastLoginAt: string | null;
  identities: AdminIdentityInfo[];
  stats: AdminUserStats;
  avatarUrl: string | null;
  alwaysOnline: boolean;
};

export type AdminVideoListItem = {
  id: string;
  userId: string;
  creatorName: string | null;
  originalFileName: string;
  transcriptLanguageCode: string;
  isPublic: boolean;
  isAiGenerated: boolean;
  durationMs: number;
  fileSizeBytes: number;
  createdAt: string;
};

export type AdminPipelineRunRow = {
  kind: 'video' | 'job';
  id: string;
  videoId: string | null;
  userId: string;
  creatorName: string | null;
  name: string;
  languageCode: string | null;
  status: 'done' | 'uploaded' | 'failed' | 'processing';
  isPublic: boolean | null;
  isAiGenerated: boolean;
  durationMs: number | null;
  fileSizeBytes: number | null;
  createdAt: string;
};

export type AdminPipelineRunDetail = {
  run: AdminPipelineRunRow;
  jobId: string | null;
  scenarioId: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  events: AiPipelineEvent[];
  eventsTruncated: boolean;
  eventRetentionDays: number;
};

export type AdminStats = {
  totalUsers: number;
  totalVideos: number;
  activeLast7Days: number;
  activeLast30Days: number;
  aiGeneratedVideos: number;
  uploadedVideos: number;
};

export type AnalyticsLanguageVariant = { code: string; displayName: string; flag: string; users: number };

export type AnalyticsLanguage = {
  key: string;
  displayName: string;
  flag: string;
  users: number;
  pct: number;
  variants: AnalyticsLanguageVariant[];
};

export type AnalyticsLanguageBreakdown = {
  byAccent: AnalyticsLanguage[];
  combined: AnalyticsLanguage[];
  unset: number;
};

export type AdminAnalytics = {
  asOf: string;
  rangeDays: number;
  bucket: 'day' | 'week';
  liveTrackingSince: string | null;
  kpis: {
    totalUsers: number;
    newUsers: number;
    newUsersPreviousPeriod: number;
    dau: number;
    wau: number;
    mau: number;
    totalContent: number;
    uploads: number;
    aiAudio: number;
    aiJobs: number;
    aiJobSuccessRatePct: number;
    usersWithPushToken: number;
  };
  signups: { date: string; count: number }[];
  activeUsers: { date: string; dau: number; wau: number; mau: number; approximate: boolean }[];
  content: { date: string; uploads: number; aiAudio: number }[];
  nativeLanguages: AnalyticsLanguageBreakdown;
  learningLanguages: AnalyticsLanguageBreakdown;
  countries: { code: string; flag: string; users: number }[];
  usersWithoutLocation: number;
  cities: { city: string; region: string | null; countryCode: string; flag: string; users: number }[];
  providers: { provider: string; users: number }[];
  languagePairs: {
    native: string; nativeName: string; nativeFlag: string;
    learning: string; learningName: string; learningFlag: string;
    users: number;
  }[];
};

export type AdminPagedResult<T> = {
  items: T[];
  total: number;
};

// ── HTTP client ───────────────────────────────────────────────────────────────

async function adminFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Admin API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/** Read the access token HttpOnly cookie. Only callable from server context. */
export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get('bantera_access_token')?.value;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminAnalytics(token: string, days: number): Promise<AdminAnalytics> {
  return adminFetch<AdminAnalytics>(`/api/admin/analytics?days=${days}`, token);
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  return adminFetch<AdminStats>('/api/admin/stats', token);
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listAdminUsers(
  token: string,
  params: {
    search?: string;
    sort?: string;
    dir?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<AdminPagedResult<AdminUserListItem>> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  return adminFetch<AdminPagedResult<AdminUserListItem>>(
    `/api/admin/users?${q.toString()}`,
    token,
  );
}

export async function getAdminUser(
  token: string,
  userId: string,
): Promise<AdminUserDetail> {
  return adminFetch<AdminUserDetail>(`/api/admin/users/${userId}`, token);
}

export async function patchAdminUser(
  token: string,
  userId: string,
  body: {
    role?: string;
    status?: string;
    aiAudioDailyLimit?: number | null;
    clearAiLimit?: boolean;
    alwaysOnline?: boolean | null;
  },
): Promise<void> {
  await adminFetch(`/api/admin/users/${userId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      role: body.role ?? null,
      status: body.status ?? null,
      aiAudioDailyLimit: body.aiAudioDailyLimit ?? null,
      clearAiLimit: body.clearAiLimit ?? false,
      alwaysOnline: body.alwaysOnline ?? null,
    }),
  });
}

export async function deleteAdminUser(
  token: string,
  userId: string,
): Promise<void> {
  await adminFetch(`/api/admin/users/${userId}`, token, { method: 'DELETE' });
}

// ── Videos ────────────────────────────────────────────────────────────────────

export async function listAdminPipelineRuns(
  token: string,
  params: {
    languageCode?: string;
    isPublic?: boolean;
    isAiGenerated?: boolean;
    sort?: string;
    dir?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<AdminPagedResult<AdminPipelineRunRow>> {
  const q = new URLSearchParams();
  if (params.languageCode) q.set('languageCode', params.languageCode);
  if (params.isPublic != null) q.set('isPublic', String(params.isPublic));
  if (params.isAiGenerated != null) q.set('isAiGenerated', String(params.isAiGenerated));
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  return adminFetch<AdminPagedResult<AdminPipelineRunRow>>(`/api/admin/ai-pipeline/runs?${q.toString()}`, token);
}

export async function getAdminPipelineRun(token: string, kind: string, id: string): Promise<AdminPipelineRunDetail> {
  return adminFetch<AdminPipelineRunDetail>(
    `/api/admin/ai-pipeline/runs/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`, token);
}

export async function listAdminVideos(
  token: string,
  params: {
    languageCode?: string;
    isPublic?: boolean;
    isAiGenerated?: boolean;
    sort?: string;
    dir?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<AdminPagedResult<AdminVideoListItem>> {
  const q = new URLSearchParams();
  if (params.languageCode) q.set('languageCode', params.languageCode);
  if (params.isPublic != null) q.set('isPublic', String(params.isPublic));
  if (params.isAiGenerated != null) q.set('isAiGenerated', String(params.isAiGenerated));
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  return adminFetch<AdminPagedResult<AdminVideoListItem>>(
    `/api/admin/videos?${q.toString()}`,
    token,
  );
}

export async function deleteAdminVideo(
  token: string,
  videoId: string,
): Promise<void> {
  await adminFetch(`/api/admin/videos/${videoId}`, token, { method: 'DELETE' });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export type AdminUserBrief = {
  id: string;
  name: string | null;
  email: string | null;
};

export type AdminMessageListItem = {
  id: string;
  threadId: string;
  threadType: string;
  sender: AdminUserBrief;
  recipient: AdminUserBrief | null;
  groupLanguageKey: string | null;
  groupLanguageDisplayName: string | null;
  durationMs: number;
  spokenLanguageCode: string;
  originalFileName: string;
  audioContentType: string;
  createdAt: string;
  expiresAt: string | null;
};

export async function listAdminMessages(
  token: string,
  params: {
    threadType?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<AdminPagedResult<AdminMessageListItem>> {
  const q = new URLSearchParams();
  if (params.threadType) q.set('threadType', params.threadType);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  return adminFetch<AdminPagedResult<AdminMessageListItem>>(
    `/api/admin/messages?${q.toString()}`,
    token,
  );
}

export async function deleteAdminMessage(
  token: string,
  messageId: string,
): Promise<void> {
  await adminFetch(`/api/admin/messages/${messageId}`, token, { method: 'DELETE' });
}

// ── MCP OAuth (admin consent + connected apps) ───────────────────────────────

export type OAuthConsentRequest = {
  requestId: string;
  clientName: string;
  clientId: string;
  redirectUri: string;
  redirectHost: string;
  isLoopback: boolean;
  requestedScopes: string[];
  expiresAt: string;
};

export type OAuthGrant = {
  familyId: string;
  clientName: string;
  clientId: string;
  scopes: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
};

/** Loads a pending authorization request. Throws if it expired or was already used. */
export async function getOAuthRequest(
  token: string,
  requestId: string,
): Promise<OAuthConsentRequest> {
  return adminFetch<OAuthConsentRequest>(`/api/admin/oauth/requests/${requestId}`, token);
}

/** Approves or denies a request; returns the URL to send the browser back to. */
export async function submitOAuthConsent(
  token: string,
  body: { requestId: string; approve: boolean; scopes: string[] },
): Promise<{ redirectUrl: string }> {
  return adminFetch<{ redirectUrl: string }>('/api/admin/oauth/consent', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listOAuthGrants(token: string): Promise<OAuthGrant[]> {
  return adminFetch<OAuthGrant[]>('/api/admin/oauth/grants', token);
}

export async function revokeOAuthGrant(token: string, familyId: string): Promise<void> {
  await adminFetch(`/api/admin/oauth/grants/${familyId}`, token, { method: 'DELETE' });
}

// ── AI models & pipeline health ──────────────────────────────────────────────

export type AiModelOverride = { value: string; updatedAt: string; updatedByUserId: string | null } | null;

export type AiSettings = {
  textModel: string;
  audioModel: string;
  fallbackTextModel?: string | null;
  fallbackAudioModel?: string | null;
  defaults: { textModel: string; audioModel: string };
  overrides: { textModel: AiModelOverride; audioModel: AiModelOverride; fallbackTextModel?: AiModelOverride; fallbackAudioModel?: AiModelOverride };
  fixedModels: { webSearchModel: string; webSearchKeyPrefix: string; transcribeModel: string };
  /** Live from Gemini's model list on every load. */
  availableTextModels: string[];
  availableAudioModels: string[];
  modelListAvailable: boolean;
  /** Missing on backends older than 1.0.112. */
  playback?: AiPlaybackSettings;
  /** Missing on backends older than 1.0.119. */
  alignment?: AiAlignmentSettings;
};

export type AiPlaybackSettings = {
  /** AI-audio sentences start where the previous sentence ends, not at their own first word. */
  cueStartsAtPreviousCueEnd: boolean;
  updatedAt: string | null;
};

export type GeminiKeyHealth = {
  total: number;
  healthy: number;
  items: {
    id: string;
    hint: string;
    status: 'invalid' | 'cooldown';
    model: string | null;
    retryAt: string | null;
    reason: string | null;
    detectedAt: string | null;
  }[];
};

export async function getGeminiKeyHealth(token: string): Promise<GeminiKeyHealth> {
  return adminFetch<GeminiKeyHealth>('/api/admin/ai-settings/keys', token);
}

export async function retryGeminiKey(
  token: string, id: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${getApiBaseUrl()}/api/admin/ai-settings/keys/${encodeURIComponent(id)}/retry`, {
    method: 'POST',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) return { ok: true };
  return { ok: false, status: res.status, message: `Could not retry this key (${res.status}).` };
}

export type AiAlignmentSettings = {
  /** New AI audio uses the original dialogue text for cues and word highlighting. */
  alignToOriginalDialogue: boolean;
  updatedAt: string | null;
};

export async function getAiSettings(token: string): Promise<AiSettings> {
  return adminFetch<AiSettings>('/api/admin/ai-settings', token);
}

/** Null clears an override (back to the default). Returns the backend's message on failure. */
export async function updateAiSettings(
  token: string,
  body: { textModel: string | null; audioModel: string | null; fallbackTextModel: string | null; fallbackAudioModel: string | null },
): Promise<{ ok: true; settings: AiSettings } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${getApiBaseUrl()}/api/admin/ai-settings`, {
    method: 'PUT',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, settings: (await res.json()) as AiSettings };
  const error = (await res.json().catch(() => null)) as { message?: string } | null;
  return { ok: false, status: res.status, message: error?.message ?? `Could not save (${res.status}).` };
}

export async function updateAiPlaybackSettings(
  token: string,
  body: { cueStartsAtPreviousCueEnd: boolean },
): Promise<{ ok: true; playback: AiPlaybackSettings } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${getApiBaseUrl()}/api/admin/ai-settings/playback`, {
    method: 'PUT',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, playback: (await res.json()) as AiPlaybackSettings };
  const error = (await res.json().catch(() => null)) as { message?: string } | null;
  return { ok: false, status: res.status, message: error?.message ?? `Could not save (${res.status}).` };
}

export async function updateAiAlignmentSettings(
  token: string,
  body: { alignToOriginalDialogue: boolean },
): Promise<{ ok: true; alignment: AiAlignmentSettings } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${getApiBaseUrl()}/api/admin/ai-settings/alignment`, {
    method: 'PUT',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, alignment: (await res.json()) as AiAlignmentSettings };
  const error = (await res.json().catch(() => null)) as { message?: string } | null;
  return { ok: false, status: res.status, message: error?.message ?? `Could not save (${res.status}).` };
}

export type AiPipelineSeverity = 'info' | 'warning' | 'error';

export type AiPipelineSummary = {
  days: number;
  from: string;
  generations: { total: number; done: number; failed: number; processing: number };
  byCode: { severity: AiPipelineSeverity; stage: string; code: string; count: number; lastAt: string }[];
  daily: { date: string; errors: number; warnings: number }[];
  keyFailures: { key: string; count: number; lastAt: string }[];
  quality: {
    languageCode: string;
    generations: number;
    words: number;
    exact: number;
    corrected: number;
    estimated: number;
    retried: number;
  }[];
};

export type AiPipelineEvent = {
  id: string;
  createdAt: string;
  severity: AiPipelineSeverity;
  stage: string;
  code: string;
  userId: string | null;
  jobId: string | null;
  endpoint: string | null;
  languageCode: string | null;
  model: string | null;
  keyHint: string | null;
  message: string | null;
  detailJson: string | null;
  durationMs: number | null;
};

export async function getAiPipelineSummary(token: string, days: number): Promise<AiPipelineSummary> {
  return adminFetch<AiPipelineSummary>(`/api/admin/ai-pipeline/summary?days=${days}`, token);
}

export async function listAiPipelineEvents(
  token: string,
  params: { days: number; severity?: string; stage?: string; code?: string; limit?: number; offset?: number },
): Promise<AdminPagedResult<AiPipelineEvent>> {
  const qs = new URLSearchParams({ days: String(params.days), limit: String(params.limit ?? 50), offset: String(params.offset ?? 0) });
  if (params.severity) qs.set('severity', params.severity);
  if (params.stage) qs.set('stage', params.stage);
  if (params.code) qs.set('code', params.code);
  return adminFetch<AdminPagedResult<AiPipelineEvent>>(`/api/admin/ai-pipeline/events?${qs}`, token);
}
