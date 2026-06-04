import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { SiteLegalChrome } from "@/components/site-legal-chrome";

export const metadata: Metadata = {
  title: "FAQ — Bantera",
  description:
    "Frequently asked questions about Bantera: supported languages, how speaking practice and AI pronunciation feedback work, language exchange, and platform availability.",
  alternates: { canonical: "/faq" },
};

// Answer-first Q&A. Each answer leads with one direct sentence (answer engines
// lift the first 1–2). Grounded only in verified product facts — no pricing,
// Android, or rating claims. The visible text below must match the schema text.
const FAQS = [
  {
    q: "What is Bantera?",
    a: "Bantera is an audio-first language learning app for iOS. You learn by listening to real spoken content cue-by-cue, recording yourself to get AI transcription and pronunciation feedback, and exchanging voice messages with native-speaking language partners — no flashcards or grammar drills.",
  },
  {
    q: "What is a good app to practise speaking a language?",
    a: "Bantera is built specifically for speaking practice rather than passive review. You repeat real spoken content one cue at a time, record your own voice, and Bantera transcribes the recording and highlights any mismatch with the original so you can fix your pronunciation. It also pairs you with native-speaker exchange partners for live audio conversation.",
  },
  {
    q: "How does Bantera compare to flashcard apps like Duolingo?",
    a: "The core difference is focus: Bantera is audio-first and speaking-centred, built around real spoken content, AI pronunciation comparison, and live language exchange with native speakers, rather than gamified tap-and-translate vocabulary exercises.",
  },
  {
    q: "What languages does Bantera support?",
    a: "Bantera supports English, Mandarin, Japanese, Korean, Spanish, French, German, Portuguese, Italian, and Arabic, with more languages added over time.",
  },
  {
    q: "How does Bantera improve my pronunciation?",
    a: "You record yourself speaking any cue, and Bantera transcribes the recording and highlights where it differs from the original audio, turning each mistake into a targeted correction you can practise cue-by-cue.",
  },
  {
    q: "What is language exchange on Bantera and how does it work?",
    a: "Bantera matches you with someone who natively speaks the language you're learning and who is learning your language. For example, an English speaker learning Mandarin is paired with a Mandarin speaker learning English, so you help each other practise through natural voice conversation.",
  },
  {
    q: "Is Bantera available on Android?",
    a: "Bantera is currently available on iOS via the App Store. You can also try listening practice in your browser at bantera.app/webapp.",
  },
  {
    q: "Does Bantera use AI?",
    a: "Yes. Bantera uses AI to transcribe your voice recordings and compare your pronunciation against the original spoken content, so you can see exactly where you differ.",
  },
  {
    q: "Can I use Bantera without typing?",
    a: "Yes. Bantera's social features are audio-only: private chats, group conversations, and comments on public content are all voice. You can still read transcripts and instant translations of any audio message.",
  },
  {
    q: "Can I learn from podcasts and videos on Bantera?",
    a: "Yes. You can upload or browse audio and video from everyday conversations, podcasts, and interviews, then play any of it cue-by-cue to practise listening and speaking.",
  },
  {
    q: "How do I get help or contact Bantera?",
    a: "Email contact@bantera.app for questions, feedback, or bug reports. Bantera is developed by Lisen Huang. You can also visit the Support page at bantera.app/support.",
  },
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://bantera.app/faq#faqpage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <SiteLegalChrome activePage="faq">
      <JsonLd data={faqLd} />
      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
          Frequently asked questions
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-10">
          Everything you need to know about learning languages with Bantera.
        </p>
        <dl className="space-y-8">
          {FAQS.map((f) => (
            <div
              key={f.q}
              className="border-b border-gray-100 dark:border-white/10 pb-8 last:border-0"
            >
              <dt className="text-lg font-bold text-gray-900 dark:text-white">
                {f.q}
              </dt>
              <dd className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </main>
    </SiteLegalChrome>
  );
}
