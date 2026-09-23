'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, updateAiSettings } from '@/lib/dashboard-api';

export type ModelSettingsState = { ok?: boolean; error?: string };

/** The empty option means "use the default", which clears the override. */
export async function saveModelSettingsAction(_prev: ModelSettingsState, form: FormData): Promise<ModelSettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  const pick = (name: string) => {
    const value = String(form.get(name) ?? '').trim();
    return value === '' ? null : value;
  };

  const result = await updateAiSettings(token, { textModel: pick('textModel'), audioModel: pick('audioModel') });
  if (!result.ok) {
    if (result.status === 401) redirect('/dashboard/login');
    return { error: result.message };
  }

  revalidatePath('/dashboard/ai');
  return { ok: true };
}
