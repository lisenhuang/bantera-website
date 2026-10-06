import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import DownloadPageClient from './DownloadPageClient';
import { APP_STORE_URL } from '@/lib/site-content';
import { getDownloadPlatform } from '@/lib/download-platform';

export const metadata: Metadata = {
  title: 'Download Bantera for iOS & Android',
  description:
    'Download Bantera, the audio-first language speaking and listening practice app. Listen to real conversations, practise speaking, and connect with language exchange partners.',
  alternates: { canonical: '/download' },
};

const APPLE_UA = /iPhone|iPad|iPod|Macintosh/;

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const ua = (await headers()).get('user-agent') ?? '';

  if (to === 'appstore') {
    if (APPLE_UA.test(ua)) {
      redirect(APP_STORE_URL);
    }
  }

  return <DownloadPageClient initialPlatform={getDownloadPlatform(ua)} />;
}
