import type { Metadata } from 'next';
import Link from 'next/link';
import { DownloadLinks } from '@/components/download-links';
import { SiteLegalChrome } from '@/components/site-legal-chrome';
import { PRODUCT_FEATURES, PRODUCT_AVAILABILITY } from '@/lib/product-features';

export const metadata: Metadata = {
  title: 'Bantera Features: AI Conversation, Pronunciation & Speaking Practice',
  description: 'Explore Bantera AI, tap-or-hold speaking practice, pronunciation guides, translation choices, saved exercises and A0–C2 progress.',
  alternates: { canonical: '/features' },
  openGraph: { title: 'Explore Bantera AI and Speaking Practice', description: 'Short conversations, pronunciation guides, translation choices and clear level progress.', url: '/features' },
  twitter: { title: 'Explore Bantera AI and Speaking Practice', description: 'Short conversations, pronunciation guides, translation choices and clear level progress.' },
};
export default function FeaturesPage() {
  return <SiteLegalChrome><main className="mx-auto max-w-5xl px-6 py-12 sm:py-20">
    <p className="text-sm font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Inside Bantera</p>
    <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">More ways to listen.<br />More reasons to speak.</h1>
    <p className="my-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">A little structure when you need it. A conversation when you want one. Use short speaking exercises, Bantera AI and longer audio lessons together.</p>
    <DownloadLinks />
    <nav aria-label="Explore features" className="my-10 flex flex-wrap gap-3">{PRODUCT_FEATURES.map(f => <a key={f.id} href={`#${f.id}`} className="rounded-full border border-slate-300 px-4 py-2 text-sm dark:border-slate-600">{f.icon} {f.id === 'ai' ? 'Bantera AI' : f.id[0].toUpperCase() + f.id.slice(1)}</a>)}</nav>
    <div className="divide-y divide-slate-200 dark:divide-slate-800">{PRODUCT_FEATURES.map((f, i) => <section key={f.id} id={f.id} className="grid scroll-mt-24 gap-6 py-10 sm:grid-cols-[80px_1fr]">
      <span className="text-5xl font-black text-violet-200 dark:text-violet-900" aria-hidden="true">0{i + 1}</span>
      <div><h2 className="text-2xl font-bold">{f.title}</h2><p className="mt-4 text-lg leading-8">{f.body}</p><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{f.detail}</p></div>
    </section>)}</div>
    <section className="mt-10 rounded-3xl bg-violet-50 p-7 dark:bg-violet-950/40"><h2 className="text-2xl font-bold">What else can I ask Bantera AI?</h2><p className="mt-4 leading-8">Ask for a role-play, a simpler explanation, an example sentence, or help reviewing vocabulary. It can search the web for information, find images when they help explain an idea, and look for videos when you ask. Supported videos can play inside the chat; other links open in a browser.</p><p className="mt-4 leading-8">You can also request a scheduled callback or voice reminder. Availability depends on permissions and regional support. If you report a platform bug, Bantera AI can ask for your permission to submit it to the development team.</p></section>
    <p className="mt-8 text-sm leading-6 text-slate-500 dark:text-slate-400">{PRODUCT_AVAILABILITY} AI responses and translations can contain mistakes.</p>
    <div className="mt-10 flex flex-wrap gap-6 font-semibold"><Link href="/learn" className="underline">Find your learning language</Link><Link href="/faq" className="underline">Read the FAQ</Link><Link href="/about/en" className="underline">Read an introduction in your language</Link></div>
    <div className="mt-10"><DownloadLinks /></div>
  </main></SiteLegalChrome>;
}
