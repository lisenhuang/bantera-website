'use client';

import { useActionState } from 'react';
import type { GeminiKeyHealth } from '@/lib/dashboard-api';
import { retryGeminiKeyAction, type ModelSettingsState } from './actions';

function RetryKeyButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ModelSettingsState, FormData>(retryGeminiKeyAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending}
        className="rounded-lg border border-gray-300 dark:border-white/20 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
        {pending ? 'Retrying…' : 'Retry key'}
      </button>
      {state.error && <span role="alert" className="text-xs text-red-600 dark:text-red-400">{state.error}</span>}
      {state.ok && <span role="status" className="text-xs text-green-700 dark:text-green-400">Key re-enabled.</span>}
    </form>
  );
}

export function KeyHealthPanel({ health }: { health: GeminiKeyHealth }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {health.healthy} of {health.total} configured keys have no active issue. Invalid keys stay disabled until retried or replaced. Quota limits pause a key temporarily for the affected model.
      </p>
      {health.items.length === 0 ? (
        <p className="text-sm text-green-700 dark:text-green-400">No keys are disabled or cooling down.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-white/10">
          {health.items.map((item) => (
            <li key={`${item.id}-${item.model ?? ''}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-gray-900 dark:text-white">{item.hint}</code>
                  <span className={item.status === 'invalid'
                    ? 'rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300'
                    : 'rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'}>
                    {item.status === 'invalid' ? 'Invalid key' : 'Quota cooldown'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {item.reason}
                  {item.model && ` · ${item.model}`}
                  {item.retryAt && ` · Retry after ${new Date(item.retryAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}`}
                  {item.detectedAt && ` · Detected ${new Date(item.detectedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}`}
                </p>
              </div>
              {item.status === 'invalid' && <RetryKeyButton id={item.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
