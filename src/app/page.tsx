import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bantera — Learn Languages Through Real Conversation',
  description:
    'Bantera is an audio-first language learning app. Listen to real spoken content, practise speaking, and find language exchange partners who speak what you want to learn.',
};

// ── Feature data ──────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🎧',
    title: 'Listen to Real Spoken Content',
    body: 'Upload or browse audio and video from everyday conversations, podcasts, and interviews. Play content cue-by-cue so nothing slips past you.',
  },
  {
    icon: '👁️',
    title: 'Subtitles on Your Terms',
    body: 'Hide subtitles to challenge yourself, reveal them when you need help, and toggle translations any time. You control how much support you get.',
  },
  {
    icon: '🎤',
    title: 'Record Yourself & Compare',
    body: 'Record your own voice for any cue. Bantera transcribes your recording and highlights any mismatch with the original — turning every mistake into a lesson.',
  },
  {
    icon: '🔄',
    title: 'Find Your Language Exchange Partner',
    body: 'If you speak English and learn Mandarin, Bantera can connect you with someone who speaks Mandarin and learns English. Help each other — and both grow faster.',
  },
  {
    icon: '🔊',
    title: 'Audio-Only Social',
    body: 'Send voice messages in private chats and group conversations. Leave voice comments on public content. No typing — just speaking.',
  },
  {
    icon: '📝',
    title: 'Private Study Notes',
    body: 'Attach notes to any cue or piece of content. Jot down tricky words, pronunciation reminders, or grammar patterns. Your notes are always private.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Pick your language',
    body: 'Tell Bantera what language you speak and what you want to learn.',
    accent: 'from-orange-400 to-amber-400',
  },
  {
    step: '02',
    title: 'Listen by cue',
    body: 'Play real spoken content one sentence at a time. Hide or show subtitles as needed.',
    accent: 'from-pink-400 to-rose-500',
  },
  {
    step: '03',
    title: 'Record & compare',
    body: 'Repeat each cue in your own voice and see exactly how close your pronunciation is.',
    accent: 'from-violet-400 to-indigo-500',
  },
  {
    step: '04',
    title: 'Connect & exchange',
    body: 'Chat with exchange partners using audio messages. Hear and be heard.',
    accent: 'from-teal-400 to-cyan-500',
  },
];

const LANGUAGES = ['🇺🇸 English', '🇨🇳 Mandarin', '🇯🇵 Japanese', '🇰🇷 Korean', '🇪🇸 Spanish', '🇫🇷 French', '🇩🇪 German', '🇧🇷 Portuguese', '🇮🇹 Italian', '🇸🇦 Arabic'];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans antialiased transition-colors duration-300">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Bantera</span>
          <span className="ml-2 hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
            Coming soon
          </span>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 overflow-hidden pt-20">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-teal-500/5 blur-3xl" />
          {/* Audio wave decoration */}
          <div className="absolute bottom-24 inset-x-0 flex items-end justify-center gap-1 opacity-20">
            {Array.from({ length: 48 }).map((_, i) => {
              const heights = [20, 35, 55, 40, 70, 30, 60, 45, 80, 35, 50, 25, 65, 40, 75, 30, 55, 45, 70, 25, 60, 50, 40, 80, 35, 65, 45, 55, 30, 70, 20, 50, 60, 35, 45, 75, 25, 55, 40, 65, 30, 80, 45, 35, 60, 25, 50, 40];
              return (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-orange-400"
                  style={{ height: `${heights[i % heights.length]}px` }}
                />
              );
            })}
          </div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm text-gray-300">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            Audio-first language learning
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.05]">
            Learn languages
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
              by actually speaking
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-gray-400 leading-relaxed">
            Bantera helps you improve listening and speaking through real conversations —
            not flashcards or grammar drills. Listen, repeat, record, and exchange with
            native speakers who are learning your language.
          </p>

        </div>
      </section>

      {/* ── Language pills ───────────────────────────────────── */}
      <div className="bg-gray-950 border-t border-white/5 py-6 overflow-hidden">
        <div className="flex gap-3 animate-none">
          <div className="flex gap-3 min-w-max mx-auto flex-wrap justify-center px-6">
            {LANGUAGES.map((lang) => (
              <span key={lang} className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400">
                {lang}
              </span>
            ))}
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-500 italic">and more…</span>
          </div>
        </div>
      </div>

      {/* ── Features grid ────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-sm font-semibold text-orange-500 tracking-widest uppercase">What you can do</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
              Everything built for speaking
            </h2>
            <p className="max-w-xl mx-auto text-lg text-gray-500 dark:text-gray-400">
              Every feature in Bantera exists so you spend more time listening, speaking, and connecting — not studying theory.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-white/10 hover:border-orange-200 dark:hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-sm font-semibold text-orange-500 tracking-widest uppercase">The learning loop</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
              How Bantera works
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative space-y-4">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${step.accent} text-white text-xl font-black shadow-lg`}>
                  {step.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{step.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Language exchange callout ─────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-teal-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <p className="text-sm font-semibold text-teal-400 tracking-widest uppercase">Language exchange</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            You teach me yours.
            <br />
            <span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
              I&apos;ll teach you mine.
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-gray-400 leading-relaxed">
            Bantera matches you with people who speak your target language natively —
            and who want to learn yours. You both win. No tutor fees. No awkward lessons.
            Just two people helping each other get better through natural conversation.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center mt-10">
            {/* User A card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left w-full sm:max-w-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-lg">🧑</div>
                <div>
                  <p className="text-white font-semibold text-sm">Jamie</p>
                  <p className="text-gray-500 text-xs">Native English · Learning Mandarin</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-medium">🇺🇸 English</span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-gray-400 text-xs font-medium">🇨🇳 Learning</span>
              </div>
            </div>

            {/* Match arrow */}
            <div className="text-3xl text-teal-400 rotate-90 sm:rotate-0">⇄</div>

            {/* User B card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left w-full sm:max-w-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-lg">👩</div>
                <div>
                  <p className="text-white font-semibold text-sm">Lin</p>
                  <p className="text-gray-500 text-xs">Native Mandarin · Learning English</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-medium">🇨🇳 Mandarin</span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-gray-400 text-xs font-medium">🇺🇸 Learning</span>
              </div>
            </div>
          </div>

          <p className="text-gray-500 text-sm">Bantera suggests you may be a perfect match ✓</p>
        </div>
      </section>

      {/* ── Audio social section ──────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold text-orange-500 tracking-widest uppercase">Community</p>
              <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                Talk.
                <br />
                Don&apos;t type.
              </h2>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                In Bantera, messages are always voice. Private chats, group conversations, and comments on content — all audio. Because the whole point is to practise speaking, not typing.
              </p>
              <ul className="space-y-3">
                {[
                  '🎙️ Send voice messages in private chats',
                  '👥 Join group conversations by audio',
                  '💬 Leave voice comments on public content',
                  '📄 Read transcripts without playing every clip',
                  '🌐 Translate any audio message instantly',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="shrink-0 mt-0.5">{item.slice(0, 2)}</span>
                    <span>{item.slice(3)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual: chat bubbles */}
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-white/10 shadow-xl p-6 space-y-4 max-w-xs mx-auto">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/10">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-sm">👩</div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">Lin</p>
                    <p className="text-[10px] text-gray-400">Exchange partner · Mandarin</p>
                  </div>
                </div>
                {[
                  { from: 'them', wave: '▁▃▅▇▅▃▁▃▅▃▁', time: '0:04', transcript: 'How was your weekend?' },
                  { from: 'me',   wave: '▁▄▇▅▃▁▃▅▇▄▁', time: '0:06', transcript: 'Really good! We went to the market.' },
                  { from: 'them', wave: '▁▂▄▆▄▂▁▃▅▃▁', time: '0:03', transcript: 'Oh nice! Which one?' },
                ].map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2.5 space-y-1.5 ${
                      msg.from === 'me'
                        ? 'bg-orange-500 rounded-tr-sm'
                        : 'bg-gray-100 dark:bg-gray-700 rounded-tl-sm'
                    }`}>
                      <div className={`flex items-center gap-2 ${msg.from === 'me' ? 'text-orange-100' : 'text-gray-400 dark:text-gray-300'}`}>
                        <span className="text-[10px] tracking-widest">{msg.wave}</span>
                        <span className="text-[10px] shrink-0">{msg.time}</span>
                      </div>
                      <p className={`text-[11px] ${msg.from === 'me' ? 'text-orange-50' : 'text-gray-500 dark:text-gray-300'}`}>
                        &ldquo;{msg.transcript}&rdquo;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-white dark:bg-gray-950 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
            Ready to actually
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">start speaking?</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Bantera is launching soon.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-10 px-6 bg-gray-950 border-t border-white/5 text-center">
        <p className="text-gray-600 text-sm">
          <span className="font-bold text-gray-400">Bantera</span> · Audio-first language learning · Coming soon
        </p>
      </footer>
    </div>
  );
}
