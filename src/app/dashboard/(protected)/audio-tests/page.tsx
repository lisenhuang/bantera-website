import { redirect } from 'next/navigation';
import { getAccessToken, getAiSettings } from '@/lib/dashboard-api';
import { getLearningLanguages } from '@/lib/bantera-api';
import AudioTests from './audio-tests';

export const dynamic = 'force-dynamic';

export default async function AudioTestsPage() {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const [settings, languages] = await Promise.all([
    getAiSettings(token).catch(() => null), getLearningLanguages(),
  ]);
  return <AudioTests
    models={Array.from(new Set([...(settings?.availableAudioModels ?? []), ...(settings ? [settings.audioModel] : [])]))}
    defaultModel={settings?.audioModel ?? ''}
    textModel={settings?.textModel ?? null}
    modelListAvailable={settings?.modelListAvailable ?? false}
    languages={languages}
  />;
}
