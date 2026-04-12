import { NextRequest, NextResponse } from 'next/server';

function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    ) as { exp?: number; role?: string };
    if (payload.exp != null && payload.exp < Date.now() / 1000) return null;
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('bantera_access_token')?.value;
  const role = token ? decodeJwtRole(token) : null;

  if (role !== 'admin') {
    const loginUrl = new URL('/dashboard/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect all /dashboard/* except /dashboard/login
  matcher: ['/dashboard/((?!login$|login/).*)'],
};
