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

export type AdminStats = {
  totalUsers: number;
  totalVideos: number;
  activeLast7Days: number;
  activeLast30Days: number;
  aiGeneratedVideos: number;
  uploadedVideos: number;
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
  },
): Promise<void> {
  await adminFetch(`/api/admin/users/${userId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      role: body.role ?? null,
      status: body.status ?? null,
      aiAudioDailyLimit: body.aiAudioDailyLimit ?? null,
      clearAiLimit: body.clearAiLimit ?? false,
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
