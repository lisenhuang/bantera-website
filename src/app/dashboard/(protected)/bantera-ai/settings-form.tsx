'use client';
import { useActionState } from 'react';
import type { BanteraAiSettings } from '@/lib/dashboard-api';
import { saveBanteraAi, type SettingsState } from './actions';
export function SettingsForm({ settings }: { settings: BanteraAiSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveBanteraAi, {});
  const voices = settings.voices ?? [];
  const voiceAvailable = voices.some(voice => voice.name === settings.voice);
  const available = settings.liveModels.includes(settings.model);
  return <form action={action} className="space-y-5">
    <label className="block text-sm font-medium text-gray-900 dark:text-white" htmlFor="live-model">Gemini Live model</label>
    <select key={settings.model} id="live-model" name="model" defaultValue={available ? settings.model : ''} disabled={pending || !settings.liveModels.length}
      aria-describedby="model-help" required className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-white/20 dark:bg-gray-950 dark:text-white">
      <option value="" disabled>Select an available model</option>
      {settings.liveModels.map(model => <option key={model} value={model}>{model}</option>)}
    </select>
    <p id="model-help" className="text-sm leading-6 text-gray-500 dark:text-gray-400">Used for voice-message replies and audio calls. Only models advertising the Live API capability appear here. Changes apply to new messages and calls.</p>
    <p className="text-sm text-gray-600 dark:text-gray-300">Current selection: <span className="font-mono break-all">{settings.model}</span></p>
    {!available && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">The current selection is not in the available Live catalogue. Choose a supported model before using Bantera AI.</p>}
    <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-white/10">
      <label htmlFor="live-voice" className="block text-sm font-medium text-gray-900 dark:text-white">Response voice</label>
      <select key={settings.voice} id="live-voice" name="voice" required defaultValue={voiceAvailable ? settings.voice : ''}
        disabled={pending || !voices.length} aria-describedby="voice-help"
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-white/20 dark:bg-gray-950 dark:text-white">
        <option value="" disabled>Select a voice</option>
        {voices.map(voice => <option key={voice.name} value={voice.name}>
          {voice.gender === 'Female' ? '♀' : '♂'} {voice.name} · {voice.gender} · {voice.style}
        </option>)}
      </select>
      <p id="voice-help" className="text-sm leading-6 text-gray-500 dark:text-gray-400">The same voice is used for replies, audio calls and callbacks. The learner’s language and regional accent still come from their profile. Gender labels describe the synthetic voice presentation.</p>
      <a href="https://firebase.google.com/docs/ai-logic/live-api/configuration#response-voice" target="_blank" rel="noreferrer" className="inline-block text-sm font-medium text-indigo-600 underline dark:text-indigo-400">Listen to Google’s voice samples ↗</a>
      {!voices.length && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">Deploy the updated backend to enable voice selection, then refresh this page.</p>}
    </div>
    <button disabled={pending || !settings.liveModels.length || !voices.length} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{pending ? 'Saving…' : 'Save model and voice'}</button>
    <p role="status" aria-live="polite" className={`text-sm ${state.error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{state.error || (state.ok ? 'Saved. New voice messages and calls will use this model and voice.' : '')}</p>
  </form>;
}
