'use server';

import { GoogleGenAI } from '@google/genai';

// ── Types ─────────────────────────────────────────────────────────
export type DialogueLine = { speaker: 'Speaker1' | 'Speaker2'; text: string; translation?: string };

export type ListModelsResult =
  | { success: true; textModels: string[]; audioModels: string[] }
  | { success: false; error: string };

export type GenerateDialogueResult =
  | { success: true; title: string; lines: DialogueLine[] }
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

  const jsonTemplate = translationTargetLabel
    ? `{\n  "title": "...",\n  "lines": [\n    { "speaker": "Speaker1", "text": "...", "translation": "..." },\n    { "speaker": "Speaker2", "text": "...", "translation": "..." }\n  ]\n}`
    : `{\n  "title": "...",\n  "lines": [\n    { "speaker": "Speaker1", "text": "..." },\n    { "speaker": "Speaker2", "text": "..." }\n  ]\n}`;

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
- Also write a short, catchy title for this dialogue (max 8 words).

Return ONLY valid JSON in this exact format, no markdown fences, no extra keys:
${jsonTemplate}
`.trim();

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({ model: textModel, contents: prompt });
    const raw = res.text ?? '';

    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    let parsed: { title: string; lines: DialogueLine[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse response from AI.');
      parsed = JSON.parse(match[0]);
    }
    return { success: true, title: parsed.title ?? languageLabel + ' Dialogue', lines: parsed.lines };
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

  const transcript = lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
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
