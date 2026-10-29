'use client';

import { useActionState } from 'react';
import type { SpeakingLeaderboardSettings } from '@/lib/dashboard-api';
import { leaderboardPeriodLabel } from '@/lib/speaking-leaderboard-settings';
import { saveSpeakingLeaderboardSettingsAction } from './speaking-leaderboard-actions';

export function SpeakingLeaderboardSettingsForm({ settings }: { settings: SpeakingLeaderboardSettings | null }) {
  const [state, action, pending] = useActionState(saveSpeakingLeaderboardSettingsAction, {});
  return <form action={action} className="my-5 rounded-xl border border-gray-200 p-4 dark:border-white/10">
    <label htmlFor="speaking-leaderboard-days" className="block text-sm font-semibold text-gray-900 dark:text-white">App leaderboard period</label>
    <p id="speaking-leaderboard-help" className="mt-1 text-sm text-gray-600 dark:text-gray-400">Choose how many recent days count toward everyone’s speaking leaderboard. Default: 30 days. This does not change the analytics filters below.</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <input key={settings?.days ?? 'unavailable'} id="speaking-leaderboard-days" name="days" type="number" min={1} max={365} step={1} required
        defaultValue={settings?.days ?? ''} disabled={pending || settings === null}
        aria-describedby="speaking-leaderboard-help speaking-leaderboard-current speaking-leaderboard-status"
        className="w-28 rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-gray-900 focus:outline-2 focus:outline-violet-500 disabled:opacity-50 dark:border-white/20 dark:text-white" />
      <span className="text-sm text-gray-600 dark:text-gray-400">days (1–365)</span>
      <button type="submit" disabled={pending || settings === null} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">{pending ? 'Saving…' : 'Save period'}</button>
    </div>
    <p id="speaking-leaderboard-current" className="mt-3 text-xs text-gray-500 dark:text-gray-400">
      {settings ? `Saved period: ${leaderboardPeriodLabel(settings.days).toLowerCase()}.` : 'The saved period could not be loaded. Refresh before changing it.'}
    </p>
    <p id="speaking-leaderboard-status" role="status" aria-live="polite" className={`mt-2 text-sm ${state.error ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
      {state.error ?? (state.saved ? `Saved. The app leaderboard now uses the last ${state.saved.days} ${state.saved.days === 1 ? 'day' : 'days'}.` : '')}
    </p>
  </form>;
}
