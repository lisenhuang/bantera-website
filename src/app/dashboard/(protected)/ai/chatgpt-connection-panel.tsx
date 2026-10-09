'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatGptStatus } from '@/lib/chatgpt-connection';
import { connectChatGpt, pollChatGpt, cancelChatGpt, disconnectChatGpt, loadChatGptModels, testChatGpt,
  type DeviceLogin, type SubscriptionModel, type SubscriptionTest } from './chatgpt-actions';

const button = 'rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40';
const field = 'w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 dark:border-white/15 dark:bg-gray-950 dark:text-white';

export function ChatGptConnectionPanel({ status }: { status: ChatGptStatus | null; callback?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [device, setDevice] = useState<DeviceLogin>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [models, setModels] = useState<SubscriptionModel[]>([]);
  const [model, setModel] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [prompt, setPrompt] = useState('Give me one short English speaking exercise.');
  const [search, setSearch] = useState(false);
  const [result, setResult] = useState<SubscriptionTest & { requestedSearch: boolean }>();
  const selected = models.find(m => m.id === model);

  useEffect(() => {
    if (!device) return;
    let cancelled = false; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (Date.now() >= Date.parse(device.expiresAt)) { setDevice(undefined); setError('Sign-in expired. Start again.'); return; }
      try {
        const state = await pollChatGpt(device.attempt);
        if (cancelled) return;
        if (state.connected) { setDevice(undefined); setNotice(state.message ?? 'Connected.'); router.refresh(); return; }
        if (state.error) { setDevice(undefined); setError(state.error); return; }
        timer = setTimeout(poll, device.intervalSeconds * 1000);
      } catch { if (!cancelled) { setDevice(undefined); setError('Connection check failed. Please start again.'); } }
    };
    timer = setTimeout(poll, device.intervalSeconds * 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [device, router]);

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-medium text-gray-900 dark:text-white">ChatGPT subscription</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Connect your account with a one-time code. Bantera stores access securely on the backend.</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${status?.connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
        {!status ? 'Status unavailable' : status.connected ? 'Connected' : status.configured ? 'Not connected' : 'Storage setup required'}</span>
    </div>
    {status?.connected && <p className="text-sm text-gray-700 dark:text-gray-200">{status.email || 'ChatGPT account connected'}. Requests use this account’s subscription allowance. Connecting does not change your existing Gemini models.</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button className={button} disabled={pending || !!device || !status?.configured} onClick={() => startTransition(async () => {
        setError(''); setNotice('');
        try { const state = await connectChatGpt(); setDevice(state.device); setError(state.error ?? ''); }
        catch { setError('Could not start sign-in. Please retry.'); }
      })}>{pending ? 'Please wait…' : status?.connected ? 'Reconnect with ChatGPT' : 'Continue with ChatGPT'}</button>
      {status?.connected && <button className="text-sm text-red-700 underline dark:text-red-300" disabled={pending || !!device} onClick={() => startTransition(async () => {
        try { const state = await disconnectChatGpt(); setError(state.error ?? ''); setNotice(state.message ?? ''); setModels([]); setModel(''); setResult(undefined); router.refresh(); }
        catch { setError('Could not disconnect. Please retry.'); }
      })}>Disconnect</button>}
      <a href="https://chatgpt.com/codex/settings" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 underline dark:text-indigo-300">ChatGPT settings</a>
    </div>
    {device && <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/30 dark:bg-indigo-950/30">
      <p className="text-sm font-medium">Enter this code on OpenAI’s sign-in page</p>
      <div className="flex items-center gap-4"><code className="select-all rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-widest text-gray-900">{device.userCode}</code>
        <button className="text-sm underline" onClick={async () => { try { await navigator.clipboard.writeText(device.userCode); setNotice('Code copied.'); } catch { setNotice('Select the code to copy it.'); } }}>Copy code</button></div>
      <a href={device.verificationUri} target="_blank" rel="noopener noreferrer" className={`${button} inline-block`}>Open ChatGPT sign-in ↗</a>
      <p className="text-sm text-gray-600 dark:text-gray-300">Waiting for approval. This page connects automatically after you sign in. The code expires in 10 minutes.</p>
      <button className="text-sm underline" disabled={pending} onClick={() => startTransition(async () => {
        const attempt = device.attempt; setDevice(undefined);
        try { const state = await cancelChatGpt(attempt); setError(state.error ?? ''); } catch { setError('Could not cancel sign-in. It will expire automatically.'); }
      })}>Cancel sign-in</button>
    </div>}
    {status && !status.configured && <p className="text-sm text-amber-700 dark:text-amber-300">The backend’s encrypted credential storage needs configuration.</p>}
    {!status && <p className="text-sm text-amber-700">Connection status could not be loaded. Reload this page.</p>}
    <div role="status" aria-live="polite">{error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}{notice && <p className="text-sm text-gray-600 dark:text-gray-300">{notice}</p>}</div>
    {status?.connected && <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-white/15">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">Test subscription models</h3>
        <button disabled={pending || !!device} className="text-sm text-indigo-600 underline dark:text-indigo-300" onClick={() => startTransition(async () => {
          setError('');
          try { const data = await loadChatGptModels(); setError(data.error ?? ''); setModels(data.models ?? []); setModel(data.models?.[0]?.id ?? ''); setReasoning(''); setResult(undefined); }
          catch { setError('Could not load models. Please retry.'); }
        })}>{pending ? 'Please wait…' : models.length ? 'Refresh model list' : 'Load available models'}</button></div>
      {!!models.length && <form className="space-y-3" onSubmit={event => { event.preventDefault(); startTransition(async () => {
        setError(''); setResult(undefined);
        try { const data = await testChatGpt(model, reasoning, prompt, search); setError(data.error ?? ''); setResult(data.result ? { ...data.result, requestedSearch: search } : undefined); }
        catch { setError('The test did not finish. Please retry.'); }
      }); }}>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Model</span><select className={field} value={model} disabled={pending} onChange={e => { setModel(e.target.value); setReasoning(''); setResult(undefined); }}>
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span>Reasoning</span><select className={field} value={reasoning} disabled={pending || !selected?.reasoningLevels.length} onChange={e => setReasoning(e.target.value)}>
            <option value="">Model default{selected?.defaultReasoning ? ` (${selected.defaultReasoning})` : ''}</option>
            {selected?.reasoningLevels.map(level => <option key={level} value={level}>{level}</option>)}</select></label></div>
        <label className="block space-y-1 text-sm"><span>Test prompt</span><textarea className={field} value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={2000} required rows={3} disabled={pending} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={search} onChange={e => setSearch(e.target.checked)} disabled={pending} />Test built-in web search</label>
        <p className="text-xs text-gray-500 dark:text-gray-400">Models and reasoning choices are fetched from your account. Tests use your subscription allowance and do not change production model settings.</p>
        <button className={button} disabled={pending || !model || !prompt.trim()}>{pending ? 'Waiting for response…' : 'Test response'}</button>
      </form>}
      {result && <div role="status" className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
        <p className="text-sm font-semibold">{result.requestedSearch ? result.searchVerified ? 'Web search verified' : 'Response received; web search not verified' : 'Response received'}</p>
        <p className="whitespace-pre-wrap break-words text-sm">{result.answer}</p>
        {!!result.sources.length && <ul className="space-y-1 text-sm">{result.sources.map(s => <li key={s.url}><a className="text-indigo-600 underline dark:text-indigo-300" href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a></li>)}</ul>}
      </div>}
    </div>}
  </div>;
}
