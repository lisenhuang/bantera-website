'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, patchAdminUser, deleteAdminUser } from '@/lib/dashboard-api';

type PatchState = { success?: boolean; error?: string } | undefined;

export async function patchUserAction(
  userId: string,
  _prevState: PatchState,
  formData: FormData,
): Promise<PatchState> {
  const token = await getAccessToken();
  if (!token) return { error: 'Not authenticated.' };

  const role = formData.get('role') as string | null;
  const status = formData.get('status') as string | null;
  const limitStr = formData.get('aiAudioDailyLimit') as string | null;
  const clearLimit = formData.get('clearAiLimit') === 'true';

  let aiAudioDailyLimit: number | undefined;
  if (!clearLimit && limitStr != null && limitStr !== '') {
    const parsed = Number(limitStr);
    if (!isNaN(parsed) && parsed >= 0) aiAudioDailyLimit = parsed;
  }

  try {
    await patchAdminUser(token, userId, {
      role: role || undefined,
      status: status || undefined,
      aiAudioDailyLimit,
      clearAiLimit: clearLimit,
    });
    revalidatePath(`/dashboard/users/${userId}`);
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch {
    return { error: 'Failed to update user. Please try again.' };
  }
}

export async function deleteUserAction(userId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  try {
    await deleteAdminUser(token, userId);
  } catch {
    // best effort — redirect anyway
  }

  redirect('/dashboard/users');
}
