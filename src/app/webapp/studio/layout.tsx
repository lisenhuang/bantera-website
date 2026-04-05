import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dialogue Studio | Bantera',
  description: 'Generate multi-speaker conversational language dialogues and text-to-speech audio natively.',
};

export default function WebappStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
