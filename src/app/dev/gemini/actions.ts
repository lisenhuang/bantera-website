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

// ─────────────────────────────────────────────────────────────
// OpenAI transcription helper
// ─────────────────────────────────────────────────────────────

/** Parse duration from a WAV base64 string using the PCM header. */
function getWavDurationSec(base64: string): number {
  try {
    const buf = Buffer.from(base64, 'base64');
    if (buf.length < 44) return 0;
    const sampleRate    = buf.readUInt32LE(24);
    const channels      = buf.readUInt16LE(22);
    const bitsPerSample = buf.readUInt16LE(34);
    const dataSize      = buf.readUInt32LE(40);
    const bytesPerSec   = sampleRate * channels * (bitsPerSample / 8);
    return bytesPerSec > 0 ? dataSize / bytesPerSec : 0;
  } catch {
    return 0;
  }
}

/**
 * Pre-split dialogue lines before sending to any transcription provider.
 * A line with more than 10 words is split at . ? ! boundaries into multiple
 * lines, each inheriting the parent speaker. Lines ≤ 10 words are unchanged.
 */
function presplitLines(lines: DialogueLine[]): DialogueLine[] {
  return lines.flatMap((line) => {
    const wordCount = line.text.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 10) return [line];
    const sentences = line.text.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length <= 1) return [line];
    return sentences.map((sentence) => ({ speaker: line.speaker, text: sentence }));
  });
}

async function transcribeWithOpenAI(opts: {
  audioBase64: string;
  mimeType: string;
  model: string;
  originalLines?: DialogueLine[];
}): Promise<TranscribeAudioCuesResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { success: false, error: 'OPENAI_API_KEY is not configured on the server.' };

  const buffer = Buffer.from(opts.audioBase64, 'base64');
  const blob = new Blob([buffer], { type: opts.mimeType });

  // Only whisper-1 supports verbose_json + timestamp_granularities.
  // gpt-4o-transcribe / gpt-4o-mini-transcribe only accept 'json' or 'text'.
  const isWhisper = opts.model === 'whisper-1';

  const form = new FormData();
  form.append('file', blob, 'audio.wav');
  form.append('model', opts.model);
  if (isWhisper) {
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
  } else {
    form.append('response_format', 'json');
  }

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (err: unknown) {
    return { success: false, error: `Network error calling OpenAI: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)');
    return { success: false, error: `OpenAI API error ${res.status}: ${body}` };
  }

  const hasOriginalLines = Array.isArray(opts.originalLines) && opts.originalLines.length > 0;
  let cues: TranscriptionCueSegment[];

  if (isWhisper) {
    // verbose_json → actual segment timestamps
    const data = (await res.json()) as {
      segments?: Array<{ start: number; end: number; text: string }>;
    };
    const rawSegments = data.segments ?? [];
    if (rawSegments.length === 0) {
      return { success: false, error: 'OpenAI Whisper returned no segments. The audio may be too short or silent.' };
    }

    if (hasOriginalLines && opts.originalLines) {
      const M = rawSegments.length;
      const N = opts.originalLines.length;
      cues = opts.originalLines.map((line, i) => {
        const startIdx = Math.floor((i * M) / N);
        const endIdx   = Math.max(startIdx, Math.min(Math.floor(((i + 1) * M) / N) - 1, M - 1));
        return { startSec: rawSegments[startIdx].start, endSec: rawSegments[endIdx].end, speaker: line.speaker, text: line.text };
      });
    } else {
      cues = rawSegments.map((seg, i) => ({
        startSec: seg.start, endSec: seg.end,
        speaker: i % 2 === 0 ? 'Speaker1' : 'Speaker2',
        text: seg.text.trim(),
      }));
    }
  } else {
    // gpt-4o-transcribe / gpt-4o-mini-transcribe: json only, no segment timestamps.
    // Estimate timing proportionally from WAV duration + word counts.
    const data = (await res.json()) as { text?: string };
    const totalDuration = getWavDurationSec(opts.audioBase64);

    if (hasOriginalLines && opts.originalLines && totalDuration > 0) {
      const allWords = opts.originalLines.reduce((acc, l) => acc + l.text.split(/\s+/).filter(Boolean).length, 0);
      let cumWords = 0;
      cues = opts.originalLines.map((line) => {
        const lineWords = line.text.split(/\s+/).filter(Boolean).length;
        const startSec  = (cumWords / allWords) * totalDuration;
        cumWords += lineWords;
        const endSec = (cumWords / allWords) * totalDuration;
        return { startSec: +startSec.toFixed(3), endSec: +endSec.toFixed(3), speaker: line.speaker, text: line.text };
      });
    } else {
      cues = [{ startSec: 0, endSec: totalDuration || 0, speaker: 'Speaker1', text: data.text?.trim() ?? '' }];
    }
  }

  return { success: true, cues: { segments: cues } };
}

// ─────────────────────────────────────────────────────────────
// AssemblyAI transcription helper
// Upload → submit job with speaker_labels → poll → utterances
// ─────────────────────────────────────────────────────────────
async function transcribeWithAssemblyAI(opts: {
  audioBase64: string;
  mimeType: string;
  speechModel?: string;
  originalLines?: DialogueLine[];
}): Promise<TranscribeAudioCuesResult> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return { success: false, error: 'ASSEMBLYAI_API_KEY is not configured on the server.' };

  // 1. Upload raw audio
  const buffer = Buffer.from(opts.audioBase64, 'base64');
  let uploadUrl: string;
  try {
    const res = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: { authorization: apiKey, 'content-type': opts.mimeType },
      body: buffer,
    });
    if (!res.ok) return { success: false, error: `AssemblyAI upload error ${res.status}: ${await res.text()}` };
    ({ upload_url: uploadUrl } = await res.json() as { upload_url: string });
  } catch (err: unknown) {
    return { success: false, error: `AssemblyAI upload failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // 2. Submit transcript job with speaker diarization
  let transcriptId: string;
  try {
    const res = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: { authorization: apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        audio_url: uploadUrl,
        speaker_labels: true,
        // speech_models is required (no default). If universal-3-pro is chosen,
        // include universal-2 as fallback for languages it doesn't cover.
        speech_models: opts.speechModel === 'universal-3-pro'
          ? ['universal-3-pro', 'universal-2']
          : ['universal-2'],
      }),
    });
    if (!res.ok) return { success: false, error: `AssemblyAI submit error ${res.status}: ${await res.text()}` };
    ({ id: transcriptId } = await res.json() as { id: string });
  } catch (err: unknown) {
    return { success: false, error: `AssemblyAI submit failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // 3. Poll until completed (max ~5 minutes, every 3 s)
  type AssemblyTranscript = {
    status: 'queued' | 'processing' | 'completed' | 'error';
    utterances?: Array<{ start: number; end: number; text: string; speaker: string }>;
    error?: string;
  };

  for (let attempt = 0; attempt < 100; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    try {
      const res = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: apiKey },
      });
      if (!res.ok) continue;
      const data = await res.json() as AssemblyTranscript;

      if (data.status === 'error') {
        return { success: false, error: `AssemblyAI transcription error: ${data.error ?? 'unknown'}` };
      }

      if (data.status === 'completed') {
        const utterances = data.utterances ?? [];
        if (utterances.length === 0) {
          return { success: false, error: 'AssemblyAI returned no utterances. Try enabling speaker labels or check the audio.' };
        }

        const hasOriginalLines = Array.isArray(opts.originalLines) && opts.originalLines.length > 0;
        let cues: TranscriptionCueSegment[];

        if (hasOriginalLines && opts.originalLines) {
          // Align utterances (real timing) to original lines (ground-truth text + speakers)
          const M = utterances.length;
          const N = opts.originalLines.length;
          const lines = opts.originalLines;
          cues = lines.map((line, i) => {
            const startIdx = Math.floor((i * M) / N);
            const endIdx   = Math.max(startIdx, Math.min(Math.floor(((i + 1) * M) / N) - 1, M - 1));
            // AssemblyAI returns ms — convert to sec for our internal type
            const uStart = utterances[startIdx].start / 1000;
            const uEnd   = utterances[endIdx].end   / 1000;

            // When multiple lines share the same utterance range (M < N),
            // split the time proportionally by word count so timestamps don't collide.
            const siblings = lines
              .map((_, j) => {
                const si = Math.floor((j * M) / N);
                const ei = Math.max(si, Math.min(Math.floor(((j + 1) * M) / N) - 1, M - 1));
                return si === startIdx && ei === endIdx ? j : -1;
              })
              .filter((j) => j >= 0);

            if (siblings.length <= 1) {
              return { startSec: uStart, endSec: uEnd, speaker: line.speaker, text: line.text };
            }

            const duration = uEnd - uStart;
            const sibTexts = siblings.map((j) => lines[j].text);
            const totalWords = sibTexts.reduce((s, t) => s + (t.split(/\s+/).filter(Boolean).length), 0) || 1;
            const myOffset   = siblings.indexOf(i);
            const cumWords   = sibTexts.slice(0, myOffset).reduce((s, t) => s + (t.split(/\s+/).filter(Boolean).length), 0);
            const myWords    = line.text.split(/\s+/).filter(Boolean).length;

            return {
              startSec: +(uStart + (cumWords / totalWords) * duration).toFixed(3),
              endSec:   +(uStart + ((cumWords + myWords) / totalWords) * duration).toFixed(3),
              speaker:  line.speaker,
              text:     line.text,
            };
          });
        } else {
          // No script — use utterances directly; map A/B/… → Speaker1/Speaker2/…
          const speakerMap = new Map<string, string>();
          let counter = 1;
          cues = utterances.map((u) => {
            if (!speakerMap.has(u.speaker)) speakerMap.set(u.speaker, `Speaker${counter++}`);
            return {
              startSec: u.start / 1000,
              endSec:   u.end   / 1000,
              speaker:  speakerMap.get(u.speaker)!,
              text:     u.text,
            };
          });
        }

        return { success: true, cues: { segments: cues } };
      }
    } catch {
      // transient network error — keep polling
    }
  }

  return { success: false, error: 'AssemblyAI transcription timed out after ~5 minutes.' };
}

// ─────────────────────────────────────────────────────────────
// Cloudflare Workers AI Whisper transcription helper
// POST base64 audio → segments or word-level timestamps
// ─────────────────────────────────────────────────────────────
async function transcribeWithCloudflare(opts: {
  audioBase64: string;
  mimeType: string;
  model: string;
  originalLines?: DialogueLine[];
}): Promise<TranscribeAudioCuesResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken  = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return { success: false, error: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in .env.local' };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${opts.model}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: opts.audioBase64,
        ...(opts.originalLines && opts.originalLines.length > 0
          ? { initial_prompt: opts.originalLines.map((l) => l.text).join(' ') }
          : {}),
      }),
    });
  } catch (err: unknown) {
    return { success: false, error: `Network error calling Cloudflare AI: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)');
    return { success: false, error: `Cloudflare AI error ${res.status}: ${body}` };
  }

  // CF Whisper returns startMs/endMs (milliseconds) — not start/end in seconds.
  // It may also already include a speaker label from its own diarization.
  type CfWhisperSegment = { startMs: number; endMs: number; speaker?: string; text: string };
  type CfWhisperWord    = { word: string; start: number; end: number };
  type CfWhisperResult  = {
    result?: { text?: string; segments?: CfWhisperSegment[]; words?: CfWhisperWord[] };
    success?: boolean;
    errors?: { message: string }[];
  };

  const data = await res.json() as CfWhisperResult;

  if (data.success === false) {
    const errMsg = data.errors?.map((e) => e.message).join(', ') ?? 'Unknown Cloudflare AI error';
    return { success: false, error: errMsg };
  }

  const result = data.result;
  if (!result) {
    return { success: false, error: 'No result returned from Cloudflare AI.' };
  }

  const hasOriginalLines = Array.isArray(opts.originalLines) && opts.originalLines.length > 0;
  let cues: TranscriptionCueSegment[];

  if (result.segments && result.segments.length > 0) {
    const segs = result.segments;
    const hasTimestamps = segs.some((s) => s.startMs != null && s.endMs != null);

    if (!hasTimestamps) {
      // CF returned null timestamps — estimate proportionally from WAV duration + word counts.
      const linesToUse = hasOriginalLines && opts.originalLines ? opts.originalLines : segs.map((s, i) => ({
        speaker: s.speaker ?? (i % 2 === 0 ? 'Speaker1' : 'Speaker2'),
        text: s.text.trim(),
      }));
      const totalDuration = getWavDurationSec(opts.audioBase64);
      const allWords = linesToUse.reduce((acc, l) => acc + l.text.split(/\s+/).filter(Boolean).length, 0);
      let cumWords = 0;
      cues = linesToUse.map((line) => {
        const lineWords = line.text.split(/\s+/).filter(Boolean).length;
        const startSec  = allWords > 0 ? (cumWords / allWords) * totalDuration : 0;
        cumWords += lineWords;
        const endSec = allWords > 0 ? (cumWords / allWords) * totalDuration : totalDuration;
        return { startSec: +startSec.toFixed(3), endSec: +endSec.toFixed(3), speaker: line.speaker, text: line.text };
      });
    } else if (hasOriginalLines && opts.originalLines) {
      // Align utterances (real ms timing) to original lines (ground-truth text + speakers).
      // When M < N, multiple lines share the same utterance — split that range
      // proportionally by word count so timestamps don't collide.
      const M = segs.length;
      const N = opts.originalLines.length;
      const lines = opts.originalLines;

      cues = lines.map((line, i) => {
        const startIdx = Math.floor((i * M) / N);
        const endIdx   = Math.max(startIdx, Math.min(Math.floor(((i + 1) * M) / N) - 1, M - 1));
        const uStart = (segs[startIdx].startMs ?? 0) / 1000;
        const uEnd   = (segs[endIdx].endMs   ?? 0) / 1000;

        const siblings = lines
          .map((_, j) => {
            const si = Math.floor((j * M) / N);
            const ei = Math.max(si, Math.min(Math.floor(((j + 1) * M) / N) - 1, M - 1));
            return si === startIdx && ei === endIdx ? j : -1;
          })
          .filter((j) => j >= 0);

        if (siblings.length <= 1) {
          return { startSec: uStart, endSec: uEnd, speaker: line.speaker, text: line.text };
        }

        const duration  = uEnd - uStart;
        const sibTexts  = siblings.map((j) => lines[j].text);
        const totalWords = sibTexts.reduce((s, t) => s + (t.split(/\s+/).filter(Boolean).length), 0) || 1;
        const myOffset  = siblings.indexOf(i);
        const cumWords  = sibTexts.slice(0, myOffset).reduce((s, t) => s + (t.split(/\s+/).filter(Boolean).length), 0);
        const myWords   = line.text.split(/\s+/).filter(Boolean).length;

        return {
          startSec: +(uStart + (cumWords / totalWords) * duration).toFixed(3),
          endSec:   +(uStart + ((cumWords + myWords) / totalWords) * duration).toFixed(3),
          speaker:  line.speaker,
          text:     line.text,
        };
      });
    } else {
      // No script — use CF segments directly; convert ms → sec.
      cues = segs.map((seg, i) => ({
        startSec: (seg.startMs ?? 0) / 1000,
        endSec:   (seg.endMs   ?? 0) / 1000,
        speaker:  seg.speaker ?? (i % 2 === 0 ? 'Speaker1' : 'Speaker2'),
        text:     seg.text.trim(),
      }));
    }
  } else if (result.words && result.words.length > 0) {
    // Old whisper model returns word-level timestamps in seconds.
    const words = result.words;
    if (hasOriginalLines && opts.originalLines) {
      const M = words.length;
      const N = opts.originalLines.length;
      const lines = opts.originalLines;

      cues = lines.map((line, i) => {
        const startIdx = Math.floor((i * M) / N);
        const endIdx   = Math.max(startIdx, Math.min(Math.floor(((i + 1) * M) / N) - 1, M - 1));
        const uStart = words[startIdx].start;
        const uEnd   = words[endIdx].end;

        const siblings = lines
          .map((_, j) => {
            const si = Math.floor((j * M) / N);
            const ei = Math.max(si, Math.min(Math.floor(((j + 1) * M) / N) - 1, M - 1));
            return si === startIdx && ei === endIdx ? j : -1;
          })
          .filter((j) => j >= 0);

        if (siblings.length <= 1) {
          return { startSec: uStart, endSec: uEnd, speaker: line.speaker, text: line.text };
        }

        const duration   = uEnd - uStart;
        const sibTexts   = siblings.map((j) => lines[j].text);
        const totalWords = sibTexts.reduce((s, t) => s + (t.split(/\s+/).filter(Boolean).length), 0) || 1;
        const myOffset   = siblings.indexOf(i);
        const cumWords   = sibTexts.slice(0, myOffset).reduce((s, t) => s + (t.split(/\s+/).filter(Boolean).length), 0);
        const myWords    = line.text.split(/\s+/).filter(Boolean).length;

        return {
          startSec: +(uStart + (cumWords / totalWords) * duration).toFixed(3),
          endSec:   +(uStart + ((cumWords + myWords) / totalWords) * duration).toFixed(3),
          speaker:  line.speaker,
          text:     line.text,
        };
      });
    } else {
      const totalDuration = words[words.length - 1]?.end ?? 0;
      cues = [{ startSec: 0, endSec: totalDuration, speaker: 'Speaker1', text: result.text?.trim() ?? '' }];
    }
  } else {
    return { success: false, error: 'Cloudflare Whisper returned no segments or words. The audio may be too short or silent.' };
  }

  return { success: true, cues: { segments: cues } };
}

// ─────────────────────────────────────────────────────────────
// Rev.ai Forced Alignment helper
// Multipart POST (audio binary + transcript_text) → poll → word timestamps → map to lines
// ─────────────────────────────────────────────────────────────
async function transcribeWithRevAI(opts: {
  audioBase64: string;
  mimeType: string;
  language?: string;  // e.g. 'en', 'zh', 'ja'
  originalLines?: DialogueLine[];
}): Promise<TranscribeAudioCuesResult> {
  const apiToken = process.env.REVAI_ACCESS_TOKEN;
  if (!apiToken) return { success: false, error: 'REVAI_ACCESS_TOKEN is not configured in .env.local' };

  const hasOriginalLines = Array.isArray(opts.originalLines) && opts.originalLines.length > 0;

  // transcript_text: plain text of all lines joined — Rev.ai aligns each word
  const transcriptText = hasOriginalLines && opts.originalLines
    ? opts.originalLines.map((l) => l.text).join(' ')
    : '';

  if (!transcriptText.trim()) {
    return { success: false, error: 'Rev.ai forced alignment requires dialogue lines (transcript text).' };
  }

  // Rev.ai uses BCP-47 base codes; strip region suffix (en-US → en, zh → zh)
  const revaiLang = (opts.language ?? 'en').split('-')[0];

  // 1. Submit alignment job via multipart/form-data
  const buffer = Buffer.from(opts.audioBase64, 'base64');
  const form = new FormData();
  form.append('media', new Blob([buffer], { type: opts.mimeType }), 'audio');
  form.append('options', new Blob([JSON.stringify({ transcript_text: transcriptText, language: revaiLang })], { type: 'application/json' }));

  let jobId: string;
  try {
    const res = await fetch('https://api.rev.ai/alignment/v1/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)');
      return { success: false, error: `Rev.ai submit error ${res.status}: ${body}` };
    }
    ({ id: jobId } = await res.json() as { id: string });
  } catch (err: unknown) {
    return { success: false, error: `Rev.ai submit failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // 2. Poll until status === 'completed' (max ~5 min, every 3 s)
  type RevJob = { id: string; status: 'in_progress' | 'completed' | 'failed'; failure_detail?: string };
  for (let attempt = 0; attempt < 100; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    try {
      const res = await fetch(`https://api.rev.ai/alignment/v1/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!res.ok) continue;
      const job = await res.json() as RevJob;
      if (job.status === 'failed') {
        return { success: false, error: `Rev.ai job failed: ${job.failure_detail ?? 'unknown'}` };
      }
      if (job.status !== 'completed') continue;

      // 3. Fetch transcript (word-level forced alignment)
      const tRes = await fetch(`https://api.rev.ai/alignment/v1/jobs/${jobId}/transcript`, {
        headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/vnd.rev.transcript.v1.0+json' },
      });
      if (!tRes.ok) {
        return { success: false, error: `Rev.ai transcript fetch error ${tRes.status}` };
      }

      type RevElement = { type: 'text' | 'punct' | 'unknown'; value: string; ts?: number; end_ts?: number };
      type RevMonologue = { speaker: number; elements: RevElement[] };
      type RevTranscript = { monologues: RevMonologue[] };

      const transcript = await tRes.json() as RevTranscript;

      // Flatten all words (type === 'text') with timestamps
      const words: { value: string; ts: number; end_ts: number }[] = [];
      for (const mono of transcript.monologues ?? []) {
        for (const el of mono.elements ?? []) {
          if (el.type === 'text' && el.ts != null && el.end_ts != null) {
            words.push({ value: el.value, ts: el.ts, end_ts: el.end_ts });
          }
        }
      }

      if (words.length === 0) {
        return { success: false, error: 'Rev.ai returned no word timestamps.' };
      }

      // Map words back to original lines by word count
      const lines = hasOriginalLines && opts.originalLines ? opts.originalLines : [];
      if (lines.length === 0) {
        // No original lines — return single cue spanning all words
        return {
          success: true,
          cues: { segments: [{ startSec: words[0].ts, endSec: words[words.length - 1].end_ts, speaker: 'Speaker1', text: transcriptText }] },
        };
      }

      // Build per-line word counts, then assign words to lines
      const lineWordCounts = lines.map((l) => l.text.split(/\s+/).filter(Boolean).length);
      const totalLineWords = lineWordCounts.reduce((a, b) => a + b, 0);

      // Scale: our word count may differ from Rev.ai's (punctuation stripped etc).
      // Use proportional assignment: line i gets a slice of words proportional to its word share.
      const cues: TranscriptionCueSegment[] = [];
      let wordCursor = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineFraction = lineWordCounts[i] / totalLineWords;
        const lineWordCount = Math.max(1, Math.round(lineFraction * words.length));
        const startIdx = Math.min(wordCursor, words.length - 1);
        const endIdx   = Math.min(wordCursor + lineWordCount - 1, words.length - 1);
        cues.push({
          startSec: +words[startIdx].ts.toFixed(3),
          endSec:   +words[endIdx].end_ts.toFixed(3),
          speaker:  lines[i].speaker,
          text:     lines[i].text,
        });
        wordCursor += lineWordCount;
      }
      // Ensure last line stretches to the final word
      if (cues.length > 0) {
        cues[cues.length - 1].endSec = +words[words.length - 1].end_ts.toFixed(3);
      }

      return { success: true, cues: { segments: cues } };
    } catch {
      // transient network error — keep polling
    }
  }

  return { success: false, error: 'Rev.ai alignment timed out after ~5 minutes.' };
}

// ─────────────────────────────────────────────────────────────
// Speechmatics Forced Alignment helper
// Multipart POST (audio + text file, one line per cue) → poll → one_per_line timestamps
// ─────────────────────────────────────────────────────────────
async function transcribeWithSpeechmatics(opts: {
  audioBase64: string;
  mimeType: string;
  language?: string;
  originalLines?: DialogueLine[];
}): Promise<TranscribeAudioCuesResult> {
  const apiKey = process.env.SPEECHMATICS_API_KEY;
  if (!apiKey) return { success: false, error: 'SPEECHMATICS_API_KEY is not configured in .env.local' };

  const hasOriginalLines = Array.isArray(opts.originalLines) && opts.originalLines.length > 0;
  if (!hasOriginalLines || !opts.originalLines) {
    return { success: false, error: 'Speechmatics alignment requires dialogue lines.' };
  }

  const lines = opts.originalLines;
  const lang = (opts.language ?? 'en').split('-')[0];

  // text_file: one plain-text line per cue (no speaker labels)
  const transcriptText = lines.map((l) => l.text).join('\n');

  // 1. Submit alignment job (multipart)
  const buffer = Buffer.from(opts.audioBase64, 'base64');
  const form = new FormData();
  form.append('config', JSON.stringify({
    type: 'alignment',
    alignment_config: { language: lang },
  }));
  form.append('data_file', new Blob([buffer], { type: opts.mimeType }), 'audio');
  form.append('text_file', new Blob([transcriptText], { type: 'text/plain' }), 'transcript.txt');

  const BASE = 'https://asr.api.speechmatics.com';

  let jobId: string;
  try {
    const res = await fetch(`${BASE}/v2/jobs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)');
      return { success: false, error: `Speechmatics submit error ${res.status}: ${body}` };
    }
    ({ id: jobId } = await res.json() as { id: string });
  } catch (err: unknown) {
    return { success: false, error: `Speechmatics submit failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // 2. Poll until done (max ~5 min, every 3 s)
  type SmJob = { job: { id: string; status: 'running' | 'done' | 'rejected' | 'deleted'; errors?: { message: string }[] } };
  for (let attempt = 0; attempt < 100; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    try {
      const res = await fetch(`${BASE}/v2/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) continue;
      const data = await res.json() as SmJob;
      const job = data.job;

      if (job.status === 'rejected') {
        return { success: false, error: `Speechmatics job rejected: ${job.errors?.map((e) => e.message).join(', ') ?? 'unknown'}` };
      }
      if (job.status !== 'done') continue;

      // 3. Fetch alignment result — one_per_line format: "[HH:MM:SS.s] text"
      const aRes = await fetch(`${BASE}/v2/jobs/${jobId}/alignment?tags=one_per_line`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!aRes.ok) {
        return { success: false, error: `Speechmatics alignment fetch error ${aRes.status}: ${await aRes.text().catch(() => '')}` };
      }

      const alignText = await aRes.text();

      // Parse "[HH:MM:SS.s] text" → startSec
      const parseTs = (ts: string): number => {
        const [h, m, s] = ts.split(':').map(Number);
        return h * 3600 + m * 60 + s;
      };

      const parsed: { startSec: number }[] = [];
      for (const row of alignText.trim().split('\n')) {
        const match = row.match(/^\[(\d{2}:\d{2}:\d{2}\.\d+)\]/);
        if (match) parsed.push({ startSec: parseTs(match[1]) });
      }

      if (parsed.length === 0) {
        return { success: false, error: 'Speechmatics returned no aligned lines.' };
      }

      // endSec = next line's startSec; last line ends at WAV duration
      const totalDuration = getWavDurationSec(opts.audioBase64);
      const cues: TranscriptionCueSegment[] = parsed.map((p, i) => ({
        startSec: +p.startSec.toFixed(3),
        endSec:   +(i < parsed.length - 1 ? parsed[i + 1].startSec : totalDuration).toFixed(3),
        speaker:  lines[i]?.speaker ?? (i % 2 === 0 ? 'Speaker1' : 'Speaker2'),
        text:     lines[i]?.text ?? '',
      }));

      return { success: true, cues: { segments: cues } };
    } catch {
      // transient network error — keep polling
    }
  }

  return { success: false, error: 'Speechmatics alignment timed out after ~5 minutes.' };
}

export async function transcribeAudioCuesAction(opts: {
  audioBase64: string;
  mimeType?: string;
  transcriptionModel: string;
  originalLines?: DialogueLine[];
  /** 'gemini' (default), 'openai', 'assemblyai', 'cloudflare', 'revai', or 'speechmatics' */
  provider?: 'gemini' | 'openai' | 'assemblyai' | 'cloudflare' | 'revai' | 'speechmatics';
  /** AssemblyAI speech model — 'universal-2' (default) or 'universal-3-pro' */
  assemblyAiSpeechModel?: string;
  language?: string;
  includeScript?: boolean;
}): Promise<TranscribeAudioCuesResult> {
  assertDevActionEnabled();
  const {
    audioBase64,
    mimeType = 'audio/wav',
    transcriptionModel,
    originalLines,
    provider = 'gemini',
    assemblyAiSpeechModel,
    language,
    includeScript = true,
  } = opts;

  // Pre-split long lines (>10 words) at sentence boundaries before sending to any provider.
  const splitLines = (originalLines && includeScript) ? presplitLines(originalLines) : undefined;

  // ── OpenAI branch ──
  if (provider === 'openai') {
    return transcribeWithOpenAI({ audioBase64, mimeType, model: transcriptionModel, originalLines: splitLines });
  }

  // ── AssemblyAI branch ──
  if (provider === 'assemblyai') {
    return transcribeWithAssemblyAI({ audioBase64, mimeType, speechModel: assemblyAiSpeechModel, originalLines: splitLines });
  }

  // ── Cloudflare Workers AI branch ──
  if (provider === 'cloudflare') {
    return transcribeWithCloudflare({ audioBase64, mimeType, model: transcriptionModel, originalLines: splitLines });
  }

  // ── Rev.ai Forced Alignment branch ──
  if (provider === 'revai') {
    return transcribeWithRevAI({ audioBase64, mimeType, language, originalLines: splitLines });
  }

  // ── Speechmatics Forced Alignment branch ──
  if (provider === 'speechmatics') {
    return transcribeWithSpeechmatics({ audioBase64, mimeType, language, originalLines: splitLines });
  }

  const hasOriginalLines = Array.isArray(splitLines) && splitLines.length > 0;
  const originalLinesJson = hasOriginalLines
    ? JSON.stringify(splitLines, null, 2)
    : null;

  const textPrompt = hasOriginalLines
    ? `You are aligning a known two-speaker dialogue script to an audio recording.

Use the provided script as ground truth. Return exactly one segment per script line, in the same order.
Copy each speaker label and text exactly from the script — do not paraphrase, correct, merge, split, reorder, or omit lines.

Timing rules:
- startSec and endSec must be in seconds from the beginning of the audio (decimals allowed).
- Timings must be chronological and must not overlap.
- Make timings tight — do not cut off the final spoken word of a segment.
- If uncertain, end a cue slightly late rather than slightly early.

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

    // Trust the AI's output directly — speaker labels and text are copied verbatim
    // from the script by the prompt, and segments may be more than originalLines
    // when long lines are split at sentence boundaries.
    const cues = normalizedSegments;

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
