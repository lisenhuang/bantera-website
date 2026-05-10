'use server';

import { redirect } from 'next/navigation';
import { getAccessToken, deleteAdminMessage } from '@/lib/dashboard-api';

export async function deleteMessageAction(messageId: string): Promise<{ error?: string }> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  try {
    await deleteAdminMessage(token, messageId);
    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}
