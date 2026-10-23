# Phase 5 — Voice & African-Language Support: Status Report

Honest capability matrix. Unit tests use mocked provider responses. **Live NKENNEAi text + Speech Studio TTS/STT verified 2026-10-23**.

## Provider verification (NKENNEAi)

| Question | Documented / live answer |
|----------|-------------------|
| Text endpoint | `POST https://developers-api.nkenne.ai/api/translate/with-api-key` |
| TTS | `POST /api/tts/v1/{language}/with-api-key` → audio bytes (WAV/MP3) |
| STT | `POST /api/stt/v1/{language}/with-api-key` + `audio_file` → `{ transcription }` (live) / `{ text }` (docs) |
| Speech Translations | `POST /api/st/v1/{pair}/with-api-key` → `{ translated_text }`; live pairs: `swahili↔english`, `yoruba→english`, `pidgin→english` |
| Auth | `Authorization: <API_KEY>` (raw key) |
| Languages | English, Yoruba, Swahili, Nigerian Pidgin |

## What is genuinely implemented

| Capability | How | Languages | Tested |
|------------|-----|-----------|--------|
| Text translation | `/api/translate` | En ↔ Yo, Sw, Pidgin (+ pivot) | Mocked + live |
| Batch translation | `/api/translate-batch` | Same | Mocked |
| Speech-to-text | NKENNE STT via `/api/translate-speech` (MediaRecorder), browser Web Speech fallback | En, Yo, Sw, Pidgin (+ Hausa browser-only) | Mocked speech client; live STT Yoruba |
| Text-to-speech | NKENNE TTS via `/api/speak`, browser `speechSynthesis` fallback | Same | Mocked + live TTS Yoruba/English/Swahili |
| Speech translate | Prefer `/api/st/...`; else STT + text translate | Live ST pairs; others via fallback | Mocked orchestration |
| Voice records | Talk → draft → Confirm | Same | Parser tests |
| Conversation translator | `/translate` + NKENNE speak-back | Same | UI + services |

## Not supported / not claimed

- **Hausa text / NKENNE speech** — not in the API. Hausa UI + browser voice only.
- Speech Studio is **Beta** — ST can 503; TIJAR always has text + browser fallbacks.

## Privacy

Audio is uploaded only after an explicit record/mic press (≤5 MB / ~60 s), never logged, and only to TIJAR’s server which proxies to NKENNE with the server-side key. Transcripts are shown for review before save/send where the UI requires it.
