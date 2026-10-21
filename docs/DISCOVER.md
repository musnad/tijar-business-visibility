# TIJAR Discover & Local Marketplace (Phase 3)

Discovery, storefronts and contact/enquiry actions. No payments, delivery or escrow in this phase.

## What was built

| Piece | Location |
|-------|----------|
| DB migration | `supabase/migrations/20260307000010_discover_marketplace.sql` (apply in Supabase SQL Editor, in order after 000009) |
| Pure logic + tests | `src/utils/discover.ts`, `src/utils/discover.test.ts` (visibility, slug, haversine, search/filter, completeness, duplicates) |
| Maps adapter | `src/lib/maps/provider.ts` — OpenStreetMap/Leaflet default, Nominatim geocoding |
| Data layer | `src/services/discover-service.ts` (public listings view, `nearby_businesses` RPC, storefront, enquiries, owner publish, admin moderation) |
| Customer pages | `/discover` (list + Leaflet map, search, category/distance/verified filters, manual area presets), `/b/[slug]` storefront |
| Owner page | `/app/business/publish` (publish toggle, slug, public contacts, opening hours, location capture + approval, completeness, enquiry inbox) |
| Admin page | `/app/admin/moderation` (approve/flag/suspend, duplicate + incomplete flags; platform `admin` role only, RLS-enforced) |

## Provider configuration

**Default (no key required):** OpenStreetMap tiles + Leaflet + Nominatim geocoding, restricted to Nigeria (`countrycodes=ng`) in the adapter. Tiles are browser-cached images; the Leaflet bundle loads lazily only when Map view opens — list view works on slow networks without it.

**Switching provider:** implement `MapsProvider` in `src/lib/maps/provider.ts`. A future Google provider needs `VITE_GOOGLE_MAPS_API_KEY` as a **browser key restricted by HTTP referrer** in Google Cloud; any server geocoding key must be non-`VITE_` and used only from a server route. No keys are committed.

## Privacy & visibility rules (enforced in SQL, mirrored in tests)

A listing is public **only** when: `is_published = true` AND `moderation_status = 'approved'` AND `location_approved = true` AND coordinates exist AND a slug exists. Public views expose explicit public columns only (never owner_id, debts, stock cost, or financial data). Coordinates are **owner-entered or owner-picked from geocoding candidates and explicitly approved** — the system never invents or infers them, and owners are told to use the shop location, not a home address. Enquiries can be inserted by anyone **only** for published+approved businesses; only business members can read them.

"Verified" (`verification_status = 'verified'`, set by TIJAR's verification process) is shown separately from owner-provided details (description, prices, hours), which are labelled as owner-provided on the storefront.

## PostGIS

Migration enables `postgis`, adds a GiST geography index, and a `nearby_businesses(lat, lng, radius_km, category_id, query, limit)` RPC returning `distance_km`. The Discover page filters client-side from the public view for instant search (bounded to 200 listings); the RPC is available for server-scale nearby queries.

## Go-live steps (manual, in order)

1. Supabase SQL Editor: run `supabase/migrations/20260307000010_discover_marketplace.sql`.
2. Make yourself admin (once): `insert into public.platform_roles (profile_id, role) values ('<your profile id>', 'admin');`
3. As an owner: `/app/business` → **Shop visibility** → set slug, contacts, location (search or current location), tick public-location approval, publish.
4. As admin: `/app/admin/moderation` → Approve the listing.
5. Visit `/discover` and `/b/<slug>` anonymously to confirm visibility, call/WhatsApp/directions and the enquiry form.

## Tests

`bun run test` — 39 tests (11 files), including search, geographic filtering, privacy/visibility and duplicate detection in `discover.test.ts`. Production build passes. Known pre-existing issue: repo-wide `tsc --noEmit` has unrelated legacy errors (not in Phase 3 files).
