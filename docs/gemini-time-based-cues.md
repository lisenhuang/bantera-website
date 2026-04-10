# Time-based transcription cues (Gemini)

This describes how the **Bantera website** dev tool turns **audio** into **time-aligned transcript segments** using the Gemini API. The UI lives at **`/dev/gemini`** (Step 5).

## What you get

For each spoken segment, the model returns JSON with:

| Field       | Meaning |
|------------|---------|
| `startSec` | Start time in **seconds** from the beginning of the file (decimals allowed). |
| `endSec`   | End time in seconds. |
| `speaker`  | `Speaker1` or `Speaker2` (two-speaker dialogue). |
| `text`     | Transcript for that segment. |

Segments are ordered chronologically.

## Prerequisites

1. **Environment:** `GEMINI_API_KEYS` in `.env.local` (comma-separated API keys), as used elsewhere on the site.
2. **Audio source in this flow:** Step 3 produces a **WAV** (from Gemini TTS). Step 5 sends that same audio to a **transcription** model—not the TTS model.

## Using the UI (`/dev/gemini`)

1. **Step 1** — Pick language, **text**, **TTS**, and **image** models as usual. Choose a **transcription model** appears in **Step 5** (same pool as “text” models: multimodal Gemini models, not TTS-only).
2. **Step 2** — Generate a dialogue (or use the script you care about).
3. **Step 3** — **Generate Audio**. Wait until the player shows **Audio Ready** and optional download works. This is the file Step 5 will transcribe.
4. **Step 5** — Select **Transcription model**, then click **Generate time-based cues**.
5. Review the **table**, use **Copy JSON**, or expand **Raw JSON** for the full payload.

If Step 3 is missing, Step 5 explains that you need audio first.

**Note:** Cues are cleared when you generate a **new dialogue** or **new audio**, so the transcript always matches the current clip.

## How it works (implementation sketch)

- **Server action:** `transcribeAudioCuesAction` in `src/app/dev/gemini/actions.ts`.
- The WAV is sent as **`inlineData`** (base64) with MIME type `audio/wav` (default).
- The request uses **`generateContent`** with:
  - `responseMimeType: application/json`
  - A **response schema** requiring `{ "segments": [ … ] }` with the fields above.
- Keys are rotated via `withGeminiKey` like other Gemini calls on this page.

This follows Google’s **audio-in → structured JSON-out** pattern (see [Audio understanding](https://ai.google.dev/gemini-api/docs/audio)). We do **not** depend on Vertex-only flags for timestamp injection; timing comes from the model plus the schema and prompt.

## Payload limits

`next.config.ts` sets **`experimental.serverActions.bodySizeLimit`** (e.g. **10mb**) so large base64 WAVs from long dialogues do not hit the default Server Action body limit.

## Quotas and errors

If the API returns quota or rate errors, the UI surfaces a short message suggesting **another transcription model** from the dropdown. Rotating `GEMINI_API_KEYS` can help for key-level limits, but **per-model** quotas still apply.

## Integrating elsewhere

To reuse the same behavior outside this page:

1. Call `transcribeAudioCuesAction` with `{ audioBase64, mimeType?, transcriptionModel }`.
2. Ensure the model ID is a **multimodal** Gemini model that supports **audio input** and `generateContent` (the dev page lists these under “Transcription model”).

For arbitrary files, convert to a supported MIME (e.g. WAV/MP3 per Gemini docs) and pass matching `mimeType` if not WAV.
