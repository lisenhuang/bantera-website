'use client';

import { useActionState } from 'react';
import type { AiSettings } from '@/lib/dashboard-api';
import { saveModelSettingsAction, type ModelSettingsState } from './actions';

const selectClass =
  'w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50';

function ModelField({ name, label, help, current, defaultModel, override, options }: {
  name: string;
  label: string;
  help: string;
  current: string;
  defaultModel: string;
  override: AiSettings['overrides']['textModel'];
  options: string[];
}) {
  // A saved choice that Gemini no longer lists stays selectable, flagged, so it is never silently lost.
  const missing = override && !options.includes(override.value) ? override.value : null;
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-2">{help}</span>
      <select name={name} defaultValue={override?.value ?? ''} className={selectClass}>
        <option value="">Default — {defaultModel}</option>
        {missing && <option value={missing}>{missing} (no longer listed by Gemini)</option>}
        {options.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1.5">
        In use: <code className="text-gray-700 dark:text-gray-300">{current}</code>
        {override
          ? ` · set ${new Date(override.updatedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}`
          : ' · default'}
      </span>
    </label>
  );
}

export function ModelSettingsForm({ settings }: { settings: AiSettings }) {
  const [state, action, pending] = useActionState<ModelSettingsState, FormData>(saveModelSettingsAction, {});

  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ModelField
          name="textModel"
          label="Text model"
          help="Writes dialogues, fixes transcripts, and matches transcribed words back to the script."
          current={settings.textModel}
          defaultModel={settings.defaults.textModel}
          override={settings.overrides.textModel}
          options={settings.availableTextModels}
        />
        <ModelField
          name="audioModel"
          label="Audio (TTS) model"
          help="Speaks the dialogue with two voices."
          current={settings.audioModel}
          defaultModel={settings.defaults.audioModel}
          override={settings.overrides.audioModel}
          options={settings.availableAudioModels}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !settings.modelListAvailable}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white">
          {pending ? 'Saving…' : 'Save models'}
        </button>
        {state.ok && !pending && <span role="status" className="text-sm text-green-700 dark:text-green-400">✓ Saved. New generations use these models within 30 seconds.</span>}
        {state.error && <span role="alert" className="text-sm text-red-600 dark:text-red-400">✕ {state.error}</span>}
      </div>
    </form>
  );
}
