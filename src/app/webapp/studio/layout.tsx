import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dialogue Studio | Bantera',
  description: 'Generate multi-speaker conversational language dialogues and text-to-speech audio natively.',
  alternates: { canonical: '/webapp/studio' },
};

export default function WebappStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
