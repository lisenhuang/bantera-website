'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, retryGeminiKey, updateAiAlignmentSettings, updateAiPlaybackSettings, updateAiSettings } from '@/lib/dashboard-api';

export type ModelSettingsState = { ok?: boolean; error?: string };

export async function retryGeminiKeyAction(_prev: ModelSettingsState, form: FormData): Promise<ModelSettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const id = String(form.get('id') ?? '');
  if (!/^[a-f0-9]{64}$/.test(id)) return { error: 'Invalid key identifier.' };

  const result = await retryGeminiKey(token, id);
  if (!result.ok) {
    if (result.status === 401) redirect('/dashboard/login');
    return { error: result.message };
  }
  revalidatePath('/dashboard/ai');
  return { ok: true };
}

/** The empty option means "use the default", which clears the override. */
export async function saveModelSettingsAction(_prev: ModelSettingsState, form: FormData): Promise<ModelSettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  const pick = (name: string) => {
    const value = String(form.get(name) ?? '').trim();
    return value === '' ? null : value;
  };

  const timeoutValue = pick('gptTimeoutSeconds');
  const gptTimeoutSeconds = timeoutValue === null ? undefined : Number(timeoutValue);
  if (gptTimeoutSeconds !== undefined && (!Number.isInteger(gptTimeoutSeconds) || gptTimeoutSeconds < 30 || gptTimeoutSeconds > 300))
    return { error: 'GPT response timeout must be a whole number from 30 to 300 seconds.' };
  const result = await updateAiSettings(token, {
    gptTimeoutSeconds,
    textModel: pick('textModel'),
    audioModel: pick('audioModel'),
    fallbackTextModel: pick('fallbackTextModel'),
    fallbackAudioModel: pick('fallbackAudioModel'),
    textReasoning: pick('textReasoning'), fallbackTextReasoning: pick('fallbackTextReasoning'),
    searchModel: pick('searchModel'), fallbackSearchModel: pick('fallbackSearchModel'),
    searchReasoning: pick('searchReasoning'), fallbackSearchReasoning: pick('fallbackSearchReasoning'),
  });
  if (!result.ok) {
    if (result.status === 401) redirect('/dashboard/login');
    return { error: result.message };
  }

  revalidatePath('/dashboard/ai');
  return { ok: true };
}

export type PlaybackSettingsState = { ok?: boolean; error?: string };

export async function savePlaybackSettingsAction(_prev: PlaybackSettingsState, form: FormData): Promise<PlaybackSettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  const result = await updateAiPlaybackSettings(token, { cueStartsAtPreviousCueEnd: form.get('enabled') === 'true' });
  if (!result.ok) {
    if (result.status === 401) redirect('/dashboard/login');
    return { error: result.message };
  }

  revalidatePath('/dashboard/ai');
  return { ok: true };
}

export type AlignmentSettingsState = { ok?: boolean; error?: string };

export async function saveAlignmentSettingsAction(_prev: AlignmentSettingsState, form: FormData): Promise<AlignmentSettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  const result = await updateAiAlignmentSettings(token, { alignToOriginalDialogue: form.get('enabled') === 'true' });
  if (!result.ok) {
    if (result.status === 401) redirect('/dashboard/login');
    return { error: result.message };
  }

  revalidatePath('/dashboard/ai');
  return { ok: true };
}

export type SearchTestState = { result?: import('@/lib/dashboard-api').AiSearchTestResult; error?: string; query?: string };

export async function testWebSearchAction(_prev: SearchTestState, form: FormData): Promise<SearchTestState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const query = String(form.get('query') ?? '').trim();
  if (query.length < 3 || query.length > 1000) return { error: 'Enter a search query between 3 and 1,000 characters.' };
  const { testAiWebSearch } = await import('@/lib/dashboard-api');
  const response = await testAiWebSearch(token, query);
  if (!response.ok) {
    if (response.status === 401) redirect('/dashboard/login');
    return { error: response.message, query };
  }
  return { result: response.result, query };
}
