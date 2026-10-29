'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, updatePracticeSettings } from '@/lib/dashboard-api';

export type PracticeSettingsState = { saved?: number; error?: string };
export async function savePracticeSettingsAction(_previous: PracticeSettingsState, form: FormData): Promise<PracticeSettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const raw = form.get('repeatWindow');
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isInteger(value) || value < 10 || value > 500) return { error: 'Choose a whole number from 10 to 500.' };
  let result;
  try { result = await updatePracticeSettings(token, value); }
  catch { return { error: 'Could not confirm the change. Please refresh before trying again.' }; }
  if (!result.ok) {
    if (result.status === 401) redirect('/dashboard/login');
    return { error: result.message };
  }
  revalidatePath('/dashboard/practice');
  return { saved: value };
}
