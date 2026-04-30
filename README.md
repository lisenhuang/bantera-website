# 🌐 Bantera — Website & Admin Dashboard

> **Marketing site, web practice platform, and admin dashboard** for the Bantera language learning app.

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
├── /                      ← Introduction homepage (iOS app CTA)
├── /privacy               ← Privacy policy
├── /support               ← Support page
│
├── /webapp                ← Public web practice platform
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
│   ├── page.tsx                 # Marketing homepage
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

*README last updated: 2026-04-30*
