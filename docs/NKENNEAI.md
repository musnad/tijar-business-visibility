# NKENNEAi Integration

Secure, server-side text translation for Tijar marketplace content, buyer–seller enquiries and business descriptions.

## Verified API facts (official quickstart, checked 2026-10-21)

Source: https://nkenne.ai/nkenneai-api (page is bot-protected; facts cross-checked against the indexed official content).

| Item | Value |
|------|-------|
| Base URL | `https://developers-api.nkenne.ai` |
| Endpoint | `POST /api/translate/with-api-key` |
| Auth | Header `Authorization: <YOUR_API_KEY>` (raw key), `Content-Type: application/json` |
| Body | `{ "text": "...", "fromLanguage": "English", "toLanguage": "Yoruba" }` |
| Success field | `translated_text` (live) / `translatedText` (accepted) |
| Supported languages | **English, Yoruba, Swahili, Nigerian Pidgin** (exact strings) |
| Supported pairs | English ↔ Yoruba / Swahili / Nigerian Pidgin only. No same-language, no direct non-English pairs |
| Speech Studio (Beta) | Official PDFs (hackathon pack): **TTS** `POST /api/tts/v1/{language}/with-api-key` → audio bytes; **STT** `POST /api/stt/v1/{language}/with-api-key` (`audio_file`) → `{ text }` (live may use `transcription`); **ST** `POST /api/st/v1/{pair}/with-api-key` → `{ translated_text }`. Slugs: `english`, `yoruba`, `swahili`, `nigerian-pidgin`. ST pairs: `swahili↔english`, `yoruba↔english` / `pidgin↔english` as `*-to-english` / `english-to-*`. Auth: raw `Authorization` key. |

**Hausa is not a documented API language today.** Tijar's largest audience speaks Hausa, so the UI says "not supported yet" for Hausa instead of failing. Re-check the docs periodically; adding Hausa later is a one-line change in `src/lib/nkenne/languages.ts` once documented.

Live API verified (2026-10-23): success body uses **`translated_text`** (snake_case), plus `tokensRemaining` / `message`. Our client accepts both `translated_text` and camelCase `translatedText`.

## Configuration

Server-side only (never `VITE_`-prefixed, never in the APK):

```bash
# tijar-business-visibility/.env.local (local) / Vercel env (production)
NKENNEAI_API_KEY=your_key_here
NKENNEAI_BASE_URL=https://developers-api.nkenne.ai   # optional override
```

Get a key: sign up at https://nkenne.ai → Developer Tools → API Keys → Generate.

Run locally: `cd tijar-business-visibility && bun run dev` → open a storefront `/b/<slug>` and press **Translate**. Without a key the endpoint returns `503 NOT_CONFIGURED` and the UI shows a clear message (no fake translations).

## Tijar endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/translate` | `{ text, fromLanguage, toLanguage }` → `{ translatedText, fromLanguage, toLanguage, cached }`. Validates input (≤1000 chars), enforces documented language pairs, rate-limits (20/min anonymous IP, 40/min signed-in), caches results (1 h, in-memory), retries once on provider 5xx, 12 s timeout |
| `POST /api/translate-batch` | Auth required (verified Supabase JWT). Max 20 short strings. Admin system-string tool only. |
| `POST /api/speak` | NKENNE TTS. JSON `{ text, language }` → raw audio (`audio/wav` or `audio/mpeg`). Origin + IP rate limit. |
| `POST /api/translate-speech` | multipart `audio` + `language` (+ optional `toLanguage`). STT and/or Speech Translations; falls back to STT + text translate when ST pair missing or beta upstream is down. |

Errors use stable codes: `VALIDATION`, `UNSUPPORTED_LANGUAGE`, `UNSUPPORTED_PAIR`, `SAME_LANGUAGE`, `NOT_CONFIGURED`, `INVALID_CREDENTIALS`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `TIMEOUT`, `NETWORK`, `PROVIDER_ERROR`, `FORBIDDEN_ORIGIN`, `UNAUTHORIZED`, `PAYLOAD_TOO_LARGE`. Request text, transcripts and keys are **never logged**.

## API security

| Control | Detail |
|---------|--------|
| Key isolation | `NKENNEAI_API_KEY` is server-only (no `VITE_` prefix). Never returned in responses or client bundles. |
| Origin allowlist | Browser calls must come from the request host, `VITE_PUBLIC_APP_URL`, localhost, or `TRANSLATE_ALLOWED_ORIGINS`. |
| Body limits | JSON ≤ ~8 KB (single) / ~16 KB (batch); content-type must be `application/json`. |
| Rate limits | Always bound to real client IP. Unverified Bearer JWTs cannot mint new buckets. Signed-in users verified via `supabase.auth.getUser(token)`. |
| Batch auth | `/api/translate-batch` requires a verified session. |
| Response headers | `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, no indexing. |
| Provider errors | Mapped to stable codes; raw NKENNE bodies are never forwarded. |

## Where translation appears

- **Storefront** (`/b/[slug]`): business description and each product — original always kept, translation shown alongside, target defaults to the visitor's app language
- **Seller enquiry inbox** (`/app/business/publish`): translate a buyer's message (source language selectable); original preserved; nothing is auto-sent
- **Business description editor** (`/app/business/edit`): owner writes in a supported language, translates, reviews, and must click **Use this translation**, then **Save** — never auto-published
- **Voice** (storefront enquiry form): explicit record button (≤60 s) → NKENNE STT; transcript reviewed before use
- **Talk / Translator Hear-it**: NKENNE TTS for English/Yoruba/Swahili/Pidgin, browser speech engine as fallback

Language preference: the existing app language selector (`SitePreferencesControls`, locales en/ha/ar/yo/ig/sw/ff) is preserved; it sets the default translation target where NKENNEAi supports it (en/yo/sw).

## Token-usage controls

Per-request 1000-char cap, 20 req/min per user/IP, 1-hour response cache, one retry max. For multi-instance production, move cache + rate limit to Redis/Upstash (interfaces in `src/lib/nkenne/cache.ts` / `rate-limit.ts` are shaped for that) and add per-business daily quotas before opening translation to anonymous traffic at scale.

## Language expansion (pivot, voice assistant, translator mode)

- **Pivot translation:** non-English pairs (e.g. Yoruba → Swahili) now translate via English using only documented pairs (two cached calls). Hausa remains unsupported by the API.
- **Whole-system languages:** the app UI already ships static messages for English, Hausa and Swahili (`src/lib/i18n/messages/`). `/app/admin/translate` translates system strings with NKENNEAi (batch endpoint `POST /api/translate-batch`, max 20) for human review before they are committed to message files — runtime UI is never silently machine-translated.
- **Talk to TIJAR** (`/app/assistant`, "Talk" tab): push-to-talk (browser speech engine; Hausa/Swahili/Yoruba/English voices) or typing → rule-based intent parser (`src/utils/voice-intent.ts`: sale, expense, purchase, customer/supplier payment; amounts incl. "5k", "45,000", "for ₦…") → draft card → **explicit Confirm** saves via the normal transaction service → spoken confirmation. No silent writes.
- **Conversation translator** (`/translate`): two-person mode — speak/type in your language, the other person hears it spoken in theirs; originals preserved; swap button; history kept.

## Tests

`bun run test` — `src/lib/nkenne/nkenne.test.ts` mocks the provider: both translation directions, documented request shape + auth header, unsupported Hausa/pairs, missing/invalid credentials, quota (429), timeout, retry-then-success, cache hit avoids a second API call, rate limiting, input validation, and original-text preservation.

## Limitations

1. **Live text translation verified** (2026-10-23) with a configured `NKENNEAI_API_KEY` on Vercel + local
2. **Hausa not supported by the documented API** — product decision needed (wait for NKENNEAi Hausa, or add a second provider for Hausa)
3. **Speech Studio is Beta** — ST / some STT paths can return 503 (`no healthy upstream`); TIJAR falls back to STT+text translate and/or browser speech so Talk still works
4. In-memory cache/rate limit resets on server restart and is per-instance on Vercel — move to Redis/Upstash before high traffic

## Voice profile creation

`/app/onboarding/voice` (linked from the typed wizard): TIJAR asks each question aloud in English, Hausa, Swahili or Yoruba (`src/utils/voice-onboarding.ts` prompts), the owner answers by voice or tap — business name, category (spoken by name or number, incl. Hausa/Swahili number words), location, business type, payments, credit/stock/staff yes-no (ee/a'a, ndiyo/hapana, bẹẹni/bẹẹkọ), discovery channels, goals, Islamic mode — then reviews a summary and confirms. Only then is the business created via the existing onboarding service; the chosen language is saved as the profile's preferred language. Speech uses the device speech engine; account credentials remain typed for security.
