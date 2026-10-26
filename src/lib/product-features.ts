// Product copy shared by the homepage, feature guide and machine-readable reference.
export const PRODUCT_FEATURES = [
  { id: 'practice', icon: '🎙️', title: 'A short conversation, then your turn',
    body: 'Listen to Cue 1, choose the reply that fits, and say it aloud. Tap to start and stop recording, or hold the microphone and release to check your answer.',
    detail: 'Replay at 0.5×, 0.75×, 1×, 1.25× or 1.5×. Pause and resume when you need another moment. Compare what was recognised with the reply and listen to your own recording. Speech recognition can make mistakes, so feedback is not a pronunciation score.' },
  { id: 'ai', icon: '💬', title: 'Talk things through with Bantera AI',
    body: 'Practise a conversation, ask for an example, or get help understanding a sentence. Bantera AI can answer with spoken audio and readable text.',
    detail: 'In Practice, tap a word to underline it, then tap again to ask for an explanation in its sentence. The explanation request includes your learning level. In supported languages, selection can use whole words rather than single characters; character selection remains a fallback.' },
  { id: 'pronunciation', icon: 'あ', title: 'See how unfamiliar writing sounds',
    body: 'Turn on optional pronunciation guides above characters or words in 11 languages. Keep the original writing visible while you learn to say it.',
    detail: 'Guides are available for Mandarin, Cantonese, Japanese, Korean, Thai, Hindi, Arabic, Hebrew, Russian, Ukrainian and Greek. These are romanized readings, such as pinyin, Jyutping or romaji, not translations. The setting is remembered. Readings may need a moment to generate and AI-generated guides can contain errors.' },
  { id: 'translation', icon: '🌐', title: 'Choose the translation that helps you',
    body: 'Choose Translation language from the Practice menu. Bantera remembers the choice for that learning language on your device.',
    detail: 'Choose an available translation language that helps you understand the exercise. Available languages depend on your device, and translation models may need downloading. You can change your choice while a download is in progress.' },
  { id: 'levels', icon: '↗', title: 'Know what you have practised and passed',
    body: 'Start at A0 and work through A1, A2, B1, B2, C1 and C2. The level picker distinguishes locked, practising and passed levels.',
    detail: 'Pass a 12-question level test with at least 10 correct answers to complete the level. C2 also has a completion test. A0 is Bantera’s beginner stage before A1. These app milestones are not an official CEFR assessment or language certificate.' },
  { id: 'saved', icon: '🔖', title: 'Come back to useful phrases',
    body: 'Save a Practice exercise and open it again in the Practice tab. Ask Bantera AI to help you add useful words to your vocabulary.',
    detail: 'Revisit saved exercises, replay their audio and practise the reply again. Vocabulary review and daily listening and speaking goals help you build a routine. Saved exercises can be removed with confirmation.' },
] as const;

export const PRODUCT_AVAILABILITY = 'Features depend on your app version, device, language and region. Store releases may arrive at different times. Public browser lessons do not include every mobile feature.';
