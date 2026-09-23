'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/bantera-api';

type LoginState = { error: string } | undefined;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const next = formData.get('next') as string | null;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    return { error: 'Unable to reach the server. Please try again.' };
  }

  if (res.status === 429) {
    return { error: 'Too many login attempts. Please wait 15 minutes before trying again.' };
  }

  if (!res.ok) {
    return { error: 'Invalid email or password.' };
  }

  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };

  // Decode JWT payload to verify admin role (no verification — backend already validated)
  let role: string | null = null;
  try {
    const parts = data.accessToken.split('.');
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    ) as { role?: string };
    role = payload.role ?? null;
  } catch {
    return { error: 'Received an invalid token. Please try again.' };
  }

  if (role !== 'admin') {
    return { error: 'You do not have admin access.' };
  }

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set('bantera_access_token', data.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: data.expiresIn,
    path: '/',
  });

  cookieStore.set('bantera_refresh_token', data.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90, // 90 days
    path: '/',
  });

  redirect(isSafeNext(next) ? next : '/dashboard');
}

/**
 * Only allow returning to a dashboard path. Rejects protocol-relative and absolute URLs so
 * the `next` parameter cannot be used as an open redirect.
 */
function isSafeNext(next: string | null): next is string {
  return !!next && next.startsWith('/dashboard/') && !next.startsWith('//');
}

export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete('bantera_access_token');
  cookieStore.delete('bantera_refresh_token');
  redirect('/dashboard/login');
}
