'use client';

import { useActionState } from 'react';
import type { OAuthConsentRequest } from '@/lib/dashboard-api';
import { consentAction } from './actions';

const SCOPE_LABELS: Record<string, { title: string; detail: string }> = {
  'mcp:read': {
    title: 'Read your admin data',
    detail: 'User counts and activity, languages, content, chat statistics, and user lookups.',
  },
  'mcp:write': {
    title: 'Make changes on your behalf',
    detail: 'Change roles and account status, delete users or content, and send push notifications.',
  },
};

export default function ConsentForm({ request }: { request: OAuthConsentRequest }) {
  const [state, formAction, pending] = useActionState(consentAction, undefined);

  const wantsWrite = request.requestedScopes.includes('mcp:write');

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-8">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="requestId" value={request.requestId} />

        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">{request.clientName}</span>{' '}
            wants to connect to your Bantera admin account.
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            After you approve, you will be sent to{' '}
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{request.redirectHost}</span>.
          </p>
        </div>

        {request.isLoopback && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
            This will return to an application running on your own computer. Only continue if you
            just started this connection yourself.
          </div>
        )}

        <div className="space-y-3">
          <p className="label-xs">Permissions</p>

          {/* Read is always granted: it is the minimum this connection needs to work. */}
          <label className="flex gap-3 rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3">
            <input type="checkbox" checked disabled className="mt-0.5" />
            <input type="hidden" name="scopes" value="mcp:read" />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                {SCOPE_LABELS['mcp:read'].title}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {SCOPE_LABELS['mcp:read'].detail}
              </span>
            </span>
          </label>

          {wantsWrite && (
            <label className="flex gap-3 rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors">
              <input type="checkbox" name="scopes" value="mcp:write" className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">
                  {SCOPE_LABELS['mcp:write'].title}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {SCOPE_LABELS['mcp:write'].detail}
                </span>
                <span className="block text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Leave this unticked to grant read-only access.
                </span>
              </span>
            </label>
          )}
        </div>

        {state?.error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {state.error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            name="decision"
            value="deny"
            disabled={pending}
            className="flex-1 border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 font-medium py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            Deny
          </button>
          <button
            type="submit"
            name="decision"
            value="approve"
            disabled={pending}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {pending ? 'Working…' : 'Approve'}
          </button>
        </div>
      </form>
    </div>
  );
}
