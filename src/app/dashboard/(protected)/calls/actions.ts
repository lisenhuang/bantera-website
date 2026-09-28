'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, updateCallSettings } from '@/lib/dashboard-api';

export type CallSettingsState = { ok?: boolean; error?: string };

export async function saveCallSettingsAction(_previous: CallSettingsState, form: FormData): Promise<CallSettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const policy = form.get('iceTransportPolicy');
  if (policy !== 'all' && policy !== 'relay') return { error: 'Choose a valid call connection mode.' };

  let result;
  try {
    result = await updateCallSettings(token, policy);
  } catch {
    return { error: 'Could not reach the server. Your setting was not confirmed. Refresh before trying again.' };
  }
  if (!result.ok) {
    if (result.status === 401) redirect('/dashboard/login');
    return { error: result.message };
  }
  revalidatePath('/dashboard/calls');
  return { ok: true };
}
