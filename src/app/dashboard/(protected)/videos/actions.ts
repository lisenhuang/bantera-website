'use server';

import { redirect } from 'next/navigation';
import { getAccessToken, deleteAdminVideo } from '@/lib/dashboard-api';

export async function deleteVideoAction(videoId: string): Promise<{ error?: string }> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  try {
    await deleteAdminVideo(token, videoId);
    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}
