import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import DownloadPageClient from './DownloadPageClient';

export const metadata: Metadata = {
  title: 'Download Bantera — App Store',
  description:
    'Download Bantera, the audio-first language speaking and listening practice app. Listen to real conversations, practise speaking, and connect with language exchange partners.',
};

const APP_STORE_URL = 'https://apps.apple.com/app/id6761799720';
const APPLE_UA = /iPhone|iPad|iPod|Macintosh/;

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;

  if (to === 'appstore') {
    const ua = (await headers()).get('user-agent') ?? '';
    if (APPLE_UA.test(ua)) {
      redirect(APP_STORE_URL);
    }
  }

  return <DownloadPageClient />;
}
