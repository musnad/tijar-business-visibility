# Deploy TIJAR online (same as local)

Local dev uses `bun run dev`. Production uses the **same code** after `bun run build`.

## 1. Environment variables (required at **build** time)

Set these on your host **before** `bun run build` (Vite embeds `VITE_*` into the bundle):

| Variable | Example |
|----------|---------|
| `VITE_SUPABASE_URL` | `https://ongsfahnfknqelyhuxrt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your publishable / anon key |
| `VITE_PUBLIC_APP_URL` | `https://your-domain.com` (no trailing slash) |
| `VITE_APP_ENV` | `production` |

Copy from `.env.example` → set in hosting UI (Vercel, Railway, Render, etc.).

**Never** set `SUPABASE_SERVICE_ROLE_KEY` in the browser bundle.

## 2. Supabase Auth URLs

In [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication → URL configuration**:

- **Site URL:** `https://your-domain.com`
- **Redirect URLs:** add  
  `https://your-domain.com/**`  
  `http://localhost:3000/**` (for local dev)

## 3. Database

Apply migrations — see [SUPABASE.md](./SUPABASE.md) (`supabase db push` or SQL Editor).

## 4. Build & run

```bash
bun install
bun run build
bun run start
```

Or Docker:

```bash
docker build -t tijar-web .
docker run -p 3000:3000 tijar-web
```

Preview production locally (uses `.env.local` if present):

```bash
bun run build
bun run preview:prod
```

## 5. Verify

Open:

- `https://your-domain.com/api/supabase-health` → `auth.ok` and `database.ok`
- `https://your-domain.com/login` → sign in → `/app` dashboard

## 6. Android app

Set `VITE_PUBLIC_APP_URL=https://your-domain.com` before building the APK, or `webAppUrl` in `local.properties`, then `./scripts/build-apk.sh`.

The app loads your **online** site — same Supabase data as the website.
