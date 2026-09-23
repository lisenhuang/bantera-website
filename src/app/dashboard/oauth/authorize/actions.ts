'use server';

import { redirect } from 'next/navigation';
import { getAccessToken, submitOAuthConsent } from '@/lib/dashboard-api';

type ConsentState = { error: string } | undefined;

/**
 * Submits the admin's decision. The backend mints the authorization code and builds the
 * redirect URL — this action never constructs it, so the browser can only ever be sent to a
 * redirect URI the backend already matched against the client's registered list.
 */
export async function consentAction(
  _prevState: ConsentState,
  formData: FormData,
): Promise<ConsentState> {
  const requestId = formData.get('requestId') as string;
  const approve = formData.get('decision') === 'approve';
  const scopes = formData.getAll('scopes').map(String);

  if (!requestId) return { error: 'This authorization request is no longer valid.' };

  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  let redirectUrl: string;
  try {
    const result = await submitOAuthConsent(token, { requestId, approve, scopes });
    redirectUrl = result.redirectUrl;
  } catch {
    return { error: 'This authorization request has expired or was already used. Start the connection again from the application.' };
  }

  redirect(redirectUrl);
}
