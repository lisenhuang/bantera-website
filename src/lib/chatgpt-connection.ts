import 'server-only';
import { getApiBaseUrl } from './bantera-api';

export type ChatGptStatus = {
  configured: boolean; connected: boolean; planEnabled: boolean;
  email?: string; connectedAt?: string;
};
export const CHATGPT_COOKIE = '__Host-bantera-chatgpt-connect';

export async function chatGptRequest<T>(token: string, action = '', body?: unknown): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/ai-settings/chatgpt${action}`, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(action === '/test' ? 330000 : 100000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('unauthorized');
    const failure = await response.json().catch(() => ({}));
    throw new Error(typeof failure.message === 'string' ? failure.message : 'ChatGPT connection failed. Please retry.');
  }
  return response.json() as Promise<T>;
}
