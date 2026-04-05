'use server';

import { GoogleGenAI } from '@google/genai';
import { VOICE_OPTIONS } from './constants';

const VOICE_NAMES: Set<string> = new Set(VOICE_OPTIONS.map(v => v.name));

/** Strip emoji for TTS / plain translation (display text keeps emojis inline). */
function stripEmojis(s: string): string {
  return s
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\uFE0F/g, '')
    .replace(/\u200D/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Types ─────────────────────────────────────────────────────────
export type DialogueLine = { speaker: 'Speaker1' | 'Speaker2'; text: string; translation?: string };

export type ListModelsResult =
  | { success: true; textModels: string[]; audioModels: string[] }
  | { success: false; error: string };

export type GenerateDialogueResult =
  | { success: true; title: string; lines: DialogueLine[]; voice1: string; voice2: string }
  | { success: false; error: string };

export type GenerateAudioResult =
  | { success: true; audioBase64: string }
  | { success: false; error: string };

// ── List models using the user's key ─────────────────────────────
type RawModel = { name: string; supportedGenerationMethods?: string[] };

export async function listModelsAction(apiKey: string): Promise<ListModelsResult> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try { msg = JSON.parse(text)?.error?.message ?? text; } catch { /* keep raw */ }
      return { success: false, error: msg };
    }

    const data = (await res.json()) as { models: RawModel[] };
    const all = data.models ?? [];

    const audioModels = all
      .filter(m =>
        (m.name.includes('tts') || m.name.includes('native-audio')) &&
        (m.supportedGenerationMethods ?? []).includes('generateContent'),
      )
      .map(m => m.name);

    const excludeKeywords = [
      'tts', 'audio', 'embed', 'image', 'video', 'aqa', 'lyria', 'veo',
      'robotics', 'predict', 'nano-banana', 'deep-research',
    ];
    const textModels = all
      .filter(m => {
        const methods = m.supportedGenerationMethods ?? [];
        return methods.includes('generateContent') &&
          !excludeKeywords.some(kw => m.name.toLowerCase().includes(kw));
      })
      .map(m => m.name);

    return { success: true, textModels, audioModels };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Generate dialogue ─────────────────────────────────────────────
export async function generateDialogueAction(opts: {
  apiKey: string;
  languageLabel: string;
  accentInstruction: string;
  scenario?: string;
  textModel: string;
  targetDurationSecs?: number;
  translationTargetLabel?: string;
}): Promise<GenerateDialogueResult> {
  const { apiKey, languageLabel, accentInstruction, scenario, textModel, targetDurationSecs = 60, translationTargetLabel } = opts;

  const targetWords = Math.round((targetDurationSecs / 60) * 130);
  const durationLabel =
    targetDurationSecs < 60 ? `${targetDurationSecs} seconds`
    : targetDurationSecs === 60 ? '1 minute'
    : `${targetDurationSecs / 60} minutes`;

  const scenarioLine = scenario
    ? `The scenario is: ${scenario}`
    : 'Choose a random, interesting everyday scenario (e.g. ordering coffee, catching up after a holiday, a job interview, grocery shopping, getting lost on holiday).';

  const translationLine = translationTargetLabel 
    ? `\nProvide an accurate, natural translation into ${translationTargetLabel} for every single line in the field "translation".` 
    : '';

  const voiceList = VOICE_OPTIONS.map(v => `${v.name} (${v.gender}, ${v.style})`).join(' | ');

  const jsonTemplate = translationTargetLabel
    ? `{\n  "title": "...",\n  "voice1": "VoiceNameHere",\n  "voice2": "VoiceNameHere",\n  "lines": [\n    { "speaker": "Speaker1", "text": "...", "translation": "..." },\n    { "speaker": "Speaker2", "text": "...", "translation": "..." }\n  ]\n}`
    : `{\n  "title": "...",\n  "voice1": "VoiceNameHere",\n  "voice2": "VoiceNameHere",\n  "lines": [\n    { "speaker": "Speaker1", "text": "..." },\n    { "speaker": "Speaker2", "text": "..." }\n  ]\n}`;

  const prompt = `
You are a dialogue writer for conversational language learning.

${accentInstruction}
${scenarioLine}

Target audio duration: approximately ${durationLabel}.
Write enough lines so that when spoken naturally (~130 words per minute), the dialogue fills roughly that time.
Aim for approximately ${targetWords} words total across all speakers.

Generate a natural, realistic spoken dialogue between exactly TWO people.
- Name them Speaker1 and Speaker2.
- Alternate turns naturally; each turn should be 1–3 sentences.
- Keep sentences short and conversational — the way people actually talk.
- Do NOT include stage directions or any text outside the dialogue.${translationLine}
- Optional readability: you may place one or more emojis inside "text" only, immediately after the word or phrase they refer to (e.g. "Looks like rain again 🌧️" or "That really hurt 💔"). Use emojis sparingly — many lines should have none if they do not need one. Never put emojis at the start of a line as decoration; only inline where they clarify tone or meaning.
${translationTargetLabel ? `- Translations must be plain text with NO emojis.` : ''}
- Also write a short, catchy title for this dialogue (max 8 words).

Choose a voice for each speaker from the following list. Pick voices that suit each character's likely personality, age, and role in the scenario. Prefer different genders unless the scenario clearly involves two people of the same gender. Use the exact name as shown.
Available voices: ${voiceList}

Return ONLY valid JSON in this exact format, no markdown fences, no extra keys:
${jsonTemplate}
`.trim();

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({ model: textModel, contents: prompt });
    const raw = res.text ?? '';

    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    let parsed: { title: string; lines: DialogueLine[]; voice1?: string; voice2?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse response from AI.');
      parsed = JSON.parse(match[0]);
    }

    const voice1 = parsed.voice1 && VOICE_NAMES.has(parsed.voice1) ? parsed.voice1 : 'Kore';
    const voice2 = parsed.voice2 && VOICE_NAMES.has(parsed.voice2) ? parsed.voice2 : 'Puck';

    const lines: DialogueLine[] = (parsed.lines ?? []).map((line) => ({
      speaker: line.speaker,
      text: line.text,
      translation: line.translation ? stripEmojis(line.translation) : undefined,
    }));

    return { success: true, title: parsed.title ?? languageLabel + ' Dialogue', lines, voice1, voice2 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── PCM → WAV conversion ─────────────────────────────────────────
function pcmToWav(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16): string {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]).toString('base64');
}

// ── Generate audio ────────────────────────────────────────────────
export async function generateAudioAction(opts: {
  apiKey: string;
  lines: DialogueLine[];
  accentInstruction: string;
  audioModel: string;
  voice1?: string;
  voice2?: string;
}): Promise<GenerateAudioResult> {
  const { apiKey, lines, accentInstruction, audioModel, voice1 = 'Kore', voice2 = 'Puck' } = opts;

  const transcript = lines.map(l => `${l.speaker}: ${stripEmojis(l.text)}`).join('\n');
  const prompt = `${accentInstruction}\n\nTTS the following conversation between Speaker1 and Speaker2:\n\n${transcript}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: audioModel,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Speaker1', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice1 } } },
              { speaker: 'Speaker2', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice2 } } },
            ],
          },
        },
      } as Record<string, unknown>,
    });

    const inlineData = res.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) throw new Error('No audio data returned.');

    let audioBase64 = inlineData.data as string;
    const mimeType = (inlineData.mimeType ?? 'audio/wav') as string;
    if (mimeType.includes('L16') || mimeType.includes('pcm')) {
      const rateMatch = mimeType.match(/rate=(\d+)/);
      audioBase64 = pcmToWav(audioBase64, rateMatch ? parseInt(rateMatch[1], 10) : 24000);
    }

    return { success: true, audioBase64 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
