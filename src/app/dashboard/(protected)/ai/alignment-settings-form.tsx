'use client';

import { useActionState } from 'react';
import type { AiAlignmentSettings } from '@/lib/dashboard-api';
import { saveAlignmentSettingsAction, type AlignmentSettingsState } from './actions';

export function AlignmentSettingsForm({ alignment }: { alignment: AiAlignmentSettings }) {
  const [state, action, pending] = useActionState<AlignmentSettingsState, FormData>(saveAlignmentSettingsAction, {});
  const on = alignment.alignToOriginalDialogue;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="enabled" value={on ? 'false' : 'true'} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id="alignment-label" className="text-sm font-medium text-gray-900 dark:text-white">
            Align transcribed words to the original dialogue
          </p>
          <p id="alignment-help" className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            On (default): show the original dialogue and align its words to the audio. Off: show the
            transcription and highlight its own timed words, even where it differs from the original.
            Applies only to newly generated AI audio; saved audio is unchanged.
          </p>
        </div>
        <button type="submit" role="switch" aria-checked={on} aria-labelledby="alignment-label"
          aria-describedby="alignment-help" disabled={pending}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-60 ${on ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-white/20'}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400" role="status">
        {pending ? 'Saving…' : state.error
          ? <span className="text-red-600 dark:text-red-400">✕ {state.error}</span>
          : <>
              Currently <strong className="text-gray-900 dark:text-white">{on ? 'on' : 'off'}</strong>
              {alignment.updatedAt && ` · changed ${new Date(alignment.updatedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}`}
              {state.ok && ' · saved'}
            </>}
      </p>
    </form>
  );
}
