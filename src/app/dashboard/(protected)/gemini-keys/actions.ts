'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, mutateRegularKey } from '@/lib/dashboard-api';

export type KeyActionState = { ok?: boolean; error?: string };
export async function saveRegularKeyAction(_previous: KeyActionState, form: FormData): Promise<KeyActionState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const operation = String(form.get('operation') ?? '');
  if (!['add', 'update', 'remove'].includes(operation)) return { error: 'Choose a valid action.' };
  const id = operation === 'add' ? null : String(form.get('id') ?? '');
  if (id !== null && !/^[a-f0-9]{64}$/.test(id)) return { error: 'Invalid key identifier.' };
  const remarks = String(form.get('remarks') ?? '').trim();
  if (remarks.length > 1000) return { error: 'Remarks must be 1,000 characters or fewer.' };
  const apiKey = String(form.get('apiKey') ?? '').trim();
  if (operation === 'add' && (apiKey.length < 20 || apiKey.length > 4096)) return { error: 'Paste the complete Gemini API key.' };
  let result;
  try {
    result = await mutateRegularKey(token, operation === 'add' ? 'POST' : operation === 'update' ? 'PUT' : 'DELETE', id,
      operation === 'add' ? { apiKey, remarks } : operation === 'update' ? { remarks, enabled: form.get('enabled') === 'on' } : undefined);
  } catch { return { error: 'Could not connect to the server. Refresh to check whether the change was saved before trying again.' }; }
  if (!result.ok) {
    if (result.status === 401) redirect('/dashboard/login');
    return { error: result.message };
  }
  revalidatePath('/dashboard/gemini-keys');
  revalidatePath('/dashboard/ai');
  return { ok: true };
}
