'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { BANTERA_LANGUAGE_OPTIONS } from '@/lib/bantera-api';
import type { AdminVideoListItem, AdminPagedResult } from '@/lib/dashboard-api';
import { deleteVideoAction } from './actions';

const LIMIT = 20;

const SORT_COLUMNS = [
  { key: 'filename', label: 'File name' },
  { key: 'language', label: 'Language' },
  { key: 'createdAt', label: 'Creator' },
  { key: 'duration', label: 'Duration' },
  { key: 'size', label: 'Size' },
  { key: 'createdAt', label: 'Date' },
] as const;

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function DeleteVideoButton({ videoId, onDeleted }: { videoId: string; onDeleted: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteVideoAction(videoId);
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

function SortHeader({ colKey, label, currentSort, currentDir }: {
  colKey: string; label: string; currentSort: string; currentDir: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = currentSort === colKey;
  const nextDir = isActive && currentDir === 'asc' ? 'desc' : 'asc';
  const params = new URLSearchParams(searchParams.toString());
  params.set('sort', colKey);
  params.set('dir', nextDir);
  params.delete('page');

  return (
    <th className="px-3 py-3 text-left">
      <Link
        href={`${pathname}?${params.toString()}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {label}
        {isActive && <span className="text-indigo-500">{currentDir === 'asc' ? '↑' : '↓'}</span>}
      </Link>
    </th>
  );
}

export default function VideosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const languageCode = searchParams.get('languageCode') ?? '';
  const isPublicStr = searchParams.get('isPublic') ?? '';
  const isAiStr = searchParams.get('isAiGenerated') ?? '';
  const sort = searchParams.get('sort') ?? 'createdAt';
  const dir = searchParams.get('dir') ?? 'desc';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const offset = (page - 1) * LIMIT;

  const [result, setResult] = useState<AdminPagedResult<AdminVideoListItem> | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function load() {
    setError(null);
    const params = new URLSearchParams();
    if (languageCode) params.set('languageCode', languageCode);
    if (isPublicStr) params.set('isPublic', isPublicStr);
    if (isAiStr) params.set('isAiGenerated', isAiStr);
    params.set('sort', sort);
    params.set('dir', dir);
    params.set('limit', String(LIMIT));
    params.set('offset', String(offset));

    startTransition(() => {
      fetch(`/api/dashboard/videos?${params.toString()}`)
        .then((r) => {
          if (!r.ok) throw new Error('Failed');
          return r.json() as Promise<AdminPagedResult<AdminVideoListItem>>;
        })
        .then((data) => { setResult(data); setDeletedIds(new Set()); })
        .catch(() => setError('Failed to load videos.'));
    });
  }

  useEffect(() => { load(); }, [languageCode, isPublicStr, isAiStr, sort, dir, offset]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const visibleItems = result?.items.filter((v) => !deletedIds.has(v.id)) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audio &amp; Videos</h1>
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
          value={languageCode}
          onChange={(e) => updateFilter('languageCode', e.target.value)}
          className="input-base"
        >
          <option value="">All languages</option>
          {BANTERA_LANGUAGE_OPTIONS.map((l) => (
            <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
          ))}
        </select>

        <select
          value={isPublicStr}
          onChange={(e) => updateFilter('isPublic', e.target.value)}
          className="input-base"
        >
          <option value="">Public &amp; Private</option>
          <option value="true">Public only</option>
          <option value="false">Private only</option>
        </select>

        <select
          value={isAiStr}
          onChange={(e) => updateFilter('isAiGenerated', e.target.value)}
          className="input-base"
        >
          <option value="">All content</option>
          <option value="true">AI generated</option>
          <option value="false">User uploaded</option>
        </select>
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
                <SortHeader colKey="filename" label="File name" currentSort={sort} currentDir={dir} />
                <SortHeader colKey="language" label="Language" currentSort={sort} currentDir={dir} />
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Creator</th>
                <SortHeader colKey="duration" label="Duration" currentSort={sort} currentDir={dir} />
                <SortHeader colKey="size" label="Size" currentSort={sort} currentDir={dir} />
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Public</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI</th>
                <SortHeader colKey="createdAt" label="Date" currentSort={sort} currentDir={dir} />
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {!result ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-gray-400 dark:text-gray-600 text-sm">Loading…</td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-gray-400 dark:text-gray-600 text-sm">No content found</td>
                </tr>
              ) : (
                visibleItems.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-3 py-3 text-gray-800 dark:text-gray-200 max-w-[180px]">
                      <span className="block truncate" title={video.originalFileName}>{video.originalFileName}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {BANTERA_LANGUAGE_OPTIONS.find(l => l.code === video.transcriptLanguageCode)?.flag ?? ''}{' '}
                      {video.transcriptLanguageCode}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{video.creatorName ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap tabular-nums">
                      {formatDuration(video.durationMs)}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap tabular-nums">
                      {formatSize(video.fileSizeBytes)}
                    </td>
                    <td className="px-3 py-3">
                      {video.isPublic
                        ? <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">Yes</span>
                        : <span className="text-gray-400 text-xs">No</span>}
                    </td>
                    <td className="px-3 py-3">
                      {video.isAiGenerated
                        ? <span className="text-violet-600 dark:text-violet-400 text-xs font-medium">AI</span>
                        : <span className="text-gray-400 text-xs">No</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(video.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <DeleteVideoButton
                        videoId={video.id}
                        onDeleted={() => setDeletedIds((prev) => new Set([...prev, video.id]))}
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
