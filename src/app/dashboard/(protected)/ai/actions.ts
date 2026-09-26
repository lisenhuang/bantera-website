'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, updateAiAlignmentSettings, updateAiPlaybackSettings, updateAiSettings } from '@/lib/dashboard-api';

export type ModelSettingsState = { ok?: boolean; error?: string };

/** The empty option means "use the default", which clears the override. */
export async function saveModelSettingsAction(_prev: ModelSettingsState, form: FormData): Promise<ModelSettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  const pick = (name: string) => {
    const value = String(form.get(name) ?? '').trim();
    return value === '' ? null : value;
  };

  const result = await updateAiSettings(token, {
    textModel: pick('textModel'),
    audioModel: pick('audioModel'),
    fallbackTextModel: pick('fallbackTextModel'),
    fallbackAudioModel: pick('fallbackAudioModel'),
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
