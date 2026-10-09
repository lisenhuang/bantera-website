'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getAccessToken } from '@/lib/dashboard-api';
import { CHATGPT_COOKIE, chatGptRequest } from '@/lib/chatgpt-connection';

export type DeviceLogin = { attempt: string; userCode: string; verificationUri: string; intervalSeconds: number; expiresAt: string };
export type SubscriptionModel = { id: string; name: string; reasoningLevels: string[]; defaultReasoning?: string };
export type SubscriptionTest = { answer: string; searchVerified: boolean; sources: { title: string; url: string }[] };
export type ConnectionState = { error?: string; message?: string; device?: DeviceLogin; connected?: boolean };
async function token() {
  const value = await getAccessToken();
  if (!value) redirect('/dashboard/login');
  return value;
}
function message(error: unknown) {
  if (error instanceof Error && error.message === 'unauthorized') redirect('/dashboard/login');
  return error instanceof Error ? error.message : 'The connection could not be completed. Please retry.';
}
export async function connectChatGpt(): Promise<ConnectionState> {
  const access = await token();
  const binding = randomBytes(32).toString('base64url');
  try {
    const device = await chatGptRequest<DeviceLogin>(access, '/device/start', { browserBinding: binding });
    if (device.verificationUri !== 'https://auth.openai.com/codex/device') throw new Error('Unexpected sign-in page. Please retry.');
    (await cookies()).set(CHATGPT_COOKIE, binding, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
    return { device };
  } catch (error) { return { error: message(error) }; }
}
export async function pollChatGpt(attempt: string): Promise<ConnectionState> {
  const access = await token();
  const binding = (await cookies()).get(CHATGPT_COOKIE)?.value;
  if (!binding) return { error: 'Sign-in expired. Start again.' };
  try {
    const result = await chatGptRequest<{ status: string }>(access, '/device/poll', { browserBinding: binding, attempt });
    if (result.status === 'connected') {
      (await cookies()).delete(CHATGPT_COOKIE);
      revalidatePath('/dashboard/ai');
      return { connected: true, message: 'ChatGPT connected. You can now load your models and test a response.' };
    }
    if (result.status === 'expired') return { error: 'Sign-in expired. Start again.' };
    return {};
  } catch (error) { return { error: message(error) }; }
}
export async function cancelChatGpt(attempt: string): Promise<ConnectionState> {
  const access = await token(); const jar = await cookies();
  try {
    await chatGptRequest(access, '/device/cancel', { attempt, browserBinding: jar.get(CHATGPT_COOKIE)?.value ?? '' });
    jar.delete(CHATGPT_COOKIE); return {};
  } catch (error) { return { error: message(error) }; }
}
export async function disconnectChatGpt(): Promise<ConnectionState> {
  const access = await token();
  try {
    await chatGptRequest(access, '/disconnect', {});
    (await cookies()).delete(CHATGPT_COOKIE);
    revalidatePath('/dashboard/ai');
    return { message: 'Disconnected from Bantera. You can also revoke access in your ChatGPT account settings.' };
  } catch (error) { return { error: message(error) }; }
}
export async function loadChatGptModels(): Promise<{ models?: SubscriptionModel[]; error?: string }> {
  const access = await token();
  try { return { models: await chatGptRequest<SubscriptionModel[]>(access, '/models') }; }
  catch (error) { return { error: message(error) }; }
}
export async function testChatGpt(model: string, reasoning: string, prompt: string, search: boolean): Promise<{ result?: SubscriptionTest; error?: string }> {
  const access = await token();
  try { return { result: await chatGptRequest<SubscriptionTest>(access, '/test', { model, reasoning, prompt, search }) }; }
  catch (error) { return { error: message(error) }; }
}
