# 🌐 Bantera — Website & Admin Dashboard

> **Introduction site, web practice platform, and admin dashboard** for the Bantera language learning app.

[![App Store](https://img.shields.io/badge/App_Store-Download-blue?logo=apple&logoColor=white)](https://apps.apple.com/app/id6761799720)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)

---

## 🔗 Related Repositories

| Repo | Description |
|---|---|
| [**bantera**](https://github.com/lisenhuang/bantera) | Flutter iOS app |
| [**bantera-backend**](https://github.com/lisenhuang/bantera-backend) | .NET REST API backend |
| **This repo** | Next.js website + admin dashboard (you are here) |

---

## 🗺️ Site Map

This project serves four distinct audiences from one codebase:

```
bantera.app/
├── /                      ← Introduction homepage (iOS app CTA) → https://bantera.app
├── /privacy               ← Privacy policy
├── /support               ← Support page
│
├── /webapp                ← Public web practice platform → https://bantera.app/webapp?languageCode=en-NZ
│   ├── /                  ← Browse audio by language
│   ├── /[videoId]         ← Cue-by-cue practice player
│   └── /studio            ← AI dialogue & audio generator
│
├── /dashboard             ← Admin dashboard (JWT-protected)
│   ├── /login             ← Email/password login
│   ├── /                  ← Platform stats overview
│   ├── /users             ← User management
│   ├── /users/[id]        ← User detail & role editor
│   └── /videos            ← Content moderation
│
└── /dev                   ← Internal dev tools
    ├── /gemini            ← 5-step AI dialogue studio
    ├── /revai             ← Rev.ai transcription tester
    └── /cloudflare        ← Cloudflare AI image tester
```

---

## ✨ Feature Highlights

| Area | Feature |
|---|---|
| 🏠 **Introduction** | Hero, features grid, how-it-works, and iOS download CTA |
| 🎧 **Web Practice** | Browse public audio; practice cue-by-cue with transcript reveal |
| 🤖 **AI Studio** | Generate dialogues, synthesize TTS audio, and produce word-level transcription cues — all in-browser |
| 🛡️ **Admin Dashboard** | Manage users, moderate content, and view platform stats |
| 🌙 **Dark Mode** | Class-based, with system preference detection and no flash on load |
| 🌐 **Multi-Provider AI** | Gemini, OpenAI, AssemblyAI, Cloudflare, Rev.ai, Speechmatics |

---

## SEO, GEO, and WebMCP

The website supports three kinds of discovery: search engines finding public pages
(**SEO**, search engine optimization), AI answer engines understanding and citing the
product (**GEO**, generative engine optimization), and browser agents using the public
practice experience through **WebMCP**. The features below are implemented in this
codebase; deployment, crawler access, and browser compatibility determine availability.

### SEO: searchable pages and structured content

- **Page metadata and sharing previews:** the root layout supplies a title, description,
  canonical base URL, icons, Open Graph metadata, and Twitter card metadata. Public pages
  define their own titles and canonical paths. Language guides and lesson pages also
  supply page-specific sharing metadata; lessons can use their cover image. A generated
  Open Graph image provides the default sharing preview.
- **Structured data:** JSON-LD describes the `Organization` and `WebSite` globally,
  `MobileApplication` on the homepage, `FAQPage` on the FAQ, `WebPage` on language guides,
  and `LearningResource` with an associated `AudioObject` on lesson pages. Lesson data
  includes language, duration, creation date, and a transcript excerpt capped at 5,000
  characters. Pricing and aggregate ratings are not invented.
- **Crawl discovery:** `/robots.txt` allows public crawling, including AI crawlers under
  the same wildcard rule, while excluding `/dashboard/`, `/dev/`, and `/api/`.
  `/sitemap.xml` lists stable public pages and the ten language guides without fabricated
  modification dates. Individual lessons and duplicate legacy player URLs are not listed
  in the sitemap; public lessons are discoverable through HTML links from browsing and
  guide pages. The dashboard layout also specifies `noindex`, and developer routes return
  not found in production.
- **Useful public content:** `/learn` lists the supported learning-language catalogue.
  Ten authored guides cover Spanish, French, Mandarin Chinese, Japanese, Korean, German,
  Italian, Portuguese, Arabic, and English, with practice advice and links to available
  lessons. Canonical lesson pages at `/webapp/shadowing/{id}` render explanatory text and
  a full transcript in an expandable HTML section, readable without JavaScript.

The guides are written in English about learning other languages. This is not a
translated website, and the code does not declare `hreflang` alternates.

Implementation: [root metadata and entities](src/app/layout.tsx),
[sharing image](src/app/opengraph-image.tsx), [robots](src/app/robots.ts),
[sitemap](src/app/sitemap.ts), [language guides](src/lib/language-guides.ts), and
[lesson metadata and transcript](src/app/webapp/shadowing/[audioId]/page.tsx).

### GEO: consistent facts for AI answer engines

- **Shared product facts:** `src/lib/site-content.ts` holds the product summary,
  supported languages, public page directory, contact details, and FAQ answers. The FAQ,
  model-readable references, and site-wide WebMCP tools reuse those facts.
- **Answer-first FAQ:** `/faq` publishes direct answers and matching `FAQPage` JSON-LD.
  The copy explains the practice method and distinguishes transcription comparison from
  a pronunciation accuracy score.
- **Model-readable references:** `/llms.txt` is a concise Markdown introduction with
  platform links, key facts, and a public page index. `/llms-full.txt` adds all FAQ answers
  and a live public lesson sample of up to ten recent lessons per language section,
  including links, duration, cue count, AI-generated status, and a first-cue preview.
  The full reference de-duplicates lesson IDs and omits lessons without practice cues.
- **Content that can be cited:** language guides and lesson transcripts provide actual
  learning content alongside product descriptions. Lesson pages disclose AI-generated
  audio when applicable.

These features make the content easier to access and interpret. They do not guarantee
search ranking, rich results, inclusion in AI answers, or citations. `llms.txt` is a
supplementary reference, not a requirement that every AI crawler follows.

Implementation: [shared facts](src/lib/site-content.ts), [FAQ](src/app/faq/page.tsx),
[llms.txt](src/app/llms.txt/route.ts), and [llms-full.txt](src/app/llms-full.txt/route.ts).

### WebMCP: browser agents can use public practice tools

WebMCP exposes named tools to an agent running in a compatible browser on the page.
It is separate from the backend MCP server and does not grant admin or publishing access.

| Scope | Tools | Purpose |
|---|---|---|
| Public pages | `get_site_overview`, `get_faq` | Read product facts and optionally filter FAQ answers. |
| Public pages | `list_practice_languages`, `find_lessons` | Read the practice language catalogue and search public lessons by language code, optional title search, and result limit. |
| Public pages | `open_lesson`, `open_page` | Navigate to a lesson or an allowlisted public page. |
| Audio browser | `load_public_audio` | Declarative GET form that selects a browsing language group and combines accents; Taiwan visibility depends on the visitor's country and system language. |
| Open lesson | `get_lesson`, `get_lesson_transcript` | Read lesson details, current playback state, and timed cues in the selected cue mode. |
| Open lesson | `play_cue`, `pause_playback`, `set_playback_speed` | Play one indexed cue, pause audio, or choose 0.5×, 0.75×, 1×, or 1.25× speed. |
| Open lesson | `set_transcript_visible`, `set_cue_mode` | Show or hide text; switch long/short cues when short cues are available. |

The imperative search tools currently use catalogue language codes such as `en-US`;
the declarative browsing form uses group codes such as `en`, `yue`, and `zh-cn`.
The shared website catalogue hides Taiwan Chinese (`zh-TW`, including script/underscore
variants) for mainland China IPs or a primary Simplified Chinese browser/system language.
It stays hidden when the IP country is unknown. Browsing reads Cloudflare's `CF-IPCountry`
and the primary `Accept-Language` preference, then checks `navigator.language` before
showing Taiwan after hydration. WebMCP sends that browser language to the language-list
route, which uses private, uncached responses. Existing lesson URLs and stored language
identifiers remain intact.

For human deployment, enable Cloudflare IP Geolocation for `bantera.app` and ensure the
origin receives `CF-IPCountry`; no new environment variables or migrations are needed.
After deploying the website, verify Taiwan is hidden for CN + English, NZ + `zh-CN` and
NZ + `zh-Hans`, and shown for NZ + English or `zh-Hant-TW`. Also check a Taiwan query URL
and WebMCP's language list. Missing/unknown country must hide Taiwan, and HK/MO IPs with
a Traditional Chinese system language must retain it.
Search tools call same-origin read-only `/api/public/languages` and `/api/public/lessons`
routes, which fetch public data from the backend. They do not expose credentials or
private lessons.

Tools register only when the browser exposes `document.modelContext`, with a fallback
to the older `navigator.modelContext` API. Registration is cleaned up when components
unmount, and calls use the current player state. Unsupported browsers keep the regular
website experience. Site tools are disabled on `/dashboard` and `/dev`; tool inputs are
validated, and lesson titles/transcripts are marked as untrusted content. Browser audio
policies may require a user interaction before playback.

The root layout can emit an origin-trial meta tag from the optional build-time variable
`NEXT_PUBLIC_WEBMCP_ORIGIN_TRIAL_TOKEN`. A valid token and compatible browser are needed
for trial access where required; the code alone does not confirm trial availability.

Implementation: [registration and input validation](src/lib/webmcp.ts),
[React registration lifecycle](src/components/webmcp/use-webmcp-tools.ts),
[public site tools](src/components/webmcp/site-tools.tsx),
[declarative browser form](src/app/webapp/page.tsx), and
[lesson player tools](src/app/webapp/shadowing/[audioId]/shadowing-player.tsx).

### Checking discovery after a release

Check `/learn`, a language guide, `/faq`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`,
`/llms-full.txt`, and a public lesson. Verify canonical URLs, structured data, real lesson
links, and the lesson transcript without JavaScript. In a compatible browser, check that
the tools are registered, search and open a lesson, then read its transcript and play a
cue. Check hosting/WAF access separately; a code review does not prove crawler access.

First-party analytics at `/dashboard/website` can report consented source visits and
lesson engagement. It does not report search queries, search impressions, AI prompts,
or verified app installs. See [discovery and analytics notes](docs/discovery-and-analytics.md)
for deployment configuration, consent, data limits, and smoke checks.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     NEXT.JS APP ROUTER                   │
│                                                          │
│  Server Components ──► data fetching, no client JS      │
│  Server Actions    ──► mutations (auth, AI generation)  │
│  Client Components ──► interactive UI only              │
└────────────────────────────┬────────────────────────────┘
                             │
           ┌─────────────────┼──────────────────┐
           │                 │                  │
┌──────────▼──────┐ ┌────────▼───────┐ ┌────────▼────────┐
│  Bantera Backend│ │  Google Gemini │ │  Other AI APIs  │
│  REST API       │ │  (text, TTS,   │ │  OpenAI         │
│  (public audio, │ │   image, STT)  │ │  AssemblyAI     │
│   admin, auth)  │ │  Key rotation  │ │  Rev.ai         │
└─────────────────┘ └────────────────┘ │  Speechmatics   │
                                       │  Cloudflare AI  │
                                       └─────────────────┘
```

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout (dark mode, fonts, no-FOUC script)
│   ├── page.tsx                 # Introduction homepage
│   ├── actions.ts               # Shared server actions (AI generation)
│   ├── webapp/                  # Public practice platform
│   │   ├── page.tsx             # Audio browser
│   │   ├── [videoId]/           # Practice player
│   │   └── studio/              # AI audio studio
│   ├── dashboard/               # Admin dashboard
│   │   ├── login/               # Auth (server action → JWT → HttpOnly cookie)
│   │   └── (protected)/         # Route group — middleware-guarded
│   └── dev/                     # Internal tooling (Gemini, Rev.ai, Cloudflare)
├── components/
│   └── site-legal-chrome.tsx    # Shared footer
└── lib/
    ├── bantera-api.ts           # Public Bantera API client
    ├── dashboard-api.ts         # Admin API client
    ├── gemini-key.ts            # Multi-key rotation with fallback
    └── proxy.ts                 # Middleware for dashboard route protection
```

---

## 🔑 Technical Deep Dives

### 🤖 Five-Step AI Dialogue Studio (`/dev/gemini`)

A fully guided 5-step workflow for creating language learning content end-to-end:

```
Step 1 ── Language + model selection
   ↓
Step 2 ── Dialogue generation  (Gemini 2.5 Pro writes a 2-speaker script)
   ↓
Step 3 ── Audio synthesis      (TTS with 26 voice options)
   ↓
Step 4 ── Transcription cues   (6 providers → word-level ms timestamps)
   ↓
Step 5 ── Scene image          (AI-generated illustration for the dialogue)
```

The output — dialogue + audio + cue timestamps — maps directly to the format consumed by the iOS practice player.

---

### 🛡️ Admin Authentication & Route Protection

Login issues a JWT from the Bantera backend. The server action decodes the payload to assert `role === 'admin'` and stores both tokens as HttpOnly cookies. Next.js middleware protects all `/dashboard/*` routes except `/dashboard/login`:

```
POST /dashboard/login
  └─► Bantera API /api/auth/login
        └─► JWT decoded (role check)
              └─► HttpOnly cookies set
                    └─► Middleware guards /dashboard/(protected)/*
```

---

### 🎧 Cue-by-Cue Practice Player (`/webapp/[videoId]`)

Implements a **listening-first** approach: the transcript is hidden by default and revealed only after the user listens. Each cue plays independently, letting learners focus on comprehension before reading.

---

### 🌙 Dark Mode Without Flash

An inline script in the root layout applies the `dark` class to `<html>` before React hydrates, preventing a flash of unstyled content (FOUC):

```tsx
<script dangerouslySetInnerHTML={{ __html: `
  (function(){
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    function apply(d) { document.documentElement.classList.toggle('dark', d); }
    apply(mq.matches);
    mq.addEventListener('change', function(e) { apply(e.matches); });
  })();
` }} />
```

---

## 📦 Tech Stack

| Layer | Choice |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19 + TypeScript 5 |
| **Styling** | Tailwind CSS 4 — no CSS-in-JS, no UI library |
| **Compiler** | React Compiler (`babel-plugin-react-compiler`) for auto-memoization |
| **State** | React hooks only — `useState`, `useRef`, `useTransition` |
| **Persistence** | `localStorage` for UI prefs (theme, model selection, language) |
| **Auth** | JWT + HttpOnly cookies + Next.js middleware |
| **AI** | Google Gemini · OpenAI · AssemblyAI · Cloudflare · Rev.ai · Speechmatics |

---

## 🌐 AI Integrations

| Provider | Used For |
|---|---|
| **Google Gemini** | Dialogue generation, TTS audio synthesis, transcription, image generation |
| **OpenAI** | Alternative transcription (Whisper, GPT-4o) |
| **AssemblyAI** | Transcription with speaker diarization |
| **Rev.ai** | Transcription + forced alignment |
| **Speechmatics** | Forced alignment transcription |
| **Cloudflare Workers AI** | Alternative image generation |

---

## 🏁 Getting Started

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.local.example .env.local

# Run dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Required environment variables:**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Bantera backend base URL |
| `GEMINI_API_KEYS` | Comma-separated Gemini API keys |
| `REVAI_ACCESS_TOKEN` | Rev.ai token (optional) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare AI (optional) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare AI (optional) |

---

## 📊 Codebase Stats

| Metric | Value |
|---|---|
| Pages / routes | ~15 |
| AI providers integrated | 6 |
| Transcription providers | 5 |
| Languages supported | EN · JA · KO · ZH |

---

## 📄 License

Private — all rights reserved.

---

*README last updated: 2026-09-30*

## Website discovery and analytics

The website includes a multilingual speaking/listening directory at `/learn`, ten authored
language guides, and first-party visitor reports at `/dashboard/website`. See
[discovery and analytics deployment notes](docs/discovery-and-analytics.md) for the required
server-only ingest key, consent model, data limits and post-deploy checks.
