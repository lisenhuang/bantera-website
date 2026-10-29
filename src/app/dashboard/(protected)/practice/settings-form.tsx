'use client';
import { useActionState } from 'react';
import type { PracticeSettings } from '@/lib/dashboard-api';
import { savePracticeSettingsAction } from './actions';

export function PracticeSettingsForm({ settings }: { settings: PracticeSettings }) {
  const [state, action, pending] = useActionState(savePracticeSettingsAction, {});
  return <form action={action} className="space-y-5">
    <fieldset disabled={pending} className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
      <legend className="px-2 text-lg font-semibold text-gray-900 dark:text-white">Māori availability</legend>
      <label htmlFor="maori-public-enabled" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-gray-900 dark:text-white">
        <input id="maori-public-enabled" name="maoriPublicEnabled" type="checkbox" value="true"
          defaultChecked={settings.maoriPublicEnabled ?? false} aria-describedby="maori-visibility-help"
          className="h-5 w-5 shrink-0 accent-violet-600 disabled:opacity-50" />
        Show Māori to everyone
      </label>
      <p id="maori-visibility-help" className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">Off by default: only admins can see Māori for testing. When on, Māori is visible to everyone without an admin badge.</p>
    </fieldset>
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Exercise repeat window</h2>
      <p id="repeat-help" className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">Exclude each person’s most recent exercises in the same language and level. Older exercises can return with their existing audio. New, unseen exercises are preferred.</p>
    </div>
    <div>
      <label htmlFor="repeat-window" className="block text-sm font-medium text-gray-900 dark:text-white">Recent exercises to avoid repeating</label>
      <input id="repeat-window" name="repeatWindow" type="number" min={10} max={500} step={1} required defaultValue={settings.repeatWindow}
        aria-describedby="repeat-help repeat-cost" disabled={pending}
        className="mt-2 w-40 rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-gray-900 focus:outline-2 focus:outline-violet-500 disabled:opacity-50 dark:border-white/20 dark:text-white" />
      <p className="mt-2 text-xs text-gray-500">Default: 50. You can choose any whole number from 10 to 500, including 30, 50 or 100.</p>
    </div>
    <p id="repeat-cost" className="rounded-xl bg-violet-50 p-4 text-sm leading-6 text-gray-600 dark:bg-violet-500/10 dark:text-gray-300">A larger window needs more prepared exercises and may increase generation time and cost. If none are eligible, Bantera prepares more rather than repeating a recent exercise. Applies to new exercise selections; current exercises and Saved Practice stay available.</p>
    <button type="submit" disabled={pending} className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-50">{pending ? 'Saving…' : 'Save changes'}</button>
    <p role="status" aria-live="polite" className={`text-sm ${state.error ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
      {state.error ?? (state.saved !== undefined ? `Saved. Māori is ${state.saved.maoriPublicEnabled ? 'visible to everyone' : 'available to admins for testing only'}. The last ${state.saved.repeatWindow} exercises will be excluded for each person, language and level.` : '')}
    </p>
  </form>;
}
