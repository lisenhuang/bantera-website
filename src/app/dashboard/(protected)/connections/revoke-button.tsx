'use client';

import { useState, useTransition } from 'react';
import { revokeGrantAction } from './actions';

export default function RevokeButton({
  familyId,
  clientName,
}: {
  familyId: string;
  clientName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 text-xs font-medium px-3 py-2 rounded-xl border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:border-red-300 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:text-red-400 transition-colors"
      >
        Revoke
      </button>
    );
  }

  return (
    <div className="shrink-0 text-right">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Disconnect {clientName}?</p>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-400 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await revokeGrantAction(familyId);
              if (result?.error) setError(result.error);
            })
          }
          className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-40"
        >
          {pending ? 'Revoking…' : 'Revoke'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
