// Canonical facts about Bantera, shared by the visible pages, llms.txt, and the WebMCP
// tools, so what people read, what answer engines index, and what browser agents are told
// can never drift apart. Grounded only in verified product facts — no pricing, Android,
// or rating claims.

export const SITE_URL = 'https://bantera.app';
export const APP_STORE_URL = 'https://apps.apple.com/app/id6761799720';
export const CONTACT_EMAIL = 'contact@bantera.app';
export const X_URL = 'https://x.com/BanteraApp';

export const SITE_SUMMARY =
  'Bantera is an audio-first language learning app for iOS. You learn by listening to real spoken content cue-by-cue, recording yourself to get AI transcription and pronunciation feedback, and exchanging voice messages with native-speaking language partners — no flashcards or grammar drills.';

export const SUPPORTED_LANGUAGES = [
  'English', 'Mandarin Chinese', 'Japanese', 'Korean', 'Spanish',
  'French', 'German', 'Portuguese', 'Italian', 'Arabic',
] as const;

export type SitePage = { path: string; title: string; description: string };

/** Public pages worth pointing a person or an agent at. Excludes admin and dev areas. */
export const SITE_PAGES: readonly SitePage[] = [
  { path: '/', title: 'Home', description: 'What Bantera is and how it helps you learn a language by speaking.' },
  { path: '/webapp', title: 'Web app — public audio', description: 'Pick a language and browse public audio lessons you can practise in the browser.' },
  { path: '/webapp/studio', title: 'Dialogue Studio', description: 'Generate multi-speaker practice dialogue and audio in the browser.' },
  { path: '/download', title: 'Download', description: 'Get the Bantera app from the App Store.' },
  { path: '/faq', title: 'FAQ', description: 'Answers about languages, pronunciation feedback, language exchange, and availability.' },
  { path: '/support', title: 'Support', description: 'How to get help or contact the Bantera team.' },
  { path: '/privacy', title: 'Privacy policy', description: 'What data Bantera collects and how it is used.' },
  { path: '/delete-account', title: 'Delete account', description: 'How to delete your Bantera account and data.' },
];

// Answer-first Q&A. Each answer leads with one direct sentence (answer engines lift the
// first 1–2). The visible FAQ page and its FAQPage schema both render from this list.
export const FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'What is Bantera?',
    a: SITE_SUMMARY,
  },
  {
    q: 'What is a good app to practise speaking a language?',
    a: 'Bantera is built specifically for speaking practice rather than passive review. You repeat real spoken content one cue at a time, record your own voice, and Bantera transcribes the recording and highlights any mismatch with the original so you can fix your pronunciation. It also pairs you with native-speaker exchange partners for live audio conversation.',
  },
  {
    q: 'How does Bantera compare to flashcard apps like Duolingo?',
    a: 'The core difference is focus: Bantera is audio-first and speaking-centred, built around real spoken content, AI pronunciation comparison, and live language exchange with native speakers, rather than gamified tap-and-translate vocabulary exercises.',
  },
  {
    q: 'What languages does Bantera support?',
    a: 'Bantera supports English, Mandarin, Japanese, Korean, Spanish, French, German, Portuguese, Italian, and Arabic, with more languages added over time.',
  },
  {
    q: 'How does Bantera improve my pronunciation?',
    a: 'You record yourself speaking any cue, and Bantera transcribes the recording and highlights where it differs from the original audio, turning each mistake into a targeted correction you can practise cue-by-cue.',
  },
  {
    q: 'What is language exchange on Bantera and how does it work?',
    a: "Bantera matches you with someone who natively speaks the language you're learning and who is learning your language. For example, an English speaker learning Mandarin is paired with a Mandarin speaker learning English, so you help each other practise through natural voice conversation.",
  },
  {
    q: 'Is Bantera available on Android?',
    a: 'Bantera is currently available on iOS via the App Store. You can also try listening practice in your browser at bantera.app/webapp.',
  },
  {
    q: 'Does Bantera use AI?',
    a: 'Yes. Bantera uses AI to transcribe your voice recordings and compare your pronunciation against the original spoken content, so you can see exactly where you differ.',
  },
  {
    q: 'Can I use Bantera without typing?',
    a: "Yes. Bantera's social features are audio-only: private chats, group conversations, and comments on public content are all voice. You can still read transcripts and instant translations of any audio message.",
  },
  {
    q: 'Can I learn from podcasts and videos on Bantera?',
    a: 'Yes. You can upload or browse audio and video from everyday conversations, podcasts, and interviews, then play any of it cue-by-cue to practise listening and speaking.',
  },
  {
    q: 'How do I get help or contact Bantera?',
    a: 'Email contact@bantera.app for questions, feedback, or bug reports. Bantera is developed by Lisen Huang. You can also visit the Support page at bantera.app/support.',
  },
];
