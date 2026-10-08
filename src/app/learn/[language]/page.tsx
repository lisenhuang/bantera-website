import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LANGUAGE_GUIDES, languageGuide } from '@/lib/language-guides';
import { audioTitle, listPublicAudios } from '@/lib/bantera-api';
import { JsonLd } from '@/components/json-ld';
import { SITE_URL } from '@/lib/site-content';

type Props = { params: Promise<{ language: string }> };
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = languageGuide((await params).language);
  if (!guide) return { title: 'Language guide not found | Bantera', robots: { index: false } };
  const title = `${guide.name} Speaking & Listening Practice | Bantera`;
  const description = `Practise ${guide.name} listening, speaking and shadowing with short audio cues. ${guide.focus}`;
  return { title, description, alternates: { canonical: `/learn/${guide.slug}` }, openGraph: { title, description, url: `/learn/${guide.slug}` }, twitter: { title, description } };
}
export default async function LanguagePage({ params }: Props) {
  const guide = languageGuide((await params).language); if (!guide) notFound();
  let lessons: Awaited<ReturnType<typeof listPublicAudios>> = [];
  let unavailable = false;
  try { lessons = (await listPublicAudios({ languageCode: guide.code, limit: 6 })).filter(a => a.isPublic && a.transcriptCues.length > 0); } catch { unavailable = true; }
  const title = `${guide.name} speaking and listening practice`;
  return <main data-learning-language={guide.code} className="min-h-screen bg-stone-50 px-6 py-12 text-slate-900"><div className="mx-auto max-w-4xl">
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: `${SITE_URL}/learn/${guide.slug}`, inLanguage: 'en', description: guide.focus, about: { '@type': 'Thing', name: `Learning to speak and understand ${guide.name}` }, publisher: { '@id': `${SITE_URL}/#organization` } }} />
    <nav className="flex flex-wrap gap-5 text-sm"><Link href="/" className="font-bold">Bantera</Link><Link href="/learn">All languages</Link><Link href="/download">iOS & Android</Link></nav>
    <p className="mt-14 text-sm font-semibold uppercase tracking-widest text-orange-700">{guide.flag} Listen. Repeat. Speak.</p>
    <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
    <p className="mt-6 text-xl leading-8 text-slate-600">{guide.focus} Bantera lets you replay short audio cues, check the transcript and practise saying each phrase aloud.</p>
    <Link href={`/webapp?languageCode=${guide.code}`} className="mt-8 inline-block rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white">Browse {guide.name} audio</Link>
    <div className="mt-12 grid gap-6 sm:grid-cols-2"><section className="rounded-2xl bg-white p-7"><h2 className="text-2xl font-bold">Practise listening</h2><p className="mt-4 leading-8 text-slate-600">{guide.listening}</p></section><section className="rounded-2xl bg-white p-7"><h2 className="text-2xl font-bold">Practise speaking</h2><p className="mt-4 leading-8 text-slate-600">{guide.speaking}</p></section></div>
    <section className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-7"><h2 className="text-2xl font-bold">A phrase to try</h2><p lang={guide.code} dir={guide.code.startsWith('ar') ? 'rtl' : undefined} className="mt-5 text-2xl">{guide.example}</p><p className="mt-2 text-slate-600">{guide.meaning}</p><p className="mt-5 leading-8">{guide.exercise}</p><p className="mt-3 text-sm text-slate-500">Written practice example. The public lessons below have their own topics and recordings.</p></section>
    <section className="mt-12"><h2 className="text-2xl font-bold">Try {guide.name} audio in your browser</h2><p className="mt-3 leading-7 text-slate-600">Listen first, reveal the transcript when you need help, and repeat each cue aloud. Use slower playback to work through difficult phrases, then return to normal speed.</p><ul className="mt-5 space-y-3">{lessons.map(a => <li key={a.id}><Link href={`/webapp/shadowing/${a.id}`} className="block rounded-xl border border-stone-200 bg-white p-5 hover:border-orange-400"><span className="font-semibold">{audioTitle(a.originalFileName)}</span><span className="mt-1 block text-sm text-slate-500">{a.transcriptLanguage} · {Math.max(1, Math.round(a.durationMs / 60000))} min · {a.isAiGenerated ? 'AI-generated audio' : 'Community audio'}</span></Link></li>)}</ul>{lessons.length === 0 && <p className="mt-5 rounded-xl bg-white p-5">{unavailable ? 'The audio library is temporarily unavailable. You can still use the practice routine above.' : `No public ${guide.name} audio is available here yet. Explore other languages or create practice audio in the app.`}</p>}</section>
    <section className="mt-12"><h2 className="text-2xl font-bold">{guide.question}</h2><p className="mt-4 leading-8 text-slate-600">{guide.answer}</p><h2 className="mt-8 text-2xl font-bold">How does recording help?</h2><p className="mt-4 leading-8 text-slate-600">Hearing your voice beside the original can reveal differences in rhythm, pauses and sounds. Where transcription comparison is available, it highlights differences in recognised words. It is not a pronunciation score, and speech recognition can make mistakes.</p></section>
    <nav aria-label="More learning languages" className="mt-12 flex flex-wrap gap-3">{LANGUAGE_GUIDES.filter(l => l.slug !== guide.slug).map(l => <Link href={`/learn/${l.slug}`} key={l.slug} className="rounded-full border border-stone-300 px-4 py-2 text-sm">{l.name}</Link>)}</nav>
    <p className="mt-10 text-sm text-slate-600">Keep practising with <Link href="/download" className="underline">Bantera for iOS or Android</Link>, or <Link href="/faq" className="underline">read common questions</Link>.</p>
  </div></main>;
}
