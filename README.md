# TIJAR — Making Every Business Visible

**NKENNEAi API Hackathon submission**

TIJAR is a web application for African micro and informal businesses — market traders, provision sellers, artisans, and small shops. It helps owners **record sales and expenses**, **manage products and stock**, **learn business basics**, and **become discoverable online**, in the languages they already speak and hear.

| | |
|---|---|
| **Live demo** | [https://tijar-two.vercel.app](https://tijar-two.vercel.app) |
| **Repository** | [https://github.com/musnad/tijar-business-visibility](https://github.com/musnad/tijar-business-visibility) |
| **Stack** | TanStack Start (React + Vite), Supabase, Vercel, Bun |
| **NKENNEAi languages** | English, Yoruba, Swahili, Nigerian Pidgin |

> **Security:** Never commit API keys, tokens, or passwords. Use `.env.local` (gitignored) and host secrets (e.g. Vercel). Only placeholders belong in `.env.example`.

---

## Table of contents

1. [Problem](#1-problem)
2. [What TIJAR does](#2-what-tijar-does)
3. [NKENNEAi integration](#3-nkenneai-integration)
4. [Setup](#4-setup)
5. [Usage](#5-usage)
6. [Architecture & code map](#6-architecture--code-map)
7. [Token usage](#7-token-usage)
8. [Limitations](#8-limitations)
9. [Tests](#9-tests)
10. [Deploy](#10-deploy)
11. [License & contact](#11-license--contact)

---

## 1. Problem

Millions of African micro-businesses operate successfully every day, but software often fails them:

1. **Language** — Owners speak Hausa, Yoruba, Swahili, Pidgin, and more. Most tools are English-only.
2. **Voice first** — Many prefer speaking over typing (busy hands, low literacy, noisy markets). Generic phone speech engines struggle with African languages and accents.
3. **Cross-language trade** — A buyer may enquire in Swahili while the seller’s books and replies are in English or Yoruba.
4. **Visibility without understanding** — A public storefront only helps if descriptions and enquiries can be understood on both sides.

**TIJAR uses NKENNEAi** so books, talk, translation, and Discover can run in African languages — inside the real product workflow, not as a detached demo widget.

---

## 2. What TIJAR does

| Area | What the user can do |
|------|----------------------|
| **Talk — My books** | Speak or type a sale/expense → review a draft → **Confirm** to save (no silent writes). Works with NKENNE languages; non-English speech is translated for understanding. |
| **Talk — Two people** | Person A speaks in one language; Person B hears it spoken in another (STT + TTT + TTS). |
| **Translator** | Standalone two-language speak / translate / hear flow. |
| **Products & stock** | Add goods or services (name required; prices accept `₦15,000`, `15k`, etc.), optional photo, opening stock. |
| **Sales & expenses** | Record cash/credit activity; link sales to products for profit. |
| **Scan Document** | Photograph a receipt or handwritten note → on-device OCR → draft → Confirm. |
| **Discover / storefront** | Public `/b/{slug}` pages; translate descriptions and products; voice enquiry. |
| **Learn** | Short lessons with hear/speak practice where supported. |
| **Onboarding** | Typed wizard or voice-assisted business setup. |

---

## 3. NKENNEAi integration

### Design principles

- **Server-side only** — The browser never sees `NKENNEAI_API_KEY`. Clients call TIJAR proxies; the server forwards to `https://developers-api.nkenne.ai` with the documented raw `Authorization` header.
- **No silent writes** — Voice and OCR produce **drafts**; the owner must confirm before transactions are saved.
- **Originals preserved** — Translations are shown alongside source text; seller copy is never auto-overwritten without review.
- **Graceful degradation** — If Speech Studio Beta returns 503, TIJAR falls back to STT + text translate and/or the device speech engine.

### APIs used

| NKENNEAi API | Official endpoint | TIJAR proxy | Product role |
|--------------|-------------------|-------------|--------------|
| **Text-to-Text (TTT)** | `POST /api/translate/with-api-key` | `POST /api/translate`, `POST /api/translate-batch` | Storefront / products, enquiries, Talk replies, Discover pivot, admin string tool |
| **Text-to-Speech (TTS)** | `POST /api/tts/v1/{language}/with-api-key` | `POST /api/speak` | “Hear it”, Talk speak-back, Translator |
| **Speech-to-Text (STT)** | `POST /api/stt/v1/{language}/with-api-key` | `POST /api/translate-speech` | Talk mic, Translator mic, storefront voice enquiry |
| **Speech Translations (ST)** | `POST /api/st/v1/{pair}/with-api-key` | `POST /api/translate-speech` (+ `toLanguage`) | Spoken cross-language when a pair exists; else STT → TTT |

**Documented languages:** English, Yoruba, Swahili, Nigerian Pidgin (exact strings).  
**ST pairs (docs):** `swahili-to-english`, `yoruba-to-english`, `pidgin-to-english`, `english-to-swahili`, `english-to-yoruba`, `english-to-pidgin`.

### Auth & request shapes

```http
Authorization: YOUR_API_KEY
Content-Type: application/json   # TTT / TTS JSON bodies
```

```json
// Text-to-Text
{ "text": "Hello", "fromLanguage": "English", "toLanguage": "Yoruba" }
// Success field: translated_text (we also accept translatedText)
```

```json
// Text-to-Speech  POST /api/tts/v1/yoruba/with-api-key
{ "text": "…", "voice_name": "optional", "speaking_rate": 1.0 }
// Response: binary audio (audio/mpeg or audio/wav)
```

```text
// Speech-to-Text  POST /api/stt/v1/yoruba/with-api-key
multipart: audio_file=<binary>
// Response: { text | transcription, … }
```

```text
// Speech Translations  POST /api/st/v1/swahili-to-english/with-api-key
multipart: audio_file=<binary>
// Response: { translated_text, source_language, target_language }
```

### Reliability controls

| Control | Behaviour |
|---------|-----------|
| Cache | Successful TTT results cached in memory (~1 hour) |
| Rate limits | Bound to client IP; higher allowance when signed in (verified JWT) |
| Pivot | Non-English text pairs (e.g. Yoruba → Swahili) go via English (two cached calls) |
| Timeouts / retry | ~12 s timeout; one retry on provider 5xx |
| Input caps | Text ≤ 1000 characters; voice uploads capped in-app (~5 MB / 60 s) |
| Errors | Stable codes (`NOT_CONFIGURED`, `UNSUPPORTED_LANGUAGE`, `RATE_LIMITED`, …); raw provider bodies never forwarded; keys never logged |

Deeper notes: [docs/NKENNEAI.md](./docs/NKENNEAI.md), [docs/VOICE_LANGUAGE.md](./docs/VOICE_LANGUAGE.md).

---

## 4. Setup

### Requirements

- [Bun](https://bun.sh) (recommended package runner)
- A [NKENNEAi](https://nkenne.ai/) account and API key (Developer Tools → API Keys)
- Optional: [Supabase](https://supabase.com) project for auth and business data (see [SUPABASE.md](./SUPABASE.md))

### Environment

```sh
cp .env.example .env.local
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `NKENNEAI_API_KEY` | For translation / speech | **Server-only secret** — never prefix with `VITE_` |
| `NKENNEAI_BASE_URL` | No | Defaults to `https://developers-api.nkenne.ai` |
| `VITE_SUPABASE_URL` | For full app | Public Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | For full app | Public anon / publishable key |
| `VITE_PUBLIC_APP_URL` | Production | Public site URL (no trailing slash) |
| `TRANSLATE_ALLOWED_ORIGINS` | No | Extra allowed Origins for API proxies |

Translation and speech proxies work with **only** `NKENNEAI_API_KEY`. Auth, books, products, and Discover need Supabase configured and migrations applied.

### Install & run

```sh
git clone https://github.com/musnad/tijar-business-visibility.git
cd tijar-business-visibility
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

- [http://localhost:3000/api/supabase-health](http://localhost:3000/api/supabase-health) — Supabase config  
- Add `?nkenne=1` to probe NKENNE configuration **without** returning the key  

```sh
bun run test    # unit tests (NKENNE mocked; no live tokens)
bun run build   # production build
```

---

## 5. Usage

### Quick demo walkthrough

1. Open the [live app](https://tijar-two.vercel.app) or run locally.
2. Set language in the top bar (English / Yoruba / Swahili where supported).
3. **Translator** (`/translate`) — choose two languages → Speak → Translate & speak. Confirm the other side hears NKENNE TTS when configured.
4. **Talk** (`/app/assistant`, sign in)  
   - *My books* — say e.g. “I made a sale of 5000 for rice” → review draft → **Confirm & save**.  
   - *Two people* — Person A speaks English; Person B hears Yoruba (or the reverse).
5. **Products** (`/app/products`) — Add product with a name (required); optional `₦` / `15k` prices, stock, photo.
6. **Scan Document** (dashboard quick action / `/app/scan`) — photograph a receipt → review OCR draft → Confirm.
7. **Storefront** — open `/b/{slug}` → Translate description → optional voice enquiry.
8. In DevTools → Network, confirm the browser only calls **your** `/api/translate`, `/api/speak`, `/api/translate-speech` — never NKENNE with a client-side key.

### Feature → API map (for judges)

| Feature | Route | NKENNE APIs |
|---------|-------|-------------|
| Talk — My books | `/app/assistant` | STT → intent; TTT when non-English; TTS replies |
| Talk — Two people | `/app/assistant` | STT + TTT + TTS |
| Translator | `/translate` | STT + TTT + TTS |
| Discover / storefront | `/discover`, `/b/{slug}` | TTT; STT for voice enquiry |
| Hear it | throughout | TTS (NKENNE first, browser fallback) |
| Admin string translate | `/app/admin/translate` | TTT batch (signed-in) |

---

## 6. Architecture & code map

```
Browser  →  TIJAR API routes  →  NKENNEAi (Authorization: API key)
                ↓
           Supabase (auth, Postgres, storage) when configured
```

| Area | Path |
|------|------|
| TTT client | `src/lib/nkenne/client.ts` |
| Speech Studio (TTS / STT / ST) | `src/lib/nkenne/speech.ts` |
| Orchestration, cache, rate limit | `src/lib/nkenne/service.ts`, `speech-service.ts`, `cache.ts`, `rate-limit.ts` |
| Language rules | `src/lib/nkenne/languages.ts` |
| API routes | `src/routes/api.translate.tsx`, `api.translate-batch.tsx`, `api.speak.tsx`, `api.translate-speech.tsx` |
| Talk UI | `src/features/assistant/assistant-screen.tsx` |
| Translator / Hear it | `src/features/translate/` |
| Products | `src/features/products/` |
| Scan Document | `src/features/scan/`, `src/lib/ocr/` |
| Voice intent (books) | `src/utils/voice-intent.ts` |

---

## 7. Token usage

- Prefer **cached TTT** for repeated UI strings and search queries.
- Cap request size; avoid polling.
- One retry on transient failures.
- Unit tests **mock** the provider so CI does not consume quota.
- Speech Studio is used when it improves Yoruba / Swahili / Pidgin quality; browser engines cover Hausa and offline fallback so demos still work if Beta speech returns 503.

---

## 8. Limitations

1. **Hausa, Igbo, Arabic, Fulfulde** — UI translations exist in the app, but these languages are **not** in the documented NKENNEAi API list. Text translation is refused with a clear message; voice uses the **device** speech engine only.
2. **TTT pairs** — Direct non-English pairs are not documented; TIJAR pivots via English (two calls, cached).
3. **Speech Studio is Beta** — ST / STT may return upstream `503`; TIJAR degrades to STT + TTT or browser speech.
4. **Browser audio formats** — Mic often records `audio/webm`; if a provider rejects a format, browser STT/TTS fallback applies.
5. **In-memory cache & rate limits** — Per server instance (suitable for demo); use Redis / Upstash for multi-region production.
6. **Supabase** — Full books, auth, products, and Discover need a configured project and migrations. NKENNE proxies alone need only `NKENNEAI_API_KEY`.
7. **OCR (Scan Document)** — On-device Tesseract (English-oriented); handwritten notes vary in quality — user must always review before save.
8. **Same-language** — TTT rejects same `from` / `to`; the UI speaks the original aloud instead.

---

## 9. Tests

```sh
bun run test
```

Notable suites:

- `src/lib/nkenne/nkenne.test.ts` — TTT shapes, auth header, unsupported languages/pairs, quota, timeout, retry, cache, rate limit  
- `src/lib/nkenne/speech.test.ts` / `api-security.test.ts` — speech + proxy security  
- `src/utils/voice-intent.test.ts`, `voice-product.test.ts`, `scan-document.test.ts` — books / products / OCR parsing  
- `src/lib/i18n/full-coverage.test.ts` — locale string coverage  

---

## 10. Deploy

See **[DEPLOY.md](./DEPLOY.md)** for Vercel (and alternatives).

Minimum production env:

| Name | Notes |
|------|--------|
| `NKENNEAI_API_KEY` | Server secret |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Embedded at build time |
| `VITE_PUBLIC_APP_URL` | e.g. `https://tijar-two.vercel.app` |
| `VITE_APP_ENV` | `production` |

After changing `VITE_*` variables, **redeploy** so the client bundle picks them up.

---

## 11. License & contact

© 2026 TIJAR.

- NKENNEAi API docs: [https://nkenne.ai/nkenneai-api](https://nkenne.ai/nkenneai-api)  
- Hackathon support: use the organizers’ official channels  

**Do not email or paste live API keys into issues, Discord, pull requests, or this README.**

### Third-party services

| Service | Role |
|---------|------|
| **NKENNEAi** | Text translation, TTS, STT, speech translation |
| **Supabase** | Auth, Postgres, storage |
| **Vercel** | Hosting |
| **Tesseract.js** | On-device OCR for Scan Document |
| Browser Web Speech API | Fallback STT/TTS |

Pre-existing TIJAR product surfaces (records, Discover, onboarding, Learn) are extended with NKENNE for language and voice; see commit history for scope.
