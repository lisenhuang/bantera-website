'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { AdminMessageListItem, AdminPagedResult } from '@/lib/dashboard-api';
import { deleteMessageAction } from './actions';

const LIMIT = 20;

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function UserCell({ id, name, email }: { id: string; name: string | null; email: string | null }) {
  return (
    <div>
      <p className="text-gray-800 dark:text-gray-200 text-sm font-medium">{name ?? <span className="text-gray-400">—</span>}</p>
      {email && <p className="text-xs text-gray-400 dark:text-gray-500">{email}</p>}
    </div>
  );
}

function RecipientCell({ item }: { item: AdminMessageListItem }) {
  if (item.threadType === 'dm' && item.recipient) {
    return <UserCell id={item.recipient.id} name={item.recipient.name} email={item.recipient.email} />;
  }
  if (item.threadType === 'group') {
    return (
      <div>
        <p className="text-gray-800 dark:text-gray-200 text-sm font-medium italic">
          {item.groupLanguageDisplayName ?? 'Group'}
        </p>
        {item.groupLanguageKey && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{item.groupLanguageKey}</p>
        )}
      </div>
    );
  }
  return <span className="text-gray-400">—</span>;
}

function DeleteMessageButton({ messageId, onDeleted }: { messageId: string; onDeleted: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMessageAction(messageId);
      if (!result.error) onDeleted();
      else setShowConfirm(false);
    });
  }

  if (showConfirm) {
    return (
      <div className="flex gap-1">
        <button
          onClick={handleDelete}
          disabled={pending}
          className="px-2 py-1 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          {pending ? '…' : 'Confirm'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      title="Delete"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    </button>
  );
}

function MessagesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const threadType = searchParams.get('threadType') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const offset = (page - 1) * LIMIT;

  const [result, setResult] = useState<AdminPagedResult<AdminMessageListItem> | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function load() {
    setError(null);
    const params = new URLSearchParams();
    if (threadType) params.set('threadType', threadType);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('limit', String(LIMIT));
    params.set('offset', String(offset));

    startTransition(() => {
      fetch(`/api/dashboard/messages?${params.toString()}`)
        .then((r) => {
          if (!r.ok) throw new Error('Failed');
          return r.json() as Promise<AdminPagedResult<AdminMessageListItem>>;
        })
        .then((data) => { setResult(data); setDeletedIds(new Set()); })
        .catch(() => setError('Failed to load voice messages.'));
    });
  }

  useEffect(() => { load(); }, [threadType, from, to, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = result ? Math.ceil(result.total / LIMIT) : 1;

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function paginationLink(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    return `${pathname}?${params.toString()}`;
  }

  const visibleItems = result?.items.filter((m) => !deletedIds.has(m.id)) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Messages</h1>
          {result && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {result.total.toLocaleString()} total
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={threadType}
          onChange={(e) => updateFilter('threadType', e.target.value)}
          className="input-base"
        >
          <option value="">All types</option>
          <option value="dm">Direct messages</option>
          <option value="group">Group messages</option>
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => updateFilter('from', e.target.value)}
          className="input-base"
          title="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => updateFilter('to', e.target.value)}
          className="input-base"
          title="To date"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sender</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recipient / Group</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Language</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sent</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Audio</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {!result ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-gray-400 dark:text-gray-600 text-sm">Loading…</td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-gray-400 dark:text-gray-600 text-sm">No messages found</td>
                </tr>
              ) : (
                visibleItems.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-3 py-3">
                      <UserCell id={msg.sender.id} name={msg.sender.name} email={msg.sender.email} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {msg.threadType === 'dm'
                        ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">DM</span>
                        : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">Group</span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      <RecipientCell item={msg} />
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap tabular-nums">
                      {formatDuration(msg.durationMs)}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {msg.spokenLanguageCode}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      {formatDate(msg.createdAt)}
                    </td>
                    <td className="px-3 py-3 min-w-[220px]">
                      <audio
                        controls
                        preload="none"
                        src={`/api/dashboard/messages/${msg.id}/audio`}
                        className="h-8 w-full max-w-[220px]"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <DeleteMessageButton
                        messageId={msg.id}
                        onDeleted={() => setDeletedIds((prev) => new Set([...prev, msg.id]))}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {result && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={paginationLink(page - 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  ← Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={paginationLink(page + 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading…</div>}>
      <MessagesContent />
    </Suspense>
  );
}
