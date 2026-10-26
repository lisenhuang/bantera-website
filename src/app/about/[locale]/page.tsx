import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { INTRODUCTIONS, introduction, introductionAlternates } from '@/lib/localized-introductions';
import { DownloadLinks } from '@/components/download-links';
import { JsonLd } from '@/components/json-ld';

type Props = { params: Promise<{ locale: string }> };
export function generateStaticParams() { return INTRODUCTIONS.map(({ locale }) => ({ locale })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = introduction((await params).locale);
  if (!item) notFound();
  return { title: item.title, description: item.intro,
    alternates: { canonical: `/about/${item.locale}`, languages: introductionAlternates() },
    openGraph: { title: item.title, description: item.intro, url: `/about/${item.locale}`, locale: item.locale.replace('-', '_') },
    twitter: { title: item.title, description: item.intro },
  };
}
export default async function IntroductionPage({ params }: Props) {
  const item = introduction((await params).locale);
  if (!item) notFound();
  const answers = [[item.practiceTitle, item.practice], [item.aiTitle, item.ai], [item.supportTitle, item.support]];
  return <main lang={item.locale} className="min-h-screen bg-stone-50 px-6 py-12 text-slate-900 dark:bg-gray-950 dark:text-white"><div className="mx-auto max-w-3xl">
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: item.locale, url: `https://bantera.app/about/${item.locale}`, mainEntity: answers.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
    <Link href="/" className="font-black">Bantera</Link>
    <h1 className="mt-12 text-4xl font-black leading-tight tracking-tight sm:text-5xl">{item.title}</h1>
    <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{item.intro}</p>
    <section className="mt-8" aria-label={item.download}><h2 className="mb-3 text-lg font-bold">{item.download}</h2><DownloadLinks /></section>
    {answers.map(([q, a]) => <section key={q} className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-2xl font-bold">{q}</h2><p className="mt-4 leading-8 text-slate-600 dark:text-slate-300">{a}</p></section>)}
    <nav aria-label={item.languages} className="mt-12"><h2 className="mb-4 text-xl font-bold">{item.languages}</h2><div className="flex flex-wrap gap-2">{INTRODUCTIONS.map(other => <Link key={other.locale} href={`/about/${other.locale}`} hrefLang={other.locale} lang={other.locale} aria-current={item.locale === other.locale ? 'page' : undefined} className="rounded-full border border-slate-300 px-4 py-2 text-sm aria-[current=page]:border-violet-500 aria-[current=page]:bg-violet-100 aria-[current=page]:text-violet-900 dark:border-slate-600">{other.name}</Link>)}</div></nav>
    <div className="mt-10"><DownloadLinks /></div>
  </div></main>;
}
