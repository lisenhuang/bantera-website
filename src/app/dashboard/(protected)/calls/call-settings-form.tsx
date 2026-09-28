'use client';

import { useActionState } from 'react';
import type { CallSettings } from '@/lib/dashboard-api';
import { saveCallSettingsAction, type CallSettingsState } from './actions';

export function CallSettingsForm({ settings }: { settings: CallSettings }) {
  const [state, action, pending] = useActionState<CallSettingsState, FormData>(saveCallSettingsAction, {});
  const relayOnly = settings.iceTransportPolicy === 'relay';

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="iceTransportPolicy" value={relayOnly ? 'all' : 'relay'} />
      <div className="flex items-start justify-between gap-6">
        <div>
          <p id="relay-label" className="font-medium text-gray-900 dark:text-white">Use TURN only</p>
          <p id="relay-help" className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            On: route every call through Cloudflare. Off: allow a direct connection using STUN,
            with TURN as a fallback when needed. Turn this on to test the relay even when both phones
            can connect directly, then turn it off after testing.
          </p>
        </div>
        <button type="submit" role="switch" aria-checked={relayOnly} aria-labelledby="relay-label"
          aria-describedby="relay-help" disabled={pending || (!settings.turnConfigured && !relayOnly)}
          className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 disabled:opacity-50 ${relayOnly ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-white/20'}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${relayOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Current mode: {relayOnly ? 'TURN only' : 'STUN with TURN fallback'}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {relayOnly
            ? 'Uses more relay traffic. If the relay is unavailable, new calls fail instead of connecting directly.'
            : 'Direct calls avoid relay traffic. Calls can use Cloudflare when a direct connection is unavailable.'}
        </p>
      </div>
      {!settings.turnConfigured && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
        The call relay is not configured on this backend. Configure it before enabling TURN only.
        {relayOnly ? ' New calls on updated apps are blocked until the relay is restored or this switch is turned off.' : ' Calls currently have direct connections only.'}
      </p>}
      <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
        Applies when starting a new call. TURN only requires Bantera 2.0.56 or later on both devices;
        older versions may still connect directly. Calls already in progress keep their current connection.
      </p>
      <p role="status" aria-live="polite" className="text-sm text-gray-500 dark:text-gray-400">
        {pending ? 'Saving…' : state.error
          ? <span className="text-red-600 dark:text-red-400">{state.error}</span>
          : state.ok ? 'Saved. The setting applies to new calls.' : 'Changes are saved when you use the switch.'}
      </p>
    </form>
  );
}
