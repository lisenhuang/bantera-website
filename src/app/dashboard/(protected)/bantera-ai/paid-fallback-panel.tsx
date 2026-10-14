'use client';

import { useActionState, useState } from 'react';
import type { PaidFallbackStatus, PaidFallbackUser } from '@/lib/dashboard-api';
import { findPaidFallbackUsers, savePaidFallbackAction, type PaidFallbackState } from '../ai/actions';

export function PaidFallbackPanel({ initial }: { initial: PaidFallbackStatus }) {
  const [apiKey, setApiKey] = useState('');
  const [state, save, saving] = useActionState<PaidFallbackState, FormData>(async (previous, form) => {
    const result = await savePaidFallbackAction(previous, form);
    if (result.settings) setApiKey('');
    return result;
  }, {});
  const [search, find, searching] = useActionState<{ users?: PaidFallbackUser[]; error?: string }, FormData>(findPaidFallbackUsers, {});
  const [selected, setSelected] = useState(initial.users);
  const current = state.settings ?? initial;
  const input = 'w-full rounded-xl border border-gray-300 dark:border-white/20 bg-transparent px-3 py-2 text-sm';
  return <div className="space-y-5">
    <p className="text-sm text-gray-600 dark:text-gray-300">This key applies across Gemini features: lesson text and audio generation, transcription, conversation summaries and voice chats. Only selected users can use it. They can also choose their mode in app Settings. Other providers keep their own credentials; app web and image searches run on the device.</p>
    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 text-sm">
      <strong>{current.configured ? `Paid key saved: ${current.hint}` : 'No paid fallback key saved'}</strong>
      <p className="mt-1 text-gray-500">Stored encrypted on the backend. Google billing is determined by the key’s project; Bantera cannot verify whether a key is paid. Use a separate paid project from your regular keys.</p>
    </div>
    <form action={find} className="space-y-2">
      <label htmlFor="paid-user-search" className="block text-sm font-medium">Find users to allow</label>
      <div className="flex gap-2">
        <input id="paid-user-search" name="query" type="search" minLength={2} maxLength={100} required placeholder="Search by name or email" className={input} />
        <button disabled={searching || saving} className="rounded-xl border border-gray-300 dark:border-white/20 px-4 text-sm disabled:opacity-50">{searching ? 'Searching…' : 'Search'}</button>
      </div>
      {search.error && <p role="alert" className="text-sm text-red-600">{search.error}</p>}
    </form>
    {search.users && <ul className="divide-y divide-gray-200 dark:divide-white/10">
      {search.users.length === 0 && <li className="py-2 text-sm text-gray-500">No active users found.</li>}
      {search.users.map(user => <li key={user.id} className="flex items-center justify-between gap-3 py-2 text-sm">
        <div><p>{user.name || user.email || user.id}</p><p className="text-xs text-gray-500">{user.email}</p></div>
        <button type="button" disabled={saving || selected.some(s => s.id === user.id)} onClick={() => setSelected([...selected, user])} className="rounded-lg border px-3 py-1 disabled:opacity-50">{selected.some(s => s.id === user.id) ? 'Selected' : 'Allow'}</button>
      </li>)}
    </ul>}
    <form action={save} className="space-y-4">
      <fieldset disabled={saving || !current.storageReady} className="space-y-4 disabled:opacity-60">
        <div><label htmlFor="paid-key" className="block text-sm font-medium">{current.configured ? 'Replace paid API key (optional)' : 'Paid API key'}</label>
          <input id="paid-key" name="apiKey" type="password" autoComplete="new-password" maxLength={4096} value={apiKey} onChange={event => setApiKey(event.target.value)} className={`${input} mt-2`} placeholder={current.configured ? 'Leave blank to keep the saved key' : 'Paste your paid project’s API key'} />
          <p className="mt-1 text-xs text-gray-500">Accepts AIza and AQ. keys. After saving, the status above shows a masked key.</p>
        </div>
        <div><p className="text-sm font-medium">Allowed users ({selected.length})</p>
          {selected.length === 0 && <p className="mt-1 text-sm text-gray-500">Nobody can use the paid key. Add users above, then save.</p>}
          <ul className="mt-2 space-y-2">{selected.map(user => <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-white/5 p-3 text-sm">
            <input type="hidden" name="allowedUserIds" value={user.id} /><span>{user.name || user.email || user.id}{user.name && user.email ? ` · ${user.email}` : ''}</span>
            {user.mode === 'regular_only' && <input type="hidden" name="regularOnlyUserIds" value={user.id} />}
            {user.mode === 'paid_only' && <input type="hidden" name="paidOnlyUserIds" value={user.id} />}
            <select aria-label={`Key mode for ${user.name || user.email || user.id}`} value={user.mode} onChange={event => setSelected(selected.map(s => s.id === user.id ? { ...s, mode: event.target.value as PaidFallbackUser['mode'] } : s))} className="max-w-full rounded-lg border border-gray-300 bg-white dark:bg-gray-900 p-2">
              <option value="regular_only">Regular keys only</option><option value="fallback">Regular keys, then paid fallback</option><option value="paid_only">Paid key only</option>
            </select>
            <button type="button" onClick={() => setSelected(selected.filter(s => s.id !== user.id))} className="text-red-600">Remove</button>
          </li>)}</ul>
        </div>
        {current.configured && <label className="flex gap-2 text-sm"><input type="checkbox" name="removeKey" />Remove the saved paid key</label>}
        <p className="text-xs text-gray-500">Changes apply to subsequent attempts. Removing access does not terminate a call already connected. Invalid requests and safety rejections are not retried with a paid key.</p>
        <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save paid fallback settings'}</button>
      </fieldset>
      {!current.storageReady && <p role="alert" className="text-sm text-red-600">Secure storage must be configured on the server before saving a key.</p>}
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.settings && <p role="status" className="text-sm text-green-700">Saved. {state.settings.users.length} users allowed.</p>}
    </form>
  </div>;
}
