'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, updateBanteraAiSettings } from '@/lib/dashboard-api';
export type SettingsState = { ok?: boolean; error?: string };
export async function saveBanteraAi(_previous: SettingsState, form: FormData): Promise<SettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const model = form.get('model');
  if (typeof model !== 'string' || !model.trim() || model.length > 100) return { error: 'Choose an available Live model.' };
  const voice = form.get('voice');
  if (typeof voice !== 'string' || !/^[A-Za-z]{1,30}$/.test(voice)) return { error: 'Choose an available Live voice.' };
  const reasoning = form.get('reasoning');
  if (reasoning !== null && (typeof reasoning !== 'string' || !/^(default|minimal|low|medium|high|dynamic|off|1024|4096|8192|24576)$/.test(reasoning)))
    return { error: 'Choose a reasoning setting supported by the selected model.' };
  let result;
  try { result = await updateBanteraAiSettings(token, model, voice, reasoning ?? undefined); }
  catch { return { error: 'Could not save. Refresh to check the current setting before trying again.' }; }
  if (result.status === 401) redirect('/dashboard/login');
  if (!result.ok) return { error: 'The model, voice or reasoning setting could not be confirmed or saved. Refresh the available models and try again.' };
  revalidatePath('/dashboard/bantera-ai');
  return { ok: true };
}
