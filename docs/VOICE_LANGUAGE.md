# Phase 5 — Voice & African-Language Support: Status Report

Honest capability matrix. "Tested" means automated tests with mocked provider responses; **no live NKENNEAi call has been made** (no API key configured in this environment).

## Provider verification (NKENNEAi, official quickstart checked 2026-10-21)

| Question | Documented answer |
|----------|-------------------|
| Endpoint | `POST https://developers-api.nkenne.ai/api/translate/with-api-key` |
| Auth | `Authorization: <API_KEY>` header |
| Payload / response | `{ text, fromLanguage, toLanguage }` → `{ translatedText }` |
| Languages | English, Yoruba, Swahili, Nigerian Pidgin (exact strings) |
| Pairs | English ↔ each other; other cross-pairs via English pivot (implemented) |
| Speech (STT/TTS) | **Not documented** — Tijar does not claim NKENNEAi speech |
| Rate limits / quotas / pricing / max length | **Not published in the quickstart** — Tijar defends itself: 1000-char cap, 20 req/min per user/IP, cache, 1 retry, 12 s timeout |
| Errors | Not documented; HTTP status mapped to stable Tijar codes (401/403 credentials, 429 quota, 400 unsupported, timeout/network) |

## What is genuinely implemented

| Capability | How | Languages | Tested |
|------------|-----|-----------|--------|
| Text translation | Server route `/api/translate` → provider interface `TranslationProvider` (NKENNE adapter) | En ↔ Yo, Sw, Pidgin (+ pivot Yo↔Sw etc.) | Mocked unit tests (12) — both directions, errors, cache, rate limit |
| Batch translation | `/api/translate-batch` (system strings tool) | Same | Mocked via service tests |
| Speech-to-text | Device speech engine (Web Speech API), push-to-talk only, permission on demand, no raw-audio retention (audio never uploaded; recognition runs on device/browser) | English, Hausa, Swahili, Yoruba (device-dependent) | Manual/device — cannot be unit-tested; typing fallback always present |
| Text-to-speech | Device `speechSynthesis`, explicit "Hear it"/toggle | Same | Manual/device |
| Voice records | Talk to TIJAR: transcript shown → draft → explicit Confirm → transaction service | Same | Parser unit tests (7) |
| Voice onboarding | Spoken Q&A creates business profile after review | En, Ha, Sw, Yo prompts | Parser tests (4) |
| Dashboard explanations | "Explain my profit" → real analytics (30-day/today) → phrased, optionally NKENNE-translated (Yo/Sw) and spoken | En (+ Yo/Sw translation) | Unit tests (figures, loss, missing data) |
| Translated search | Discover: search in Yo/Sw/Pidgin → translated to English for matching, original query preserved and displayed | Yo, Sw, Pidgin | Code path via mocked translate service |
| Conversation translator | `/translate` two-person mode, originals preserved, spoken output | Voice: Ha/En/Sw/Yo · Text: NKENNE languages | UI + mocked service |

## Not supported / not claimed

- **Hausa text translation** — not in the documented NKENNEAi API. UI labels this clearly; Hausa voice and Hausa UI strings work. Never presented as working.
- **NKENNEAi speech** — undocumented; `/api/translate-speech` returns `501 VOICE_NOT_AVAILABLE` until official docs exist.
- Igbo/Arabic/Fulfulde UI locales exist as static files; they are not NKENNEAi translation targets.

## Privacy

Audio is processed only after an explicit button press; recognition is single-utterance (never continuous); raw audio is not stored or uploaded by Tijar (browser engine may process per its own policy — disclosed to users by the platform). Transcripts/translations are shown for editing before any send/save. Provider request text is never logged.

## To verify live (needs credentials)

1. Add `NKENNEAI_API_KEY` (Vercel + `.env.local`), redeploy
2. `POST /api/translate` English→Yoruba and Yoruba→English; confirm `translatedText`
3. Repeat Swahili + Nigerian Pidgin; test an unsupported request (Hausa) returns `UNSUPPORTED_LANGUAGE`
4. Only then update this matrix from "mock-tested" to "live-tested" per language
