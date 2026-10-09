# TIJAR Supabase (website + Android app)

The **website** and **Android app** use the **same database and auth**. The mobile app loads the web app in a WebView; login and all data go through this Supabase project.

## Project

| Setting | Value |
|--------|--------|
| URL | `https://ongsfahnfknqelyhuxrt.supabase.co` |
| Ref | `ongsfahnfknqelyhuxrt` |

Copy `tijar-business-visibility/.env.example` → `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable key only).

## Apply schema (run in order)

In [Supabase SQL Editor](https://supabase.com/dashboard), run each file under `supabase/migrations/` in filename order:

1. `20260307000000_phase0_foundation.sql`
2. `20260307000001_phase1_policies.sql`
3. `20260307000002_phase2_transactions.sql`
4. `20260307000003_phase3_health.sql`
5. `20260307000004_phase4_products.sql`
6. `20260307000005_product_sales_link.sql`
7. `20260307000006_business_logo.sql`
8. `20260307000007_profile_avatar.sql`
9. `20260307000008_delete_own_account.sql`
10. `20260307000009_learn_progress.sql`

Then seed: `supabase/seed/seed_business_categories.sql`

Or with CLI from repo root:

```bash
supabase link --project-ref ongsfahnfknqelyhuxrt
supabase db push
```

## Verify

```bash
bun run dev
```

Open [http://localhost:3000/api/supabase-health](http://localhost:3000/api/supabase-health) — expect `auth.ok` and `database.ok`.

## Android

Build the APK with the same web origin as production (or dev server). Set `webAppUrl` or `VITE_PUBLIC_APP_URL` — see `docs/MOBILE_WEB.md` in the monorepo. **Do not** embed the service role key in the APK.
