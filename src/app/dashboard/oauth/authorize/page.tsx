import { redirect } from 'next/navigation';
import { getAccessToken, getOAuthRequest, type OAuthConsentRequest } from '@/lib/dashboard-api';
import ConsentForm from './consent-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Authorize application',
  robots: { index: false, follow: false },
};

/**
 * OAuth consent screen for the admin MCP server.
 *
 * The backend validates the OAuth request and stores it, then sends the browser here with
 * only an opaque request_id — so this page never has to re-validate OAuth parameters or be
 * trusted with them. It sits under /dashboard, so proxy.ts already requires an admin session.
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string }>;
}) {
  const { request_id: requestId } = await searchParams;

  const token = await getAccessToken();
  if (!token) {
    redirect(`/dashboard/login?next=${encodeURIComponent(`/dashboard/oauth/authorize?request_id=${requestId ?? ''}`)}`);
  }

  if (!requestId) return <ExpiredCard reason="This link is missing its authorization request." />;

  let request: OAuthConsentRequest;
  try {
    request = await getOAuthRequest(token, requestId);
  } catch {
    return <ExpiredCard reason="This authorization request has expired or was already used." />;
  }

  return (
    <Shell>
      <ConsentForm request={request} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Authorize application</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            An application is asking to access your Bantera admin data
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function ExpiredCard({ reason }: { reason: string }) {
  return (
    <Shell>
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-8 text-center">
        <p className="text-sm text-gray-700 dark:text-gray-300">{reason}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Close this window and start the connection again from the application.
        </p>
      </div>
    </Shell>
  );
}
