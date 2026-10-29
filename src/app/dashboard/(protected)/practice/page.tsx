import { redirect } from 'next/navigation';
import { getAccessToken, getPracticeSettings } from '@/lib/dashboard-api';
import { PracticeSettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';
export default async function PracticeSettingsPage() {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const settings = await getPracticeSettings(token).catch(() => null);
  return <div className="max-w-3xl space-y-6">
    <header><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Practice</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage language availability and when older exercises can return.</p></header>
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900 sm:p-8">
      {settings ? <PracticeSettingsForm settings={settings} /> : <p role="alert" className="text-red-600 dark:text-red-400">Practice settings could not be loaded. Please refresh.</p>}
    </section>
  </div>;
}
