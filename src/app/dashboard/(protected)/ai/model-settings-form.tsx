'use client';

import { useActionState, useState } from 'react';
import type { AiSettings, TextModelOption } from '@/lib/dashboard-api';
import { saveModelSettingsAction, type ModelSettingsState } from './actions';

const selectClass = 'w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50';

function TextChoice({ name, label, current, effort, reasoningName, options, defaultModel, disabled }: {
  name: string; label: string; current?: string | null; effort?: string | null; reasoningName: string;
  options: TextModelOption[]; defaultModel?: string; disabled: boolean;
}) {
  const [value, setValue] = useState(current ?? '');
  const [reasoning, setReasoning] = useState(effort ?? '');
  const selected = options.find(m => m.id === (value || defaultModel));
  const missing = value && !options.some(m => m.id === value);
  return <div className="space-y-2">
    <label className="block text-sm font-medium" htmlFor={name}>{label}</label>
    <select id={name} name={name} value={value} disabled={disabled} className={selectClass} onChange={e => { setValue(e.target.value); setReasoning(''); }}>
      <option value="">{defaultModel ? `Default · ${defaultModel}` : 'No fallback'}</option>
      {missing && <option value={value}>{value} (currently unavailable)</option>}
      {['ChatGPT', 'Gemini'].map(provider => <optgroup key={provider} label={provider === 'ChatGPT' ? 'ChatGPT subscription' : 'Gemini'}>
        {options.filter(m => m.provider === provider).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </optgroup>)}
    </select>
    {selected?.provider === 'ChatGPT' ? <label className="block text-xs text-gray-600 dark:text-gray-300">
      <span className="mb-1 block">Reasoning for {selected.name}</span>
      <select name={reasoningName} value={reasoning} disabled={disabled} className={selectClass} onChange={e => setReasoning(e.target.value)}>
        <option value="">Model default{selected.defaultReasoning ? ` (${selected.defaultReasoning})` : ''}</option>
        {reasoning && !selected.reasoningLevels.includes(reasoning) && <option value={reasoning} disabled>{reasoning} (unsupported)</option>}
        {selected.reasoningLevels.map(level => <option key={level} value={level}>{level}</option>)}
      </select>
    </label> : <input type="hidden" name={reasoningName} value={missing ? reasoning : ''} />}
  </div>;
}

function AudioChoice({ name, label, current, options, defaultModel, disabled }: {
  name: string; label: string; current?: string | null; options: string[]; defaultModel?: string; disabled: boolean;
}) {
  return <label className="block space-y-2 text-sm font-medium"><span>{label}</span>
    <select name={name} defaultValue={current ?? ''} className={selectClass} disabled={disabled}>
      <option value="">{defaultModel ? `Default · ${defaultModel}` : 'No fallback'}</option>
      {current && !options.includes(current) && <option value={current}>{current} (currently unavailable)</option>}
      {options.map(m => <option key={m} value={m}>{m}</option>)}
    </select></label>;
}

export function ModelSettingsForm({ settings }: { settings: AiSettings }) {
  const [state, action, pending] = useActionState<ModelSettingsState, FormData>(saveModelSettingsAction, {});
  const options = settings.textModelOptions ?? settings.availableTextModels.map(id => ({ id, name: id, provider: 'Gemini', reasoningLevels: [] }));
  const allowedSearch = (id?: string | null) => id === 'gemini-2.5-flash' || !!id?.startsWith('chatgpt/');
  const searchOptions = (settings.searchModelOptions ?? options).filter(m => allowedSearch(m.id));
  const searchModel = allowedSearch(settings.searchModel) ? settings.searchModel : 'gemini-2.5-flash';
  const fallbackSearchModel = allowedSearch(settings.fallbackSearchModel) ? settings.fallbackSearchModel : null;
  return <form action={action} className="space-y-6">
    <fieldset disabled={pending} className="space-y-4"><legend className="mb-2 font-semibold">Text generation</legend>
      <p className="text-xs text-gray-500 dark:text-gray-400">Used for standard dialogue, transcript correction, word alignment and conversation summaries. The fallback can use a different provider.</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <TextChoice name="textModel" label="Primary text model" current={settings.overrides.textModel?.value} effort={settings.textReasoning} reasoningName="textReasoning" options={options} defaultModel={settings.defaults.textModel} disabled={pending} />
        <TextChoice name="fallbackTextModel" label="Fallback text model" current={settings.fallbackTextModel} effort={settings.fallbackTextReasoning} reasoningName="fallbackTextReasoning" options={options} disabled={pending} />
      </div>
    </fieldset>
    <fieldset disabled={pending} className="space-y-4 border-t border-gray-200 pt-5 dark:border-white/10"><legend className="px-1 font-semibold">Web search</legend>
      <p className="text-xs text-gray-500 dark:text-gray-400">Used only for backend lesson generation and the test below. Gemini search uses Gemini 2.5 Flash with AIzaSy keys only. GPT search options remain available. AI chat searches run on the device and do not use these settings.</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <TextChoice name="searchModel" label="Primary search model" current={searchModel} effort={settings.searchReasoning} reasoningName="searchReasoning" options={searchOptions} defaultModel="gemini-2.5-flash" disabled={pending} />
        <TextChoice name="fallbackSearchModel" label="Fallback search model" current={fallbackSearchModel} effort={settings.fallbackSearchReasoning} reasoningName="fallbackSearchReasoning" options={searchOptions} disabled={pending} />
      </div>
    </fieldset>
    <fieldset disabled={pending} className="space-y-3 border-t border-gray-200 pt-5 dark:border-white/10"><legend className="px-1 font-semibold">GPT response timeout</legend>
      <label htmlFor="gptTimeoutSeconds" className="block text-sm font-medium">Maximum wait per GPT attempt (seconds)</label>
      <input id="gptTimeoutSeconds" name="gptTimeoutSeconds" type="number" min={30} max={300} step={1} required defaultValue={settings.gptTimeoutSeconds ?? 180} className={`${selectClass} max-w-48`} aria-describedby="gpt-timeout-help" />
      <p id="gpt-timeout-help" className="text-xs text-gray-500 dark:text-gray-400">Default: 180 seconds. Choose 30–300 seconds for GPT text generation, web search and dashboard tests. If a request times out, the configured fallback can take over. Higher limits give reasoning models more time but delay fallback. Background conversation summaries and the overall lesson job retain their shorter safety limits. App AI chat search runs on the device.</p>
    </fieldset>
    <fieldset disabled={pending} className="space-y-4 border-t border-gray-200 pt-5 dark:border-white/10"><legend className="px-1 font-semibold">Speech generation</legend>
      <div className="grid gap-5 lg:grid-cols-2">
        <AudioChoice name="audioModel" label="Primary audio (TTS) model" current={settings.overrides.audioModel?.value} defaultModel={settings.defaults.audioModel} options={settings.availableAudioModels} disabled={pending} />
        <AudioChoice name="fallbackAudioModel" label="Fallback audio (TTS) model" current={settings.fallbackAudioModel} options={settings.availableAudioModels} disabled={pending} />
      </div>
    </fieldset>
    {settings.gptModelListAvailable === false && <p className="text-sm text-amber-700 dark:text-amber-300">ChatGPT models could not be loaded. Connect your account above or refresh this page. Existing saved choices are preserved.</p>}
    <p className="text-xs text-gray-500 dark:text-gray-400">Reasoning choices come from each GPT model. Higher reasoning can take longer. Content-policy rejections remain final. Live voice models are configured separately.</p>
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending || !settings.modelListAvailable} className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{pending ? 'Saving…' : 'Save models'}</button>
      {state.ok && !pending && <span role="status" className="text-sm text-green-700 dark:text-green-400">Saved. New requests use these choices within 30 seconds.</span>}
      {state.error && <span role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </div>
  </form>;
}
