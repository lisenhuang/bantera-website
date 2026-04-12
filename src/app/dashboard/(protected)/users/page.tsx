'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { AdminUserListItem, AdminPagedResult } from '@/lib/dashboard-api';

const LIMIT = 20;

const SORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'nativeLanguage', label: 'Native' },
  { key: 'learningLanguage', label: 'Learning' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'videoCount', label: 'Content' },
  { key: 'createdAt', label: 'Joined' },
  { key: 'lastLoginAt', label: 'Last Login' },
] as const;

function SortHeader({
  col,
  currentSort,
  currentDir,
}: {
  col: (typeof SORT_COLUMNS)[number];
  currentSort: string;
  currentDir: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = currentSort === col.key;
  const nextDir = isActive && currentDir === 'asc' ? 'desc' : 'asc';
  const params = new URLSearchParams(searchParams.toString());
  params.set('sort', col.key);
  params.set('dir', nextDir);
  params.delete('page');

  return (
    <th className="px-3 py-3 text-left">
      <Link
        href={`${pathname}?${params.toString()}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {col.label}
        {isActive && (
          <span className="text-indigo-500">
            {currentDir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </Link>
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
    suspended: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
    deleted: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10'}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
      role === 'admin'
        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10'
    }`}>
      {role}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function UsersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const sort = searchParams.get('sort') ?? 'createdAt';
  const dir = searchParams.get('dir') ?? 'desc';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const offset = (page - 1) * LIMIT;

  const [result, setResult] = useState<AdminPagedResult<AdminUserListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Debounced search input
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) {
        const p = new URLSearchParams(searchParams.toString());
        if (searchInput) p.set('search', searchInput);
        else p.delete('search');
        p.delete('page');
        router.push(`${pathname}?${p.toString()}`);
      }
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    setError(null);
    setResult(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('sort', sort);
    params.set('dir', dir);
    params.set('limit', String(LIMIT));
    params.set('offset', String(offset));

    startTransition(() => {
      fetch(`/api/dashboard/users?${params.toString()}`)
        .then((r) => {
          if (!r.ok) throw new Error('Failed to fetch');
          return r.json() as Promise<AdminPagedResult<AdminUserListItem>>;
        })
        .then(setResult)
        .catch(() => setError('Failed to load users.'));
    });
  }, [search, sort, dir, offset]);

  const totalPages = result ? Math.ceil(result.total / LIMIT) : 1;

  function paginationLink(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          {result && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {result.total.toLocaleString()} total
            </p>
          )}
        </div>
        {/* Search */}
        <div className="sm:ml-auto w-full sm:w-72">
          <input
            type="search"
            className="input-base w-full"
            placeholder="Search name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
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
                {SORT_COLUMNS.map((col) => (
                  <SortHeader key={col.key} col={col} currentSort={sort} currentDir={dir} />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {!result ? (
                <tr>
                  <td colSpan={SORT_COLUMNS.length} className="px-3 py-12 text-center text-gray-400 dark:text-gray-600 text-sm">
                    Loading…
                  </td>
                </tr>
              ) : result.items.length === 0 ? (
                <tr>
                  <td colSpan={SORT_COLUMNS.length} className="px-3 py-12 text-center text-gray-400 dark:text-gray-600 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                result.items.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/dashboard/users/${user.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {user.name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {user.email ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {user.nativeLanguage ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {user.learningLanguage ?? '—'}
                    </td>
                    <td className="px-3 py-3"><RoleBadge role={user.role} /></td>
                    <td className="px-3 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-right tabular-nums">
                      {user.videoCount}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(user.lastLoginAt)}
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={paginationLink(page - 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  ← Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={paginationLink(page + 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
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

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading…</div>}>
      <UsersContent />
    </Suspense>
  );
}
