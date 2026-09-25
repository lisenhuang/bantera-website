import type { Metadata } from 'next';
import Presentation from './presentation';

export const metadata: Metadata = {
  title: 'Bantera at Ruby Nights · Ethan Huang',
  description: 'The personal stories and engineering behind Bantera.',
  alternates: { canonical: '/ruby-nights' },
  robots: { index: false, follow: false },
};

export default function PresentationPage() {
  return <Presentation />;
}
