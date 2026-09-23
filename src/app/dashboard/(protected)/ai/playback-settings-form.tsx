'use client';

import { useActionState } from 'react';
import type { AiPlaybackSettings } from '@/lib/dashboard-api';
import { savePlaybackSettingsAction, type PlaybackSettingsState } from './actions';

export function PlaybackSettingsForm({ playback }: { playback: AiPlaybackSettings }) {
  const [state, action, pending] = useActionState<PlaybackSettingsState, FormData>(savePlaybackSettingsAction, {});
  const on = playback.cueStartsAtPreviousCueEnd;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="enabled" value={on ? 'false' : 'true'} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id="cue-start-label" className="text-sm font-medium text-gray-900 dark:text-white">
            Start each sentence where the previous one ends
          </p>
          <p id="cue-start-help" className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            On: a sentence plays from just after the previous sentence&apos;s last word, so a first word timed a
            little late (&ldquo;I did…&rdquo;) is not cut off. Off: it starts at its own first word. Applies to every
            AI audio right away (the app picks it up next time it loads the audio); nothing is regenerated.
          </p>
        </div>
        <button
          type="submit"
          role="switch"
          aria-checked={on}
          aria-labelledby="cue-start-label"
          aria-describedby="cue-start-help"
          disabled={pending}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-60 ${on ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-white/20'}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400" role="status">
        {pending
          ? 'Saving…'
          : state.error
            ? <span className="text-red-600 dark:text-red-400">✕ {state.error}</span>
            : <>
                Currently <strong className="text-gray-900 dark:text-white">{on ? 'on' : 'off'}</strong>
                {playback.updatedAt && ` · changed ${new Date(playback.updatedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}`}
                {state.ok && ' · saved, live within 30 seconds'}
              </>}
      </p>
    </form>
  );
}
