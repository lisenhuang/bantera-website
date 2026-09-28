// Canonical facts about Bantera, shared by the visible pages, llms.txt, and the WebMCP
// tools, so what people read, what answer engines index, and what browser agents are told
// stay consistent. Grounded in product facts, without unverified pricing or rating claims.

export const SITE_URL = 'https://bantera.app';
export const APP_STORE_URL = 'https://apps.apple.com/app/id6761799720';
export const CONTACT_EMAIL = 'contact@bantera.app';
export const X_URL = 'https://x.com/BanteraApp';

export const SITE_SUMMARY =
  'Bantera is a language learning app for speaking and listening practice on iOS and Android, with public audio practice in the browser. Listen to short cues, repeat them aloud, record and compare your voice, and practise with language exchange partners. It supports more than 30 learning languages.';

export const SUPPORTED_LANGUAGES = [
  'English', 'Mandarin Chinese', 'Japanese', 'Korean', 'Spanish',
  'French', 'German', 'Portuguese', 'Italian', 'Arabic', 'Cantonese',
  'Russian', 'Hindi', 'Indonesian', 'Vietnamese', 'Thai', 'Turkish', 'Dutch',
  'Polish', 'Swedish', 'Danish', 'Norwegian Bokmål', 'Finnish', 'Ukrainian',
  'Greek', 'Czech', 'Slovak', 'Hungarian', 'Romanian', 'Croatian', 'Hebrew', 'Malay', 'Catalan',
] as const;

export type SitePage = { path: string; title: string; description: string };

/** Public pages worth pointing a person or an agent at. Excludes admin and dev areas. */
export const SITE_PAGES: readonly SitePage[] = [
  { path: '/learn', title: 'Speaking and listening by language', description: 'Practical guides for Spanish, French, Mandarin, Japanese, Korean, German, Italian, Portuguese, Arabic and English.' },
  { path: '/', title: 'Home', description: 'What Bantera is and how it helps you learn a language by speaking.' },
  { path: '/webapp', title: 'Web app — public audio', description: 'Pick a language and browse public audio lessons you can practise in the browser.' },
  { path: '/webapp/studio', title: 'Dialogue Studio', description: 'Generate multi-speaker practice dialogue and audio in the browser.' },
  { path: '/download', title: 'Download', description: 'Get Bantera for iOS from the App Store or download the Android APK.' },
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
    q: 'How can I practise speaking and listening with Bantera?',
    a: 'Bantera is built specifically for speaking practice rather than passive review. You repeat real spoken content one cue at a time, record your own voice, and Bantera transcribes the recording and highlights differences in recognised words. Listen to both recordings to compare rhythm and pronunciation; transcription is not an accuracy score. You can also look for language exchange partners, subject to availability.',
  },
  {
    q: 'How is audio practice different from flashcard study?',
    a: 'Flashcards can help you review vocabulary. Bantera focuses on listening to connected speech and saying phrases aloud: replay audio, check the transcript, repeat, and compare recordings. These methods can complement each other.',
  },
  {
    q: 'What languages does Bantera support?',
    a: `Bantera’s learning language catalogue includes ${SUPPORTED_LANGUAGES.join(', ')}. Some languages have regional options. Public audio and exchange partner availability vary by language.`,
  },
  {
    q: 'How does Bantera improve my pronunciation?',
    a: 'You record yourself speaking any cue, and Bantera transcribes the recording and highlights where it differs from the original audio, giving you one clue about what to practise. Compare the recordings too: a transcription difference is not a reliable diagnosis of a pronunciation error.',
  },
  {
    q: 'What is language exchange on Bantera and how does it work?',
    a: "Bantera matches you with someone who natively speaks the language you're learning and who is learning your language. For example, an English speaker learning Mandarin is paired with a Mandarin speaker learning English, so you help each other practise through natural voice conversation.",
  },
  {
    q: 'Is Bantera available on Android?',
    a: 'Yes. Download the Android APK directly from bantera.app/download. Bantera is also available for iOS on the App Store, and public audio practice works in your browser at bantera.app/webapp.',
  },
  {
    q: 'Does Bantera use AI?',
    a: 'Yes. Bantera can generate practice audio and transcribe recordings. Transcription comparison highlights differences in recognised words, while replaying the recordings lets you compare what you hear. AI output may contain mistakes.',
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
