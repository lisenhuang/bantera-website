import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/dashboard-api';
import { CHATGPT_COOKIE, chatGptRequest } from '@/lib/chatgpt-connection';

export async function GET(request: NextRequest) {
  const token = await getAccessToken();
  const binding = request.cookies.get(CHATGPT_COOKIE)?.value;
  let result = 'failed';
  const params = request.nextUrl.searchParams;
  const state = params.get('state');
  const code = params.get('code');
  const error = params.get('error');
  if (token && binding && state && state.length <= 128 && (code?.length ?? 0) <= 8192 &&
      ['state', 'code', 'error'].every(key => params.getAll(key).length <= 1)) {
    try {
      await chatGptRequest(token, '/complete', { browserBinding: binding, state, code, error });
      result = 'connected';
    } catch { /* No callback values or provider errors in logs, HTML, or the destination URL. */ }
  }
  const response = NextResponse.redirect(new URL(`/dashboard/ai?chatgpt=${result}`, request.url), 303);
  response.cookies.delete(CHATGPT_COOKIE);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
