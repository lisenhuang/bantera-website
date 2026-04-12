'use client';

import { useEffect, useState, useTransition, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AdminUserDetail } from '@/lib/dashboard-api';
import { patchUserAction, deleteUserAction } from './actions';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0">
      <span className="label-xs w-36 shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200 break-all">{value ?? '—'}</span>
    </div>
  );
}

function UserEditForm({ user }: { user: AdminUserDetail }) {
  const boundAction = patchUserAction.bind(null, user.id);
  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const [clearLimit, setClearLimit] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clearAiLimit" value={String(clearLimit)} />

      <div>
        <label htmlFor="role" className="label-xs block mb-1.5">Role</label>
        <select id="role" name="role" defaultValue={user.role} className="input-base w-full">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </div>

      <div>
        <label htmlFor="status" className="label-xs block mb-1.5">Status</label>
        <select id="status" name="status" defaultValue={user.status} className="input-base w-full">
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>
      </div>

      <div>
        <label htmlFor="aiLimit" className="label-xs block mb-1.5">AI Audio Daily Limit</label>
        <input
          id="aiLimit"
          name="aiAudioDailyLimit"
          type="number"
          min="0"
          disabled={clearLimit}
          defaultValue={user.aiAudioDailyLimit ?? ''}
          placeholder="Unlimited"
          className="input-base w-full disabled:opacity-50"
        />
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={clearLimit}
            onChange={(e) => setClearLimit(e.target.checked)}
            className="rounded border-gray-300 dark:border-white/20 text-indigo-600"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">Remove limit (set to unlimited)</span>
        </label>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved successfully.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function DeleteUserZone({ userId }: { userId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteUserAction(userId);
    });
  }

  return (
    <div className="space-y-3">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Delete user
        </button>
      ) : (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-4 space-y-3">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            This will permanently delete the user and all their data. This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={pending}
              className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {pending ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => setUserId(id));
  }, [params]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/dashboard/users/${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json() as Promise<AdminUserDetail>;
      })
      .then(setUser)
      .catch(() => setError('User not found.'));
  }, [userId]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/users" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Back to users</Link>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/users" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Back to users</Link>
        <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/users" className="text-indigo-600 dark:text-indigo-400 hover:underline">Users</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{user.name ?? user.id}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name ?? 'Unnamed user'}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile info */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-5">
            <p className="label-xs mb-3">Profile</p>
            <InfoRow label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
            <InfoRow label="Name" value={user.name} />
            <InfoRow label="Role" value={user.role} />
            <InfoRow label="Status" value={user.status} />
            <InfoRow label="Native language" value={user.nativeLanguage} />
            <InfoRow label="Learning language" value={user.learningLanguage} />
            <InfoRow label="Translation lang" value={user.translationLanguage} />
            <InfoRow label="AI daily limit" value={user.aiAudioDailyLimit?.toString() ?? 'Unlimited'} />
            <InfoRow label="Joined" value={formatDate(user.createdAt)} />
            <InfoRow label="Last login" value={formatDate(user.lastLoginAt)} />
          </div>

          {/* Identity providers */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-5">
            <p className="label-xs mb-3">Auth providers</p>
            {user.identities.length === 0 ? (
              <p className="text-sm text-gray-400">No identities</p>
            ) : (
              <div className="space-y-2">
                {user.identities.map((id, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                    <span className="label-xs w-20 shrink-0">{id.provider}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 break-all">{id.providerEmail ?? '—'}</span>
                    <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">{formatDate(id.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-5">
            <p className="label-xs mb-3">Stats</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{user.stats.videoCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Audio / Videos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Edit form */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-5">
            <p className="label-xs mb-4">Edit user</p>
            <UserEditForm user={user} />
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-gray-900 shadow-sm p-5">
            <p className="label-xs text-red-500 mb-4">Danger zone</p>
            <DeleteUserZone userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
