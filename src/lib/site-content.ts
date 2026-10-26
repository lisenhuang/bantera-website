// Canonical facts about Bantera, shared by the visible pages, llms.txt, and the WebMCP
// tools, so what people read, what answer engines index, and what browser agents are told
// stay consistent. Grounded in product facts, without unverified pricing or rating claims.

export const SITE_URL = 'https://bantera.app';
export const DOWNLOAD_URL = `${SITE_URL}/download`;
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.lisenhuang.bantera';
export const APP_STORE_ID = '6761799720';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
export const CONTACT_EMAIL = 'contact@bantera.app';
export const X_URL = 'https://x.com/BanteraApp';

export const SITE_SUMMARY =
  'Bantera is a speaking and listening app for iOS and Android with more than 30 learning languages and regional options. Practise short conversations, talk with Bantera AI, use optional pronunciation guides, and work through A0–C2 app levels. Public audio lessons also work in the browser.';

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
  { path: '/features', title: 'App features', description: 'Bantera AI, short speaking exercises, pronunciation guides, translations, saved practice and level progress.' },
  { path: '/about/en', title: 'Bantera in your language', description: 'A translated introduction to speaking and listening with Bantera, with links to other languages.' },
  { path: '/learn', title: 'Speaking and listening by language', description: 'Speaking and listening guides with example phrases for all 33 learning languages.' },
  { path: '/', title: 'Home', description: 'What Bantera is and how it helps you learn a language by speaking.' },
  { path: '/webapp', title: 'Web app — public audio', description: 'Pick a language and browse public audio lessons you can practise in the browser.' },
  { path: '/webapp/studio', title: 'Dialogue Studio', description: 'Generate multi-speaker practice dialogue and audio in the browser.' },
  { path: '/download', title: 'Download', description: 'Get Bantera for iOS from the App Store or Android from Google Play.' },
  { path: '/faq', title: 'FAQ', description: 'Answers about languages, pronunciation feedback, language exchange, and availability.' },
  { path: '/support', title: 'Support', description: 'How to get help or contact the Bantera team.' },
  { path: '/privacy', title: 'Privacy policy', description: 'What data Bantera collects and how it is used.' },
  { path: '/delete-account', title: 'Delete account', description: 'How to delete your Bantera account and data.' },
];

// Answer-first Q&A. Each answer leads with one direct sentence (answer engines lift the
// first 1–2). The visible FAQ page and its FAQPage schema both render from this list.
export const FAQS: readonly { q: string; a: string }[] = [
  {"q": "How do I record a reply in Practice?", "a": "Tap the microphone to start and tap again to check, or hold it while speaking and release to check. You can pause naturally while speaking without stopping the recording. The Practice recording limit is 30 seconds. Compare the recognised text and your audio with the reply; transcription can make mistakes."},
  {"q": "How do A0–C2 levels work?", "a": "New learners begin at A0. The level picker shows three states: locked, practising and passed. Complete a 12-question test with at least 10 correct answers to pass a level and move forward; C2 also has a completion test. A0 is Bantera’s introductory stage, and these app milestones are not an official CEFR certificate."},
  {"q": "Can Bantera AI explain a word from my practice sentence?", "a": "Yes. Tap a word once to underline the selection, then tap it again to open the explanation dialog. Confirm to send the selected word, sentence and your learning level to Bantera AI. It can reply with spoken audio and text. Whole-word selection is available where word detection supports it; a single character can be sent with context as a fallback."},
  {"q": "Can I choose my translation language or change it during a download?", "a": "Open the three-dot Practice menu and choose Translation language. The app remembers your choice for the learning language on that device. In newer app versions you can change it even while a model downloads or a translation is pending. An old system model download may continue, but its translation must not replace your new choice."},
  {"q": "Can I translate Cantonese into Mandarin if there is no direct pair?", "a": "On supported devices, newer Bantera versions can translate through English when both steps are available. Choose the destination in Translation language; an indirect route is labelled Via English. This depends on device language-pair support and may require model downloads. It can lose nuance, and it does not make every language pair available."},
  {"q": "Can I ask Bantera AI for images, videos or a reminder?", "a": "Yes. Bantera AI has tools to search for information, images and videos, and to schedule supported callbacks or voice reminders. Images are optional aids when they help an explanation. Supported videos can play within chat, while other links open in a browser. Reminder delivery and calls depend on permissions, device support and region."},
  {"q": "Can I practise an exercise again later?", "a": "Save the exercise, then open it from Saved practice to return to it in the Practice tab. You can replay the audio and practise the reply again. Swipe a saved item to reveal deletion, then confirm. A clear-all option also asks for confirmation."},
  {"q": "Can I slow audio down and pause it?", "a": "Yes. Practice offers 0.5×, 0.75×, 1×, 1.25× and 1.5× playback. Tap the playback control to pause and tap again to continue from the paused position. This lets you work through a phrase before listening again at normal speed."},
  {"q": "Are all app features available in the browser and in every language?", "a": "No. Browser lessons focus on public listening and shadowing practice. Mobile features depend on app version, language, device and region, and store updates may arrive at different times. On-device Practice translation requires iOS 18 or later on iPhone; Android translation depends on its supported models. Pronunciation guides cover 11 languages, not the entire catalogue."},

  {
    q: 'Can I see pronunciation guides in Practice?',
    a: 'Bantera app version 3.15.0 and later includes an optional Pronunciation toggle in Practice for Mandarin, Cantonese, Japanese, Korean, Thai, Hindi, Arabic, Hebrew, Russian, Ukrainian and Greek. Romanized readings appear above the original characters or words. Your choice is remembered for each account and learning language. Older exercises may briefly show a preparation message while their readings are generated. These guides support listening practice and may contain AI-generated mistakes; they are not translations.',
  },
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
    q: 'What is A0 practice in Bantera?',
    a: 'A0 is Bantera’s starting-from-zero stage before A1, introduced in mobile app version 3.1.0. It uses single words, short everyday expressions and replayable audio. Meanings appear automatically where device translation is supported. A0 is inspired by Pre-A1 but is not an official CEFR level. Existing learners keep their progress and can select A0 for easier practice. Availability depends on your installed app version.',
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
    a: "Bantera helps you find people who natively speak the language you are learning and are learning your language. For example, an English speaker learning Mandarin can look for a Mandarin speaker learning English, to practise through voice conversation. An available partner is not guaranteed; social and call features vary by region.",
  },
  {
    q: 'Is Bantera available on Android?',
    a: 'Yes. Get Bantera for Android on Google Play via bantera.app/download. Bantera is also available for iOS on the App Store, and public audio practice works in your browser at bantera.app/webapp.',
  },
  {
    q: 'Does Bantera use AI?',
    a: 'Yes. Bantera AI supports voice conversations, explanations and role-play. It can explain a selected Practice word using its sentence and your learning level, help with vocabulary, search the web, and find images or videos when appropriate. Bantera also generates practice content and transcribes recordings. AI output may contain mistakes.',
  },
  {
    q: 'Can I use Bantera without typing?',
    a: "Yes. Bantera's social features are audio-only: private chats, group conversations, and comments on public content are all voice. You can read transcripts and use translation where supported. Group chats and DM audio/video calls are unavailable for users detected in mainland China.",
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
