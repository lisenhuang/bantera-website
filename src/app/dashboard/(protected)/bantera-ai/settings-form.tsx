'use client';
import { useActionState, useState } from 'react';
import type { BanteraAiSettings } from '@/lib/dashboard-api';
import { saveBanteraAi, type SettingsState } from './actions';
export function SettingsForm({ settings }: { settings: BanteraAiSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveBanteraAi, {});
  const [model, setModel] = useState(settings.liveModels.includes(settings.model) ? settings.model : '');
  const [reasoningByModel, setReasoningByModel] = useState<Record<string, string>>({ ...settings.reasoningByModel, [settings.model]: settings.reasoning ?? 'default' });
  const capability = settings.reasoningCapabilities?.[model];
  const selectedReasoning = reasoningByModel[model] ?? 'default';
  const reasoning = capability?.options.some(option => option.value === selectedReasoning) ? selectedReasoning : 'default';
  const voices = settings.voices ?? [];
  const voiceAvailable = voices.some(voice => voice.name === settings.voice);
  const available = settings.liveModels.includes(settings.model);
  return <form action={action} className="space-y-5">
    <label className="block text-sm font-medium text-gray-900 dark:text-white" htmlFor="live-model">Gemini Live model</label>
    <select id="live-model" name="model" value={model} onChange={event => setModel(event.target.value)} disabled={pending || !settings.liveModels.length}
      aria-describedby="model-help" required className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-white/20 dark:bg-gray-950 dark:text-white">
      <option value="" disabled>Select an available model</option>
      {settings.liveModels.map(model => <option key={model} value={model}>{model}</option>)}
    </select>
    <p id="model-help" className="text-sm leading-6 text-gray-500 dark:text-gray-400">Used for voice-message replies and audio calls. Only models advertising the Live API capability appear here. Changes apply to new messages and calls.</p>
    <p className="text-sm text-gray-600 dark:text-gray-300">Saved model: <span className="font-mono break-all">{settings.model}</span></p>
    {!available && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">The current selection is not in the available Live catalogue. Choose a supported model before using Bantera AI.</p>}
    <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-white/10">
      <label htmlFor="live-reasoning" className="block text-sm font-medium text-gray-900 dark:text-white">{capability?.mode === 'budget' ? 'Reasoning budget' : 'Reasoning level'}</label>
      {capability ? <>
        <select id="live-reasoning" name="reasoning" value={reasoning}
          onChange={event => setReasoningByModel(previous => ({ ...previous, [model]: event.target.value }))}
          disabled={pending || capability.options.length < 2} aria-describedby="reasoning-help"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 disabled:opacity-60 dark:border-white/20 dark:bg-gray-950 dark:text-white">
          {capability.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {capability.options.length < 2 && <input type="hidden" name="reasoning" value="default" />}
        <p id="reasoning-help" className="text-sm leading-6 text-gray-500 dark:text-gray-400">{capability.description}</p>
      </> : <p id="reasoning-help" className="text-sm text-gray-500 dark:text-gray-400">{model ? 'Reasoning controls need the updated backend. Deploy it and refresh this page.' : 'Choose a Live model to see its reasoning options.'}</p>}
      <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">Options update with the selected model. Your reasoning setting is saved separately for each model and applies to new voice messages, calls and reminders.</p>
    </div>
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
    <button disabled={pending || !settings.liveModels.length || !voices.length} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{pending ? 'Saving…' : 'Save AI settings'}</button>
    <p role="status" aria-live="polite" className={`text-sm ${state.error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{state.error || (state.ok ? 'Saved. New voice messages, calls and reminders will use these AI settings.' : '')}</p>
  </form>;
}
