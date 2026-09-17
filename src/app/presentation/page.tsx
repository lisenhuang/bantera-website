import type { Metadata } from 'next';
import Presentation from './presentation';

export const metadata: Metadata = {
  title: 'Bantera · A conversation worth building for',
  description: 'The personal stories and engineering behind Bantera.',
  alternates: { canonical: '/presentation' },
  robots: { index: false, follow: false },
};

export default function PresentationPage() {
  return <Presentation />;
}
