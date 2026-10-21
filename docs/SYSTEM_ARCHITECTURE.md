# TIJAR — System Architecture (Phase 1 Audit)

> Audited 2026-10-21. Describes the system as it exists, not the target.

## 1. Repository layout

```
Tijar app/                        (git monorepo; branch main, HEAD 2e2ae48 locally)
├── app/                          Android (Kotlin + Jetpack Compose)
├── tijar-business-visibility/    Web app (TanStack Start) — deployed to Vercel
├── supabase/                     Canonical migrations + seed
│   └── tijar-business-visibility/supabase/  (copied duplicate; see Risks)
├── docs/                         Architecture/product docs
├── scripts/                      build-apk.sh, push-web-to-github.sh, sync helpers
└── INSTALL.md, README.md
```

GitHub remote `musnad/tijar-business-visibility` contains **only the web app at repo root** ( synced by `scripts/push-web-to-github.sh`, rsync-based). The Android app and monorepo docs are not published there.

## 2. Technology stack (verified from manifests)

| Layer | Choice | Evidence |
|-------|--------|----------|
| Web framework | TanStack Start 1.168 + TanStack Router 1.170, React 19.2 | `tijar-business-visibility/package.json` |
| Build | Vite 8.1.5, Nitro 3.0 beta (`nitro/vite`), rolldown pinned via `overrides` | `vite.config.ts`, `package.json` |
| Package manager (web) | Bun (`bun.lock`, `bun run …`) | lockfile, scripts |
| Styling | Tailwind CSS 4, Radix UI (46 primitives in `src/components/ui`), shadcn-style components | `src/components/ui` |
| Data fetching | TanStack Query 5; Supabase JS 2.117 direct from browser | `src/services/*` |
| Forms/validation | react-hook-form + Zod | features |
| Charts/PDF | Recharts, jsPDF + autotable | dashboard, records export |
| Android | Kotlin, Jetpack Compose, Material 3; compileSdk/targetSdk 35, minSdk 26; version 1.1.1 (code 8) | `app/build.gradle.kts` |
| Database/Auth/Storage | Supabase Postgres + Auth + Storage (project ref `ongsfahnfknqelyhuxrt`) | migrations, `.env` |
| Hosting | Vercel (`vercel.json` framework `tanstack-start`) → https://tijar-two.vercel.app | verified live |
| i18n | Custom context + message files (`src/lib/i18n/messages`: en, ha, yo, ig, ar, sw, ff) | lib/i18n |

## 3. Runtime architecture

```
Browser / Android WebView
        │  HTTPS
        ▼
TanStack Start (SSR, Nitro) on Vercel
        ├── Server routes (only two):
        │     GET /api/supabase-health   (auth + DB ping, env diagnostics)
        │     GET /api/public-config     (returns public Supabase env at runtime)
        └── Client bundle ──► Supabase JS ──► PostgREST / Auth / Storage
                                                (RLS is the authorization layer)
```

Key facts:

- **There is no application API layer.** All product data flows browser → Supabase directly; `src/services/*.ts` (21 files) are typed query wrappers, not HTTP services.
- **Authorization = Postgres RLS** keyed on `business_members` membership via `current_profile_id()` / `is_business_member()` helpers (migration 000001). Client checks (`RequireAuth`) are UX only.
- **Runtime env bootstrap:** because `VITE_*` values are baked at build time, `/api/public-config` + `src/lib/supabase/runtime-env.ts` let the client fetch public config at runtime; health diagnostics (`keysPresent`) were added for deploy debugging.
- **Android** (`TijarWebAppScreen`) loads `BuildConfig.WEB_APP_URL` (from `local.properties webAppUrl`, `gradle.properties tijarWebAppUrl`, or `VITE_PUBLIC_APP_URL` in `.env.local`) starting at `/login`. With no URL it renders native Compose screens backed by `MockData.kt` / `AuthDefaults.kt` — that path is a demo, not a second client of the backend.

## 4. Frontend structure (web)

- `src/routes/` — file routes: marketing (`index`, `about`, `how-it-works`, `learn`, `business-visibility`, `contact`, `privacy`, `terms`), web auth (`login`, `register`), product (`app/*`: index, record, sales, expenses, products, customers, suppliers, transactions, records, business, learn, profile, onboarding, login, register)
- `src/features/` — 16 feature folders (auth, app, app-layout, business, customers, dashboard, expenses, insights, learn, onboarding, products, profile, records, sales, suppliers, transactions)
- `src/services/` — Supabase query layer (business, transactions, products, customers, suppliers, health, learn progress, records import, analytics wrappers, OTP stub)
- `src/components/ui/` — 46 Radix-based primitives; brand components in `src/components/` (brand-logo, tijar-ui, site-shell)
- State: React Query for server data; `AuthProvider` context for session/profile; no global store library

## 5. Authentication and authorization (actual)

- Supabase Auth, email/password. Sign-up stores `full_name`, `phone`, `signup_category_id`, `signup_location` in user metadata; `handle_new_user()` trigger creates `profiles`.
- Password reset redirects to `/login`; email confirmation redirect to `/app/onboarding` using `VITE_PUBLIC_APP_URL` when absolute.
- OTP: only a dev stub (`src/services/otp/dev-otp-provider.ts`); no SMS provider wired.
- Authorization: RLS policies per table (member CRUD). `platform_roles` + `has_platform_role()` exist but no admin surface uses them. Staff `permissions` jsonb is stored, not enforced.

## 6. Testing, linting, deployment, monitoring

| Area | State |
|------|-------|
| Unit tests | Vitest 4: **10 files, 30 tests, all passing** (verified 2026-10-21, ~67s wall incl. transform). Focus: math (stock/profit/transaction/learn), schemas, CSV parse, health rules, routing smoke |
| RLS/integration tests | **None.** `docs/SECURITY.md` requires a cross-tenant test; it is not implemented |
| Lint/format | ESLint 9 + Prettier configured (`bun run lint`, `bun run format`) |
| CI | **None.** No `.github/workflows` anywhere |
| Deploy | Vercel Git deploy from GitHub `main`; `Dockerfile` + `bun run start` exist as alternative; `DEPLOY.md` documents both |
| Error monitoring | Local only: `src/lib/error-capture.ts` consumed by `src/server.ts`. **No Sentry/PostHog/analytics** |
| Health | `/api/supabase-health` — verified live and locally: `auth.ok`, `database.ok`, 20 categories |

## 7. Environment variables

| Variable | Used for | Notes |
|----------|----------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL | Set locally and on Vercel (verified) |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable key | Public-by-design; JWT form also accepted by runtime reader |
| `VITE_PUBLIC_APP_URL` | Absolute auth redirects, Android WebView origin | Set in local `.env.local`; **missing on Vercel** (`keysPresent:false`) |
| `VITE_APP_ENV` | Environment label | `development` locally; **missing on Vercel** (defaults development) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin (future) | Referenced in docs only; must never be `VITE_`-prefixed or shipped |
| `webAppUrl` / `tijarWebAppUrl` / `MOBILE_WEB_APP_URL` | Android build-time web origin | `app/build.gradle.kts`, `scripts/resolve-android-web-url.sh` |

## 8. Critical architecture risks

1. **No CI and no RLS tests** — a policy regression ships silently to production.
2. **Duplicated migrations** — `supabase/` and `tijar-business-visibility/supabase/` can drift; only a manual rsync script keeps them aligned.
3. **Nitro 3 beta + rolldown override pin** — build toolchain is pre-release; local `vite dev` cold start measured ~2 minutes.
4. **Direct-to-Supabase client** — fine now, but AI features must not move this pattern server-side with the service key in the client; grounded AI needs a server route (see `docs/INTEGRATION_PLAN.md`).
5. **Monorepo ≠ GitHub repo** — Android + docs are local-only; ~28 uncommitted modified paths in the working tree at audit time.
6. **Public storage buckets** — `product-images`, `business-logos`, `profile-avatars` are public-read by design; publishing must stay intentional (no KYC documents in these buckets, ever).
