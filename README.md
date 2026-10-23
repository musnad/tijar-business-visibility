# TIJAR — Making Every Business Visible

**NKENNEAi API Hackathon submission**

TIJAR helps everyday African business owners (market traders, food sellers, artisans, small shops) record sales, understand their business, and become discoverable online — **in the languages they already speak**.

- **Live app:** https://tijar-two.vercel.app  
- **Repository:** https://github.com/musnad/tijar-business-visibility  
- **Stack:** TanStack Start (React + Vite), Supabase, Vercel  
- **Languages (NKENNEAi):** English, Yoruba, Swahili, Nigerian Pidgin  

> **Security:** Never commit API keys, tokens, or passwords. Use `.env.local` (gitignored) and host env vars (e.g. Vercel). Only placeholders belong in `.env.example`.

---

## The problem we are solving

Millions of micro and informal businesses across Africa run successfully every day, but:

1. **Language barrier** — Owners speak Hausa, Yoruba, Swahili, Pidgin, etc. Most business software is English-only. Typing and reading in a second language slows them down or locks them out.
2. **Voice is how they work** — Many prefer speaking over typing (low literacy, busy hands, noisy markets). Generic phone TTS/STT often fails on African languages and accents.
3. **Customers and sellers do not share a language** — A buyer may enquire in Swahili while the seller’s books and replies are in English or Yoruba. Without translation, Discover / storefront messaging breaks down.
4. **Visibility without understanding is useless** — A public storefront only helps if product descriptions and enquiries can be understood on both sides.

**TIJAR uses NKENNEAi** so recording books, talking to the app, translating storefronts, and two-person conversation can happen in African languages — not as a demo widget, but inside the real product workflow.

---

## How we use the NKENNEAi API

All NKENNE calls run **server-side only**. The browser never sees `NKENNEAI_API_KEY`. Clients call our proxies; we forward to `https://developers-api.nkenne.ai` with the documented raw `Authorization` header.

| NKENNEAi API | Official endpoint | TIJAR proxy | Role in the product |
|--------------|-------------------|-------------|---------------------|
| **Text-to-Text (TTT)** | `POST /api/translate/with-api-key` | `POST /api/translate`, `POST /api/translate-batch` | Storefront / product translation, seller enquiry translation, Talk replies, Discover search pivot, admin system-string tool |
| **Text-to-Speech (TTS)** | `POST /api/tts/v1/{language}/with-api-key` | `POST /api/speak` | “Hear it”, Talk speak-back, Translator spoken output |
| **Speech-to-Text (STT)** | `POST /api/stt/v1/{language}/with-api-key` | `POST /api/translate-speech` | Talk mic, Translator mic, storefront voice enquiry |
| **Speech Translations (ST)** | `POST /api/st/v1/{pair}/with-api-key` | `POST /api/translate-speech` (with `toLanguage`) | Spoken cross-language path when a pair is supported; else STT → TTT |

### Integration design (token-efficient & reliable)

- **Cache** successful text translations in memory (~1 h) to avoid repeat token spend.
- **Rate limits** per client IP (and verified user when signed in).
- **Pivot via English** for text pairs that are not direct in the TTT docs (e.g. Yoruba → Swahili = two cached steps).
- **Speech Studio Beta fallbacks:** if ST returns 503 / fails, we use STT + TTT; if NKENNE TTS fails, we fall back to the device speech engine. Hausa uses device voice only (not in the documented NKENNE language list).
- **No silent writes:** Talk parses voice into a **draft**; the owner must **Confirm** before a sale/expense is saved.
- **Originals preserved:** translations are shown alongside originals; never auto-overwrite seller copy without review.

### Code map

| Area | Path |
|------|------|
| TTT client | `src/lib/nkenne/client.ts` |
| Speech Studio client (TTS / STT / ST) | `src/lib/nkenne/speech.ts` |
| Orchestration + cache / rate limit | `src/lib/nkenne/service.ts`, `speech-service.ts`, `cache.ts`, `rate-limit.ts` |
| API routes | `src/routes/api.translate.tsx`, `api.translate-batch.tsx`, `api.speak.tsx`, `api.translate-speech.tsx` |
| Talk UI | `src/features/assistant/assistant-screen.tsx` |
| Translator | `src/features/translate/` |
| Deeper notes | [docs/NKENNEAI.md](./docs/NKENNEAI.md), [docs/VOICE_LANGUAGE.md](./docs/VOICE_LANGUAGE.md) |

### Auth & request shapes (as documented)

```http
Authorization: YOUR_API_KEY
```

```json
// TTT
{ "text": "…", "fromLanguage": "English", "toLanguage": "Yoruba" }
// Live success field: translated_text (we also accept translatedText)
```

```json
// TTS  POST /api/tts/v1/yoruba/with-api-key
{ "text": "…", "voice_name": "optional", "speaking_rate": 1.0 }
// Response: binary audio (audio/mpeg or audio/wav)
```

```text
// STT  POST /api/stt/v1/yoruba/with-api-key
multipart: audio_file=<binary>
// Response: { text | transcription, … }
```

```text
// ST   POST /api/st/v1/swahili-to-english/with-api-key
multipart: audio_file=<binary>
// Response: { translated_text, source_language, target_language }
```

Supported ST pairs (official docs):  
`swahili-to-english`, `yoruba-to-english`, `pidgin-to-english`, `english-to-swahili`, `english-to-yoruba`, `english-to-pidgin`.

---

## Features judges can try

| Feature | Where | NKENNE APIs |
|---------|-------|-------------|
| **Talk — My books** | `/app/assistant` | STT (mic) → intent draft → Confirm; TTS for replies; TTT when speaking Yo/Sw/Pidgin |
| **Talk — Two people** | `/app/assistant` (chat mode) | STT + TTT + TTS (speak-only translate) |
| **Translator** | `/translate` | STT + TTT + TTS |
| **Discover / storefront** | `/discover`, `/b/{slug}` | TTT for descriptions/products; STT for voice enquiry |
| **Seller publish / enquiries** | `/app/business/…` | TTT with original preserved |
| **Hear it** | throughout | TTS (NKENNE first, browser fallback) |

---

## Setup

### Requirements

- [Bun](https://bun.sh)
- A [NKENNEAi](https://nkenne.ai/) account + API key (Developer Tools → API Keys)
- Optional: Supabase project for auth / business data (see [SUPABASE.md](./SUPABASE.md))

### Environment (placeholders only)

```sh
cp .env.example .env.local
```

Set **server-only** (never `VITE_`-prefix the NKENNE key):

| Variable | Purpose |
|----------|---------|
| `NKENNEAI_API_KEY` | NKENNEAi API key — **secret** |
| `NKENNEAI_BASE_URL` | Optional; default `https://developers-api.nkenne.ai` |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Public Supabase client config |
| `VITE_PUBLIC_APP_URL` | Public site URL (production) |

### Run locally

```sh
git clone https://github.com/musnad/tijar-business-visibility.git
cd tijar-business-visibility
bun install
bun run dev
```

Open http://localhost:3000  

Health: http://localhost:3000/api/supabase-health (add `?nkenne=1` to probe NKENNE config **without** returning the key).

```sh
bun run test    # unit tests (mocked NKENNE; no real tokens)
bun run build   # production build
```

### Deploy

See **[DEPLOY.md](./DEPLOY.md)**. On Vercel, set `NKENNEAI_API_KEY` as a **server** env var (not exposed to the client bundle).

---

## Demo walkthrough

1. Open the live app (or local `bun run dev`).
2. Set app language (top bar) to English, Yoruba, or Swahili.
3. **Translator** (`/translate`): pick two languages → Speak → Translate & speak. Confirm the other side hears NKENNE TTS.
4. **Talk** (`/app/assistant`, sign in):  
   - *My books* — say e.g. “sale of rice for five thousand” → review draft → Confirm.  
   - *Two people* — Person A speaks in English, Person B hears Yoruba (speak-only).
5. **Storefront** — open a `/b/{slug}` page → Translate description → optional Record voice on enquiry.
6. Confirm Network tab shows calls to **our** `/api/translate`, `/api/speak`, `/api/translate-speech` only — never a browser call to NKENNE with a key.

---

## Token usage approach

- Prefer **cached TTT** for repeated UI strings and search queries.
- Cap request size (text ≤ 1000 chars; voice uploads capped in-app at ~5 MB / 60 s even though the API allows up to 25 MB).
- One retry on transient provider failures; no aggressive polling.
- Speech Studio is used when it improves Yoruba/Swahili/Pidgin quality; browser engines cover Hausa and offline fallback so demos still work if Beta speech returns 503.
- Unit tests **mock** the provider so CI does not burn tokens.

---

## Known limitations

1. **Hausa (and Igbo / Arabic / Fulfulde)** — UI strings exist; **not** in the documented NKENNE language list. Text translation is refused clearly; voice uses the device engine only.
2. **TTT pairs** — Direct non-English pairs are not in the TTT docs; we pivot via English (two calls, cached).
3. **Speech Studio is Beta** — ST/STT can return upstream 503; we degrade gracefully (STT+TTT or browser speech).
4. **Browser audio formats** — Mic often records `audio/webm`; if a provider rejects a format, browser STT/TTS fallback applies.
5. **In-memory cache / rate limits** — per server instance (fine for demo; use Redis for multi-region production scale).
6. **Supabase** — full books / auth needs configured Supabase; translation/speech proxies work with only `NKENNEAI_API_KEY`.

---

## Third-party services

| Service | Use |
|---------|-----|
| **NKENNEAi** | Text translation, TTS, STT, speech translation |
| **Supabase** | Auth, Postgres, business data |
| **Vercel** | Hosting |
| Browser Web Speech API | Fallback STT/TTS when NKENNE speech is unavailable or language unsupported |

Pre-existing TIJAR product code (records, discover, onboarding) is extended with NKENNE for language/voice; see commit history for scope.

---

## License / contact

© 2026 TIJAR. Hackathon support (NKENNE): see organizers’ channels; API docs https://nkenne.ai/nkenneai-api  

**Do not email or paste live API keys into issues, Discord, or the README.**
