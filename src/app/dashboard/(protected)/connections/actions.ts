'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, revokeOAuthGrant } from '@/lib/dashboard-api';

export async function revokeGrantAction(familyId: string): Promise<{ error?: string } | void> {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  try {
    await revokeOAuthGrant(token, familyId);
  } catch {
    return { error: 'Could not revoke this application.' };
  }

  revalidatePath('/dashboard/connections');
}
