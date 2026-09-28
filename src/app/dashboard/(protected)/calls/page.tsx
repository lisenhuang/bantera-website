import { redirect } from 'next/navigation';
import { getAccessToken, getCallSettings, type CallSettings } from '@/lib/dashboard-api';
import { CallSettingsForm } from './call-settings-form';

export const dynamic = 'force-dynamic';

export default async function CallsPage() {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  let settings: CallSettings | null = null;
  try {
    settings = await getCallSettings(token);
  } catch {
    // Keep the control unavailable if the backend has not been deployed or denies access.
  }
  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calls</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Choose how voice and video calls connect.</p>
      </header>
      <section aria-label="Call connection settings" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900 sm:p-8">
        {settings ? <CallSettingsForm settings={settings} /> : (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            Call settings could not be loaded. Confirm the updated backend is deployed and you have admin access, then refresh.
          </p>
        )}
      </section>
    </div>
  );
}
