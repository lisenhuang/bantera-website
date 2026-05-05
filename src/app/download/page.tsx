import type { Metadata } from 'next';
import DownloadPageClient from './DownloadPageClient';

export const metadata: Metadata = {
  title: 'Download Bantera — App Store',
  description:
    'Download Bantera, the audio-first language speaking and listening practice app. Listen to real conversations, practise speaking, and connect with language exchange partners.',
};

export default function DownloadPage() {
  return <DownloadPageClient />;
}
