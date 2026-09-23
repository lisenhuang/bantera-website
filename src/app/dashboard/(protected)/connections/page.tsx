import { redirect } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/bantera-api';
import { getAccessToken, listOAuthGrants, type OAuthGrant } from '@/lib/dashboard-api';
import { ConnectInstructions } from './connect-instructions';
import RevokeButton from './revoke-button';

export const dynamic = 'force-dynamic';

const SCOPE_LABELS: Record<string, string> = {
  'mcp:read': 'Read',
  'mcp:write': 'Write',
};

/** Applications connected to this admin account via the MCP server. */
export default async function ConnectionsPage() {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');

  let grants: OAuthGrant[] = [];
  let error: string | null = null;
  try {
    grants = await listOAuthGrants(token);
  } catch {
    error = 'Could not load connected applications.';
  }

  return (
    <div className="max-w-4xl space-y-8">
      <ConnectInstructions mcpUrl={`${getApiBaseUrl()}/mcp`} />

      <section>
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Connected applications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Applications you have authorized to access Bantera admin data. Revoking takes effect
            the next time the application refreshes its access, within an hour.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!error && grants.length === 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No applications are connected to your account yet.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {grants.map((grant) => (
            <div
              key={grant.familyId}
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-5 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {grant.clientName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate mt-0.5">
                  {grant.clientId}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {grant.scopes.split(' ').filter(Boolean).map((scope) => (
                    <span
                      key={scope}
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        scope === 'mcp:write'
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                          : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10'
                      }`}
                    >
                      {SCOPE_LABELS[scope] ?? scope}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Connected {new Date(grant.createdAt).toLocaleDateString()}
                  {grant.lastUsedAt && ` · last used ${new Date(grant.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <RevokeButton familyId={grant.familyId} clientName={grant.clientName} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
