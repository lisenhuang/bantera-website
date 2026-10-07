import { redirect } from 'next/navigation';
import { getAccessToken, getBanteraAiSettings } from '@/lib/dashboard-api';
import { SettingsForm } from './settings-form';
export const dynamic = 'force-dynamic';
export default async function BanteraAiPage() {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  let settings = null;
  try { settings = await getBanteraAiSettings(token); } catch { /* Fail closed when backend is unavailable. */ }
  return <div className="max-w-3xl space-y-6">
    <header><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bantera AI</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">The always-online language practice partner, shown first under Online.</p></header>
    <section aria-label="Bantera AI model" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900 sm:p-8">
      {settings ? <SettingsForm settings={settings} /> : <p role="alert" className="text-sm text-red-600 dark:text-red-400">Live models could not be loaded. Confirm the updated backend and Gemini keys are configured, then refresh.</p>}
    </section>
    <section className="rounded-2xl bg-gray-50 p-6 text-sm leading-6 text-gray-600 dark:bg-white/5 dark:text-gray-300">
      <h2 className="font-semibold text-gray-900 dark:text-white">Conversation behaviour</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Uses the learner’s language and regional accent, with a greeting at the start of each call.</li>
        <li>Audio calls stay in chat, last up to nine minutes, and enter a farewell at 8:30 before hanging up.</li>
        <li>Transcripts come from Live audio. iOS translations run on the device.</li>
        <li>Received AI history stays on the device; relevant context is sent to Gemini. Read-only tools can inspect the learner’s practice data.</li>
        <li>Reminder requests default to a voice message with an ordinary notification. Only explicit requests to call use an incoming audio call through CallKit.</li>
        <li>Reminder times, notes and delivery status are stored on the server. Voice reminder audio is held temporarily until received or cancelled, for up to seven days.</li>
        <li>The app’s Reminders menu shows the time, delivery type and status, with cancellation for upcoming reminders. Calls require APNs VoIP credentials; messages use standard APNs notifications.</li>
      </ul>
    </section>
  </div>;
}
