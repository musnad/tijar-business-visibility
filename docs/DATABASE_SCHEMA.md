# TIJAR — Database Schema (Phase 1 Audit)

> Source of truth: `supabase/migrations/` (10 migrations, `20260307000000`–`20260307000009`) + `supabase/seed/seed_business_categories.sql`.
> A duplicate copy lives in `tijar-business-visibility/supabase/` for the web repo; keep them in sync (`scripts/sync-supabase-to-web.sh`).
> Supersedes the phase-by-phase notes in `docs/DATABASE.md` where they conflict.

## 1. Platform

- PostgreSQL via Supabase; all tenant tables have **Row Level Security enabled**
- Live verification (2026-10-21): Auth reachable, `business_categories` readable (20 seeded rows), locally and at https://tijar-two.vercel.app/api/supabase-health
- Money: `numeric(18,2)`; currency column on transactions; default NGN

## 2. Enums

| Enum | Values |
|------|--------|
| `onboarding_status` | not_started, in_progress, completed |
| `verification_status` | not_started, in_progress, submitted, under_review, verified, rejected, requires_update |
| `platform_role` | admin, content_manager, shariah_reviewer |
| `business_member_role` | owner, staff |
| `business_stage` | idea, starting, operating, growing, established |
| `transaction_type` | sale, expense, purchase, customer_payment, supplier_payment |
| `health_band` | strong, stable, watch, risk |
| `stock_movement_reason` | initial, purchase, sale, adjustment, return |
| `product_kind` | goods, service |

## 3. Tables (18)

### Identity & tenancy (000000–000001)
| Table | Purpose / key fields |
|-------|----------------------|
| `profiles` | `id`, `auth_id` unique, full_name, phone, email, preferred_language, onboarding_status, avatar_url, bio (000007) |
| `platform_roles` | profile_id + role, unique pair |
| `business_categories` | hierarchical (parent_id), slug unique, active; seeded 20 rows |
| `businesses` | owner_id → profiles, business_name, category/subcategory, description, **location (free text)**, years_in_business, employee_count, business_stage, operating_mode, islamic_mode_enabled, verification_status, logo_url (000006) |
| `business_members` | business_id + profile_id, role, permissions jsonb (stored, not enforced) |
| `business_dna` | one row per business: business_model, revenue_models[], customer_types[], payment_methods[], credit flags, inventory_required, has_staff, record_keeping_methods[], discovery_channels[], goals[], traits jsonb, dna_version |
| `onboarding_sessions` | progressive answers per step until completed_at |

### Events & audit (000000–000001)
| Table | Notes |
|-------|-------|
| `business_events` | business_id, event_type, payload jsonb. **Written by app** (`business-service`, `transaction-service`) |
| `audit_events` | actor_id, business_id, action, entity_type/id, metadata. Select policy exists; **app never inserts** — no effective audit trail yet |

### Money (000002)
| Table | Notes |
|-------|-------|
| `customers` | business_id, name, phone, notes, `balance_owed` maintained by trigger |
| `suppliers` | mirror of customers (amount business owes) |
| `transactions` | type, amount, currency, payment_method, customer_id/supplier_id, occurred_at, created_by; product link added 000005: product_id, quantity, line_cost, line_profit |

Triggers `transactions_before_insert` / `transactions_apply_balances` adjust customer/supplier balances on credit sales, purchases and payments.

### Health & recommendations (000003)
`business_health_snapshots` (rolling metrics, health_score, health_band) and `business_recommendations` (code, title, body, priority, action_path, dismissed_at). Rules-based in `src/features/insights/compute-business-health.ts`; snapshot tables exist alongside client-side computation.

### Stock (000004–000005)
`products` (name, unit, sale/cost price, stock_quantity, low_stock_threshold, is_active, kind, image_url) and `stock_movements` (quantity_delta, reason, transaction_id). Triggers block negative stock and apply deltas.

### Learn (000009)
`user_learn_state` (total_xp, streak_count, hearts_remaining, activity dates) and `user_lesson_completions`. Lesson content lives in the TypeScript catalogue (`src/features/learn/catalog.ts`), not in DB tables.

## 4. Functions & RPC

| Function | Role |
|----------|------|
| `handle_new_user()` | Trigger: create `profiles` row from auth user metadata |
| `current_profile_id()`, `is_business_member(uuid)`, `has_platform_role(role)` | RLS helpers |
| `set_updated_at()` | Timestamp trigger |
| `delete_own_account()` (000008) | RPC: user deletes owned businesses, profile, auth row |

## 5. Storage buckets (public read, member-scoped write)

| Bucket | Migration | Path convention |
|--------|-----------|-----------------|
| `product-images` | 000005 | `{business_id}/…` |
| `business-logos` | 000006 | `{business_id}/…` |
| `profile-avatars` | 000007 | `{profile_id}/avatar.*` |

Public read is intentional for logos/product photos. **Do not** store KYC or private documents in these buckets.

## 6. RLS pattern

1. `business_members` defines tenancy; policies require the caller's profile to be a member of the row's `business_id`
2. `profiles`: select/update own only; `business_categories`: public select of active rows
3. Learn tables: own-row policies on `profile_id`
4. Platform roles: self-select only today — no admin read policies or UI yet

Missing test coverage: no automated cross-tenant (User A vs User B) tests exist, although `docs/SECURITY.md` requires them.

## 7. What the vision needs that the schema lacks

| Vision | Missing schema |
|--------|---------------|
| Public storefront | `public_slug`, `is_public`/published flag, public contact channels on `businesses` |
| Map / discovery | `latitude`, `longitude` (or PostGIS point), city/area fields, search indexes |
| Marketplace / orders | `orders`, `order_items`, buyer identity, order status, fulfilment/payment state |
| KYC / verification | `kyc_submissions`, document metadata (private bucket), reviewer + decision fields |
| Notifications / TIJAR Sense | `notification_outbox`, device/contact endpoints, opt-in preferences, Sense requests + matches |
| AI | conversation/message tables only if history is required; provider usage/audit log |
| Admin moderation | moderation queue views/policies, `audit_events` insert path (service role or security-definer RPC) |
| Learning CMS | paths/modules/lessons tables (content is hard-coded in TS today) |

Any new table must ship with RLS in the same migration — that is the established pattern and must not regress.
