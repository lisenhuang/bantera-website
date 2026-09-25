# Bantera at Ruby Nights

Open `/ruby-nights`. This is an independent copy of the browser presentation for Ruby Nights. Refine this route, its narration script and its media without changing `/presentation`.

The cover identifies Ruby Nights Auckland and 19 Oct 2026. The rest of the slides retain the original story and can be tailored for this audience.

## Presenting

- Right / Space / Page Down: next step. The church slide first reveals the answer, then advances.
- Left / Page Up: previous step. On the revealed church slide it hides the answer first.
- Home / End: first / last slide.
- F: full screen, when supported by the browser.
- O: slide overview. Each slide also has a shareable URL fragment.
- N: speaker cues. These appear on the same screen, so hide them before presenting to the audience.
- Escape: close overview and cues. Browser full-screen exit also follows normal browser behaviour.

## Adding the remaining media

Place supplied files in `public/ruby-nights/` and update `media` in `content.ts`:

- `demo`: supplied recording, encoded as H.265 MP4 with an H.264 fallback and poster configured in `demoVideo`. Both versions are 720 × 1474, 30 fps, with the original AAC audio retained.
- `deployment`: OpenClaw / Ubuntu deployment screenshot.
- `backup`: OpenClaw database-backup screenshot showing the actual result.
- `closing`: optional final photograph.

Use URLs such as `/ruby-nights/bantera-demo.mp4`. Missing media stays as an intentional placeholder. The video has native playback controls and does not autoplay. Leaving its slide unmounts the player and stops playback.

All slides share a warm light background. The closing English passage uses a deeper gold for contrast on the light background.

The presentation is in English, with a bilingual closing passage: a prominent English adaptation above the original Traditional Chinese passage supplied by the presenter, displayed in smaller neutral text on two lines. The singer’s name appears as 黃家駒 · Wong Ka Kui, with a link to the official music video. The English reads “The world is more beautiful when all its colours come together.” It is labelled as inspired by the lyrics of Glorious Years, rather than an official or line-by-line translation. The separate reflection below is the presenter’s own thought about accents and friendship.

## Content evidence

Architecture and pipeline checked against the Flutter app configuration, backend project and generation endpoints, and website routes. The deployment and OpenClaw examples reflect the presenter's account and supplied screenshots. Current backend dialogue prompts favour everyday regional wording and discourage heavy slang, so the photo slide describes the personal story without promising a dedicated slang feature.

## Demo compression

Source: `ScreenRecording_09-17-2026 11-03-54_1.mov` (5,582,987 bytes, 1206 × 2468, approximately 60 fps, 10.54 seconds). The original is unchanged.

- H.265: `bantera-demo-hevc.mp4`, 287,752 bytes, libx265 CRF 25, hvc1 tag.
- H.264 fallback: `bantera-demo.mp4`, 311,398 bytes, libx264 CRF 24.
- Both use Lanczos scaling to 720 × 1474 with the original aspect ratio preserved through sample aspect ratio, 30 fps, yuv420p limited range, copied AAC audio and fast-start MP4 metadata.
- Poster: `bantera-demo-poster.jpg`, extracted at one second.

## App feature screenshots

Five slides follow the recorded demo, before the technical section. The deck now has 19 slides.

- `#language-accents`: `IMG_6321.jpg`, copied to `language-accents.jpg`. Shows nine regional English options.
- `#discover`: supplied Discover screenshot, copied to `discover.jpg`. Shows a New Zealand English audio feed and search.
- `#ai-scenarios`: `IMG_6322.jpg`, copied to `ai-scenarios.jpg`. Shows 15 preset scenarios plus Custom.
- `#chats`: supplied Chats screenshot, copied to `chats.jpg`. Shows language spaces and direct conversations. The visible names do not establish anyone's language background.
- `#voice-exchange`: `IMG_6324.jpg`, copied to `voice-exchange.jpg`. Shows voice messages, transcription controls and recording. The presenter supplied the explanation of voice-only sending and translation support. The Chinese/English exchange in the slide text is an illustrative example, not a claim about the named contact in the screenshot.

The supplied screenshots retain their original pixels and proportions. The slide background stays light; the dark interface is part of the original app screenshots.

The `#pipeline` slide uses `IMG_6326.jpg`, copied unchanged to `ai-pipeline.jpg`. The four stages shown alongside it reflect the backend's primary path: Gemini text generates the original dialogue, Gemini TTS generates speech, Gemini transcription returns word timestamps, and the backend matches those words back to the script. The last stage uses exact character matches first, then a Gemini text model only for mismatches. The app groups transcription and matching as “Aligning audio”, which is still in progress in the screenshot. If Gemini timing fails, the backend can fall back to Rev.ai or estimated timing, depending on the endpoint and language.

The `#mcp` and `#skills` slides follow the three-codebase overview, before deployment. `mcp-language-snapshot.png` and `chatgpt-bantera-skills.png` are unaltered copies of the supplied screenshots. The MCP slide shows the entire ChatGPT screenshot and repeats the request in larger text so the MCP interaction remains clear at presentation size. It describes the backend's OAuth-protected `/mcp` endpoint and its separate read/write permissions. The snapshot is dated 24 September 2026 and is an example, not live data. The skills slide uses a CSS crop to focus on the two local Bantera ChatGPT skills: ChatGPT researches and writes lesson content, Gemini makes the speech and transcription, and MCP submits the completed audio lesson to the backend.

The `#deployment` slide includes the supplied OpenClaw conversation in `openclaw-deployment.png`. A CSS crop focuses on the first deployment request and its report, excluding the unrelated sidebar and adjacent conversations. The original screenshot file remains intact. The database backup screenshot is included on the following slide.

The `#backup` slide uses `openclaw-daily-backup.png`. Two CSS excerpts show the 16 and 17 September SQL ZIP attachment deliveries at 5 a.m. The daily cron schedule and availability in chat reflect the presenter’s account. The screenshot demonstrates delivery, not restore testing. The source image is retained unchanged.

## Narrated autoplay

Use **Autoplay** to start from the current slide. Use Home first to start the whole presentation. **Pause / Resume** preserve the current recording position, and **Stop** returns control to the presenter. Arrow navigation and Escape stop playback. The Audio speed button cycles through 0.75×, 1×, 1.25×, 1.5×, 1.75× and 2×. Changes apply immediately to narration, preserving pitch, and carry across slides. Videos always start at 1×; the audio speed control does not affect them or the between-clip pauses. Narration is labelled as AI narration.

The church story has separate question, answer, laughter and reflection clips. The answer stays hidden during the question, then appears when its recording starts. The demo has narration before and after the existing video; no narration overlaps the video. Transitions follow media completion rather than estimated reading time. Browser playback restrictions surface a Resume prompt.

The editable script is `scripts/ruby-nights-narration.json`. Static MP3s are in `public/ruby-nights/narration/`; the playback manifest is `src/app/ruby-nights/narration.json`. `scripts/generate-ruby-nights-narration.py` reads a local backend credential or `GEMINI_API_KEY` at generation time only, and never writes credentials to the output. It generates the Charon voice with a warm male delivery prompt, normalises loudness, and uses cached outputs when the script is unchanged. It sends narration text to Google's Gemini API. Playback requires no Gemini connection or API key.

Generation status: all 23 audio clips are ready across 19 slides, including the MCP and skills slides. The sweet-as story says “I met a Kiwi” and uses she/her. The garage story says seventy percent, matching the 70% displayed on the slide. Updated recordings have fingerprinted URLs to avoid stale browser audio.
