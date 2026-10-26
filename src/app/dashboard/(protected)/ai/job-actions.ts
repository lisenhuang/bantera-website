'use server';

import { getAccessToken } from '@/lib/dashboard-api';
import { getApiBaseUrl } from '@/lib/bantera-api';

export type AiJobKind = 'admin-search' | 'admin-gpt';
export type AiJobState = { jobId: string; kind: string; status: string; statusCode: number; result?: Record<string, unknown> };
const routes = { 'admin-search': '/api/admin/ai-settings/search-test', 'admin-gpt': '/api/admin/ai-settings/chatgpt/test' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function request(path: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again.');
  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...options, cache: 'no-store',
    signal: AbortSignal.timeout(15000), headers: { ...options.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  if (!response.ok) {
    if (response.status === 404) throw new Error('This job is unavailable or has expired.');
    if (response.status === 401 || response.status === 403) throw new Error('Please sign in with an authorized account.');
    throw new Error('Could not reach generation. Please try again.');
  }
  return response.json();
}
export async function startAiJob(kind: AiJobKind, id: string, body: Record<string, unknown>): Promise<{ jobId: string }> {
  if (!Object.hasOwn(routes, kind) || !uuid.test(id)) throw new Error('Invalid generation request.');
  if (JSON.stringify(body).length > 10000) throw new Error('Request is too large.');
  return request(routes[kind], { method: 'POST', headers: { Prefer: 'respond-async', 'Idempotency-Key': id }, body: JSON.stringify(body) });
}
export async function getAiJob(id: string): Promise<AiJobState> {
  if (!uuid.test(id)) throw new Error('Invalid job.');
  return request(`/api/me/ai-jobs/${id}`);
}
