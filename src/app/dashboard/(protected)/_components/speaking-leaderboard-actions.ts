'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, updateSpeakingLeaderboardSettings, type SpeakingLeaderboardSettings } from '@/lib/dashboard-api';
import { isLeaderboardDays } from '@/lib/speaking-leaderboard-settings';

export type SpeakingLeaderboardSettingsState = { saved?: SpeakingLeaderboardSettings; error?: string };

export async function saveSpeakingLeaderboardSettingsAction(
  _previous: SpeakingLeaderboardSettingsState,
  form: FormData,
): Promise<SpeakingLeaderboardSettingsState> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const raw = form.get('days');
  const days = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!isLeaderboardDays(days)) return { error: 'Choose a whole number from 1 to 365.' };

  let result;
  try { result = await updateSpeakingLeaderboardSettings(token, { days }); }
  catch { return { error: 'Could not confirm the change. Please refresh before trying again.' }; }
  if (!result.ok) {
    if (result.status === 401) redirect('/dashboard/login');
    return { error: result.message };
  }
  revalidatePath('/dashboard');
  return { saved: result.settings };
}
