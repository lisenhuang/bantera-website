'use server';

import { Type, type Schema } from '@google/genai';
import { assertDevActionEnabled } from '@/app/dev/_lib/dev-only';
import { withGeminiKey, getShuffledKeys } from '@/lib/gemini-key';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type DialogueLine = {
  speaker: 'Speaker1' | 'Speaker2';
  text: string;
};

export type GenerateDialogueResult =
  | { success: true; title: string; lines: DialogueLine[] }
  | { success: false; error: string };

export type GenerateAudioResult =
  | { success: true; audioBase64: string; mimeType: string }
  | { success: false; error: string };

export type GenerateImageResult =
  | { success: true; imageBase64: string; mimeType: string; imagePrompt: string }
  | { success: false; error: string };

export type ListModelsResult =
  | {
      success: true;
      textModels: string[];
      audioModels: string[];
      imageModels: string[];
      /** Same heuristic as text models — multimodal models used for audio-in transcription */
      transcriptionModels: string[];
    }
  | { success: false; error: string };

/** One timed cue segment from Step 5 transcription */
export type TranscriptionCueSegment = {
  startSec: number;
  endSec: number;
  speaker: string;
  text: string;
};

export type TranscribeAudioCuesResult =
  | { success: true; cues: { segments: TranscriptionCueSegment[] } }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────
// List all models via REST API
// ─────────────────────────────────────────────────────────────
type RawModel = {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
};

export async function listModelsAction(): Promise<ListModelsResult> {
  assertDevActionEnabled();
  const keys = getShuffledKeys();
  let lastError = 'No API keys configured';

  for (const key of keys) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        lastError = await res.text();
        continue;
      }
      const data = (await res.json()) as { models: RawModel[] };
      const all = data.models ?? [];

      // TTS/audio models
      const audioModels = all
        .filter(
          (m) =>
            (m.name.includes('tts') || m.name.includes('native-audio')) &&
            (m.supportedGenerationMethods ?? []).includes('generateContent'),
        )
        .map((m) => m.name);

      // Image generation models
      const imageModels = all
        .filter(
          (m) =>
            (m.name.includes('image') || m.name.includes('nano-banana')) &&
            (m.supportedGenerationMethods ?? []).includes('generateContent'),
        )
        .map((m) => m.name);

      // Text models (exclude special-purpose ones)
      const excludeKeywords = [
        'tts', 'audio', 'embed', 'image', 'video', 'aqa', 'lyria', 'veo',
        'robotics', 'predict', 'nano-banana', 'deep-research',
      ];
      const textModels = all
        .filter((m) => {
          const methods = m.supportedGenerationMethods ?? [];
          return (
            methods.includes('generateContent') &&
            !excludeKeywords.some((kw) => m.name.toLowerCase().includes(kw))
          );
        })
        .map((m) => m.name);

      const transcriptionModels = textModels;

      return { success: true, textModels, audioModels, imageModels, transcriptionModels };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { success: false, error: `All API keys failed. Last error: ${lastError}` };
}

// ─────────────────────────────────────────────────────────────
// Step 2 – Generate dialogue with title
// ─────────────────────────────────────────────────────────────
export async function generateDialogueAction(opts: {
  languageLabel: string;
  accentInstruction: string;
  scenario?: string;
  textModel: string;
  targetDurationSecs?: number; // default 60
}): Promise<GenerateDialogueResult> {
  assertDevActionEnabled();
  const { languageLabel, accentInstruction, scenario, textModel, targetDurationSecs = 60 } = opts;

  // ~130 words per minute at natural conversational pace
  const targetWords = Math.round((targetDurationSecs / 60) * 130);
  const durationLabel =
    targetDurationSecs < 60
      ? `${targetDurationSecs} seconds`
      : targetDurationSecs === 60
      ? '1 minute'
      : `${targetDurationSecs / 60} minutes`;

  const scenarioLine = scenario
    ? `The scenario is: ${scenario}`
    : 'Choose a random, interesting everyday scenario (e.g. ordering coffee, catching up after a holiday, a job interview, grocery shopping, getting lost on holiday).';

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
- Do NOT include stage directions or any text outside the dialogue.
- Also write a short, catchy title for this dialogue (max 8 words).

Return ONLY valid JSON in this exact format, no markdown fences, no extra keys:
{
  "title": "...",
  "lines": [
    { "speaker": "Speaker1", "text": "..." },
    { "speaker": "Speaker2", "text": "..." }
  ]
}
`.trim();

  try {
    const raw = await withGeminiKey(async (ai) => {
      const res = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
      });
      return res.text ?? '';
    });

    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed: { title: string; lines: DialogueLine[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse JSON from model response.');
      parsed = JSON.parse(match[0]);
    }

    return { success: true, title: parsed.title ?? languageLabel + ' Dialogue', lines: parsed.lines };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─────────────────────────────────────────────────────────────
// Helper: convert raw PCM (audio/L16) to a proper WAV file
// Gemini TTS returns raw 16-bit PCM at 24 kHz — browsers need a WAV header
// ─────────────────────────────────────────────────────────────
function pcmToWav(
  pcmBase64: string,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
): string {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);                                              // Subchunk1Size
  header.writeUInt16LE(1, 20);                                               // PCM = 1
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);    // ByteRate
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32);                 // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]).toString('base64');
}

// ─────────────────────────────────────────────────────────────
// Step 3 – Generate audio from dialogue
// ─────────────────────────────────────────────────────────────
export async function generateAudioAction(opts: {
  lines: DialogueLine[];
  accentInstruction: string;
  audioModel: string;
  voice1?: string;
  voice2?: string;
}): Promise<GenerateAudioResult> {
  assertDevActionEnabled();
  const { lines, accentInstruction, audioModel, voice1 = 'Kore', voice2 = 'Puck' } = opts;

  const transcript = lines.map((l) => `${l.speaker}: ${l.text}`).join('\n');
  const prompt = `${accentInstruction}\n\nTTS the following conversation between Speaker1 and Speaker2:\n\n${transcript}`;

  try {
    const raw = await withGeminiKey(async (ai) => {
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
      if (!inlineData?.data) throw new Error('No audio data returned from model.');
      return {
        data: inlineData.data as string,
        mimeType: (inlineData.mimeType ?? 'audio/wav') as string,
      };
    });

    // Gemini TTS often returns raw PCM (audio/L16;rate=24000).
    // Convert to a proper WAV file so the browser <audio> element can play it.
    let audioBase64 = raw.data;
    let mimeType = raw.mimeType;
    if (mimeType.includes('L16') || mimeType.includes('pcm')) {
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      audioBase64 = pcmToWav(audioBase64, sampleRate);
      mimeType = 'audio/wav';
    }

    return { success: true, audioBase64, mimeType };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─────────────────────────────────────────────────────────────
// Step 4 – Generate an image for the dialogue
// ─────────────────────────────────────────────────────────────
export async function generateImageAction(opts: {
  title: string;
  lines: DialogueLine[];
  languageLabel: string;
  imageModel: string;
}): Promise<GenerateImageResult> {
  assertDevActionEnabled();
  const { title, lines, languageLabel, imageModel } = opts;

  const summary = lines.slice(0, 4).map((l) => l.text).join(' ');
  const prompt = `Create a vivid, illustrative scene for a language learning dialogue called "${title}". The dialogue is in ${languageLabel}. The conversation is about: ${summary}. Style: warm, editorial illustration, suitable for a language learning app. No text or speech bubbles.`;

  try {
    const result = await withGeminiKey(async (ai) => {
      const res = await ai.models.generateContent({
        model: imageModel,
        contents: prompt,
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
        } as Record<string, unknown>,
      });

      const parts = (res.candidates?.[0]?.content?.parts ?? []) as unknown[];
      const imagePart = parts.find(
        (p) => (p as Record<string, unknown>).inlineData != null,
      ) as Record<string, unknown> | undefined;

      if (!imagePart?.inlineData) throw new Error('No image data returned from model.');
      const inlineData = imagePart.inlineData as { data: string; mimeType: string };
      return { imageBase64: inlineData.data, mimeType: inlineData.mimeType ?? 'image/png' };
    });

    return { success: true, ...result, imagePrompt: prompt };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // 429 means model quota exhausted — rotating keys won't help, give a clear suggestion
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      const modelShort = imageModel.replace('models/', '');
      return {
        success: false,
        error: `Quota exhausted for "${modelShort}" (free tier limit reached). Please select a different image model — try "gemini-2.5-flash-image" from the dropdown.`,
      };
    }
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────
// Step 4 (UI) – Transcribe audio with time-based cues (JSON segments)
// ─────────────────────────────────────────────────────────────

const TRANSCRIPTION_CUES_SCHEMA: Schema = {
  type: Type.OBJECT,
  description: 'Transcript of a two-speaker dialogue with per-segment timing.',
  properties: {
    segments: {
      type: Type.ARRAY,
      description: 'Ordered segments with start/end times in seconds from the start of the audio.',
      items: {
        type: Type.OBJECT,
        properties: {
          startSec: {
            type: Type.NUMBER,
            description: 'Start time in seconds (may be fractional).',
          },
          endSec: {
            type: Type.NUMBER,
            description: 'End time in seconds (may be fractional).',
          },
          speaker: {
            type: Type.STRING,
            description: 'Speaker1 or Speaker2.',
          },
          text: {
            type: Type.STRING,
            description: 'Spoken words for this segment.',
          },
        },
        required: ['startSec', 'endSec', 'speaker', 'text'],
      },
    },
  },
  required: ['segments'],
};

export async function transcribeAudioCuesAction(opts: {
  audioBase64: string;
  mimeType?: string;
  transcriptionModel: string;
  originalLines?: DialogueLine[];
}): Promise<TranscribeAudioCuesResult> {
  assertDevActionEnabled();
  const {
    audioBase64,
    mimeType = 'audio/wav',
    transcriptionModel,
    originalLines,
  } = opts;

  const hasOriginalLines = Array.isArray(originalLines) && originalLines.length > 0;
  const originalLinesJson = hasOriginalLines
    ? JSON.stringify(originalLines, null, 2)
    : null;

  const textPrompt = hasOriginalLines
    ? `You are aligning a known two-speaker dialogue script to an audio recording.

Use the provided script as ground truth.
Do not paraphrase, correct, merge, split, reorder, or omit lines.
Return exactly one segment for each script line, in the same order as the script.
Copy each speaker label and text exactly from the script.

Timing rules:
- startSec and endSec must be in seconds from the beginning of the audio
- decimals are allowed
- make timings tight, but do not cut off the final spoken word of a line
- segments must stay chronological
- if uncertain, it is better to end a cue slightly late than slightly early

Provided script:
${originalLinesJson}`
    : `You are transcribing a two-speaker dialogue recording.
Listen to the audio and produce a transcript split into time-aligned segments.
Use speaker labels "Speaker1" and "Speaker2" to match the two voices.
Each segment must have accurate startSec and endSec in seconds (decimals allowed) from the beginning of the file.
Order segments chronologically and cover all spoken content.`;

  try {
    const raw = await withGeminiKey(async (ai) => {
      const res = await ai.models.generateContent({
        model: transcriptionModel,
        contents: [
          {
            parts: [
              { text: textPrompt },
              { inlineData: { mimeType, data: audioBase64 } },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: TRANSCRIPTION_CUES_SCHEMA,
        },
      });
      return res.text ?? '';
    });

    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed: { segments: TranscriptionCueSegment[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse JSON from transcription response.');
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.segments || !Array.isArray(parsed.segments)) {
      return { success: false, error: 'Transcription response missing a valid "segments" array.' };
    }

    const normalizedSegments = parsed.segments.map((segment) => ({
      startSec: typeof segment.startSec === 'number' ? segment.startSec : Number(segment.startSec),
      endSec: typeof segment.endSec === 'number' ? segment.endSec : Number(segment.endSec),
      speaker: String(segment.speaker ?? ''),
      text: String(segment.text ?? ''),
    }));

    const cues =
      hasOriginalLines && normalizedSegments.length === originalLines!.length
        ? normalizedSegments.map((segment, index) => ({
            startSec: segment.startSec,
            endSec: segment.endSec,
            speaker: originalLines![index].speaker,
            text: originalLines![index].text,
          }))
        : normalizedSegments;

    return { success: true, cues: { segments: cues } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      const modelShort = transcriptionModel.replace('models/', '');
      return {
        success: false,
        error: `Quota exhausted for "${modelShort}" (free tier limit reached). Try another transcription model from the dropdown.`,
      };
    }
    return { success: false, error: msg };
  }
}
