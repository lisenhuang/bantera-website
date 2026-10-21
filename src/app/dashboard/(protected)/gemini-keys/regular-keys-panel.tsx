'use client';

import { useActionState, useState } from 'react';
import type { RegularKeyItem, RegularKeyStatus } from '@/lib/dashboard-api';
import { saveRegularKeyAction } from './actions';

const input = 'w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-white/20';
const button = 'rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900';

function KeyRow({ item, storageReady }: { item: RegularKeyItem; storageReady: boolean }) {
  const [state, save, pending] = useActionState(saveRegularKeyAction, {});
  const [removeState, remove, removing] = useActionState(saveRegularKeyAction, {});
  const [confirmRemove, setConfirmRemove] = useState(false);
  return <li className={card}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div><code className="text-sm font-semibold">{item.hint}</code><span className="ml-3 text-xs text-gray-500">{item.source === 'environment' ? 'Environment' : 'Dashboard'}</span></div>
      <span className={`rounded-full px-3 py-1 text-xs ${item.enabled ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'bg-gray-100 text-gray-500 dark:bg-white/5'}`}>{item.enabled ? 'Enabled' : 'Disabled'}</span>
    </div>
    <form action={save}>
      <input type="hidden" name="operation" value="update" /><input type="hidden" name="id" value={item.id} />
      <fieldset disabled={pending || removing || !storageReady} className="space-y-3 disabled:opacity-60">
        <label className="block text-sm font-medium">Remarks<textarea name="remarks" defaultValue={item.remarks} maxLength={1000} rows={2} className={`${input} mt-2`} placeholder="Project name, owner, or other notes" /></label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={item.enabled} className="size-4 accent-violet-600" />Include in the regular pool</label>
          <button className={button}>{pending ? 'Saving…' : 'Save changes'}</button>
        </div>
      </fieldset>
      {state.error && <p role="alert" className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p role="status" className="mt-3 text-sm text-green-700 dark:text-green-400">Saved.</p>}
    </form>
    {item.source === 'dashboard' && <div className="mt-3 border-t border-gray-100 pt-3 dark:border-white/10">
      {confirmRemove ? <form action={remove} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="operation" value="remove" /><input type="hidden" name="id" value={item.id} />
        <span className="text-sm">Remove this saved key?</span>
        <button disabled={pending || removing || !storageReady} className="text-sm font-medium text-red-600 disabled:opacity-50">{removing ? 'Removing…' : 'Confirm removal'}</button>
        <button type="button" disabled={removing} onClick={() => setConfirmRemove(false)} className="text-sm text-gray-500">Cancel</button>
      </form> : <button type="button" disabled={pending || !storageReady} onClick={() => setConfirmRemove(true)} className="text-sm text-red-600 disabled:opacity-50">Remove key</button>}
      {removeState.error && <p role="alert" className="mt-2 text-sm text-red-600">{removeState.error}</p>}
    </div>}
  </li>;
}

export function RegularKeysPanel({ status }: { status: RegularKeyStatus }) {
  const [apiKey, setApiKey] = useState('');
  const [remarks, setRemarks] = useState('');
  const [state, add, pending] = useActionState(async (previous: { ok?: boolean; error?: string }, form: FormData) => {
    const result = await saveRegularKeyAction(previous, form);
    if (result.ok) { setApiKey(''); setRemarks(''); }
    return result;
  }, {});
  return <>
    <section className={card} aria-labelledby="add-gemini-key">
      <h2 id="add-gemini-key" className="text-lg font-semibold">Add a free Gemini key</h2>
      <p className="mt-2 text-sm text-gray-500">Keys are stored encrypted and only a masked hint is displayed. The key’s Google project determines billing and quota; adding another key from the same project does not increase its quota.</p>
      <form action={add} className="mt-5">
        <input type="hidden" name="operation" value="add" />
        <fieldset disabled={pending || !status.storageReady} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-medium">API key<input name="apiKey" type="password" autoComplete="new-password" spellCheck={false} required minLength={20} maxLength={4096} value={apiKey} onChange={e => setApiKey(e.target.value)} className={`${input} mt-2`} placeholder="Paste your Gemini API key" /></label>
          <label className="block text-sm font-medium">Remarks (optional)<textarea name="remarks" maxLength={1000} rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} className={`${input} mt-2`} placeholder="For example: project name or owner" /></label>
          <button className={button}>{pending ? 'Adding…' : 'Add to regular pool'}</button>
        </fieldset>
        {!status.storageReady && <p role="alert" className="mt-3 text-sm text-red-600">Secure storage must be configured on the server before editing keys.</p>}
        {state.error && <p role="alert" className="mt-3 text-sm text-red-600">{state.error}</p>}
        {state.ok && <p role="status" className="mt-3 text-sm text-green-700 dark:text-green-400">Key added to the regular pool.</p>}
      </form>
    </section>
    <section aria-labelledby="regular-key-pool">
      <h2 id="regular-key-pool" className="text-lg font-semibold">Regular pool <span className="text-sm font-normal text-gray-500">{status.items.filter(k => k.enabled).length} enabled · {status.items.length} total</span></h2>
      <p className="mb-4 mt-2 text-sm text-gray-500">Changes apply to new requests. Requests already underway may finish using their selected keys. Enabled keys still follow quota cooldown and invalid-key checks.</p>
      {status.items.length === 0 ? <p className={card}>No regular keys configured yet.</p> : <ul className="space-y-3">{status.items.map(item => <KeyRow key={item.id} item={item} storageReady={status.storageReady} />)}</ul>}
    </section>
  </>;
}
