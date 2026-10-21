import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccessToken, getRegularKeys } from '@/lib/dashboard-api';
import { RegularKeysPanel } from './regular-keys-panel';

export default async function GeminiKeysPage() {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const status = await getRegularKeys(token).catch(() => null);
  return <div className="mx-auto max-w-5xl space-y-6">
    <header>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gemini keys</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Add free Gemini keys to the regular pool and keep a remark for each one. Saved keys rotate together with the server’s environment keys.</p>
    </header>
    {status ? <RegularKeysPanel status={status} /> : <p role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-600">Could not load the key pool. Refresh to try again.</p>}
    <p className="text-sm text-gray-500">See <Link href="/dashboard/ai" className="text-violet-600 underline">AI Audio</Link> for key health and quota cooldowns. Manage the paid fallback separately in <Link href="/dashboard/bantera-ai" className="text-violet-600 underline">Bantera AI</Link>.</p>
  </div>;
}
