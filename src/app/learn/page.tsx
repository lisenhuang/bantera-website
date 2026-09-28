import type { Metadata } from 'next';
import Link from 'next/link';
import { LANGUAGE_GUIDES } from '@/lib/language-guides';
import { SUPPORTED_LANGUAGES } from '@/lib/site-content';
export const metadata: Metadata = {
  title: 'Speaking & Listening Practice by Language | Bantera',
  description: 'Practise speaking and listening in Spanish, French, Mandarin, Japanese, Korean, German and more. Learn a cue-by-cue routine and find audio to repeat aloud.',
  alternates: { canonical: '/learn' },
};
export default function LearnPage() {
  return <main className="min-h-screen bg-stone-50 px-6 py-12 text-slate-900"><div className="mx-auto max-w-5xl">
    <nav className="flex gap-6 text-sm"><Link href="/" className="font-bold">Bantera</Link><Link href="/webapp">Audio library</Link><Link href="/download">Get the app</Link></nav>
    <p className="mt-16 text-sm font-semibold uppercase tracking-widest text-orange-700">Listen. Repeat. Speak.</p>
    <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Speaking and listening practice in your language</h1>
    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Understanding a language and speaking it aloud take practice. Bantera helps you listen to short audio cues, check what you heard, and repeat them in your own voice. Choose a language for a practical starting point.</p>
    <div className="mt-10 grid gap-4 sm:grid-cols-2">{LANGUAGE_GUIDES.map(l => <Link key={l.slug} href={`/learn/${l.slug}`} className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-orange-400"><h2 className="text-xl font-semibold">{l.flag} {l.name}</h2><p className="mt-2 leading-7 text-slate-600">{l.focus}</p><p className="mt-4 text-sm font-semibold text-orange-700">Explore speaking & listening practice →</p></Link>)}</div>
    <section className="mt-14 rounded-2xl bg-white p-8"><h2 className="text-2xl font-bold">More supported learning languages</h2><p className="mt-4 leading-8 text-slate-600">{SUPPORTED_LANGUAGES.join(', ')}.</p><p className="mt-4 text-sm text-slate-600">The app’s language catalogue offers these choices. Public audio availability varies by language; a catalogue option does not guarantee a lesson or an available exchange partner.</p><Link href="/webapp" className="mt-5 inline-block font-semibold text-orange-700 underline">Browse the current audio library</Link></section>
    <section className="mt-12"><h2 className="text-2xl font-bold">A short routine for any language</h2><ol className="mt-4 list-decimal space-y-3 pl-5 leading-7"><li>Listen to a short cue without reading and identify the main message.</li><li>Reveal the transcript, then listen again to the words you missed.</li><li>Repeat just after the speaker, or shadow along once you know the phrase.</li><li>Record your voice, compare it with the model, and try the phrase without text.</li></ol><p className="mt-4 leading-7">Choose material you can mostly understand. Focus on one phrase or sound each round instead of trying to make a whole lesson perfect.</p></section>
  </div></main>;
}
